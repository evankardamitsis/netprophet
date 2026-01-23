import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");
const MAILERLITE_GROUP_ID = Deno.env.get("MAILERLITE_GROUP_ID") || "users";
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * MailerLite Queue Processor Edge Function
 *
 * This function processes pending MailerLite subscriptions from the queue.
 * It can be called via:
 * 1. Cron job (every 5 minutes)
 * 2. Database webhook (on mailerlite_logs INSERT)
 *
 * Purpose:
 * - Process pending MailerLite subscriptions
 * - Retry failed subscriptions
 * - Keep transactional emails (Resend) completely separate
 */

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verify cron secret for security
  // Note: If using Supabase Edge Function webhook type, authentication is handled automatically
  // CRON_SECRET is only needed for HTTP Request webhook type or manual cron triggers
  const authHeader = req.headers.get("Authorization");
  if (CRON_SECRET) {
    // If CRON_SECRET is set, require it
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    // If no CRON_SECRET is set, allow but log info (this is fine for Supabase Edge Function webhooks)
    console.log(
      "CRON_SECRET not set - allowing request (OK if using Supabase Edge Function webhook type)"
    );
  }

  try {
    if (!MAILERLITE_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "MAILERLITE_API_KEY not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending MailerLite subscriptions (limit to 50 per run)
    const { data: pendingSubscriptions, error: fetchError } = await supabase
      .from("mailerlite_logs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      throw new Error(
        `Failed to fetch pending subscriptions: ${fetchError.message}`
      );
    }

    if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending subscriptions to process",
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let successCount = 0;
    let failureCount = 0;

    // Process each pending subscription
    for (const subscription of pendingSubscriptions) {
      try {
        // Prepare subscriber data for MailerLite
        const subscriberData: any = {
          email: subscription.email,
          status: "active",
        };

        // Add name if provided
        if (subscription.name) {
          const nameParts = subscription.name.split(" ");
          subscriberData.fields = {
            name: subscription.name,
            first_name: nameParts[0] || "",
            last_name: nameParts.slice(1).join(" ") || "",
          };
        }

        // Add groups to subscriber data if specified (preferred method)
        // MailerLite API requires group IDs as numbers, not strings
        const groupsToAdd: number[] = [];
        if (MAILERLITE_GROUP_ID) {
          // Convert to number if it's a string
          const groupIdNum = typeof MAILERLITE_GROUP_ID === 'string' 
            ? parseInt(MAILERLITE_GROUP_ID, 10) 
            : MAILERLITE_GROUP_ID;
          if (!isNaN(groupIdNum)) {
            groupsToAdd.push(groupIdNum);
          }
        }
        if (subscription.groups && Array.isArray(subscription.groups) && subscription.groups.length > 0) {
          // Convert all group IDs to numbers
          for (const groupId of subscription.groups) {
            const groupIdNum = typeof groupId === 'string' 
              ? parseInt(groupId, 10) 
              : groupId;
            if (!isNaN(groupIdNum)) {
              groupsToAdd.push(groupIdNum);
            }
          }
        }
        if (groupsToAdd.length > 0) {
          subscriberData.groups = groupsToAdd;
        }

        // Add subscriber to MailerLite
        const mailerLiteUrl = `https://connect.mailerlite.com/api/subscribers`;
        const response = await fetch(mailerLiteUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${MAILERLITE_API_KEY}`,
            Accept: "application/json",
          },
          body: JSON.stringify(subscriberData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `MailerLite API error: ${response.status} - ${errorText}`
          );
        }

        const mailerLiteData = await response.json();

        // Note: Groups are now included in the initial subscriber creation above
        // This is the preferred method and avoids the 404 error
        // If groups weren't included (e.g., for existing subscribers), we could add them here
        // but since we're creating new subscribers, groups are already handled

        // Update log with success
        await supabase
          .from("mailerlite_logs")
          .update({
            status: "success",
            mailerlite_id: mailerLiteData.data.id,
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        successCount++;
      } catch (error) {
        console.error(
          `Error processing subscription ${subscription.id}:`,
          error
        );

        // Update log with failure
        await supabase
          .from("mailerlite_logs")
          .update({
            status: "failed",
            error_message: error.message,
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        failureCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Processed MailerLite queue",
        processed: successCount + failureCount,
        successful: successCount,
        failed: failureCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in mailerlite-process-queue:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process MailerLite queue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
