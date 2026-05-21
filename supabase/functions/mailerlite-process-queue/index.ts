import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  addToGroup,
  addToGroupByKey,
  bulkAddToGroup,
  bulkRemoveFromGroup,
  parseFieldsJson,
  removeFromGroup,
  removeFromGroupByKey,
  resolveGroupId,
  updateSubscriberFields,
  upsertSubscriber,
} from "../_shared/mailerlite.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const DEFAULT_GROUP = Deno.env.get("MAILERLITE_GROUP_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type QueueRow = {
  id: string;
  email: string | null;
  name: string | null;
  action: string;
  fields: Record<string, unknown> | null;
  groups: string[] | null;
  group_keys: string[] | null;
  group_id: string | null;
  bulk_emails: string[] | null;
  execute_after: string | null;
  remove_after: string | null;
};

async function processJob(row: QueueRow): Promise<void> {
  const action = row.action || "upsert";
  const fields = parseFieldsJson(row.fields);

  switch (action) {
    case "upsert": {
      const groupIds = [...(row.groups ?? [])];
      if (DEFAULT_GROUP) groupIds.push(DEFAULT_GROUP);
      await upsertSubscriber({
        email: row.email!,
        name: row.name ?? undefined,
        fields,
        groupIds,
        groupKeys: row.group_keys ?? undefined,
      });
      break;
    }
    case "update_fields":
      await updateSubscriberFields(row.email!, fields);
      break;
    case "add_group": {
      if (row.group_id) {
        await addToGroup(row.email!, row.group_id);
      }
      for (const key of row.group_keys ?? []) {
        await addToGroupByKey(row.email!, key);
      }
      break;
    }
    case "remove_group": {
      if (row.group_id) {
        await removeFromGroup(row.email!, row.group_id);
      }
      for (const key of row.group_keys ?? []) {
        await removeFromGroupByKey(row.email!, key);
      }
      break;
    }
    case "bulk_add_group": {
      const gid =
        row.group_id ??
        (row.group_keys?.[0] ? resolveGroupId(row.group_keys[0]) : undefined);
      if (gid && row.bulk_emails?.length) {
        await bulkAddToGroup(row.bulk_emails, gid);
      }
      break;
    }
    case "bulk_remove_group": {
      const gid =
        row.group_id ??
        (row.group_keys?.[0] ? resolveGroupId(row.group_keys[0]) : undefined);
      if (gid && row.bulk_emails?.length) {
        await bulkRemoveFromGroup(row.bulk_emails, gid);
      }
      break;
    }
    default:
      throw new Error(`Unknown mailerlite action: ${action}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    // Process delayed removals first
    const { data: dueRemovals } = await supabase
      .from("mailerlite_logs")
      .select("*")
      .eq("status", "pending")
      .eq("action", "bulk_remove_group")
      .lte("execute_after", now)
      .limit(20);

    for (const row of dueRemovals ?? []) {
      try {
        await processJob(row as QueueRow);
        await supabase
          .from("mailerlite_logs")
          .update({
            status: "success",
            processed_at: now,
            updated_at: now,
          })
          .eq("id", row.id);
      } catch (e) {
        await supabase
          .from("mailerlite_logs")
          .update({
            status: "failed",
            error_message: (e as Error).message,
            processed_at: now,
            updated_at: now,
          })
          .eq("id", row.id);
      }
    }

    const { data: pending, error: fetchError } = await supabase
      .from("mailerlite_logs")
      .select("*")
      .eq("status", "pending")
      .or(`execute_after.is.null,execute_after.lte.${now}`)
      .neq("action", "bulk_remove_group")
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchError) throw fetchError;

    if (!pending?.length) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "Queue empty" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let ok = 0;
    let fail = 0;

    for (const row of pending) {
      try {
        await processJob(row as QueueRow);

        // Schedule follow-up removal if remove_after set
        if (row.remove_after && row.bulk_emails?.length) {
          const removeGroupKey = row.group_keys?.[0] ?? null;
          await supabase.from("mailerlite_logs").insert({
            email: null,
            status: "pending",
            action: "bulk_remove_group",
            bulk_emails: row.bulk_emails,
            group_keys: removeGroupKey ? [removeGroupKey] : null,
            group_id: row.group_id,
            execute_after: row.remove_after,
          });
        }

        await supabase
          .from("mailerlite_logs")
          .update({
            status: "success",
            processed_at: now,
            updated_at: now,
          })
          .eq("id", row.id);
        ok++;
      } catch (e) {
        console.error(`Job ${row.id} failed:`, e);
        await supabase
          .from("mailerlite_logs")
          .update({
            status: "failed",
            error_message: (e as Error).message,
            processed_at: now,
            updated_at: now,
          })
          .eq("id", row.id);
        fail++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: ok + fail,
        successful: ok,
        failed: fail,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("mailerlite-process-queue:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
