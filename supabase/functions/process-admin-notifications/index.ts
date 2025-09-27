import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get pending notifications
    const { data: pendingNotifications, error: fetchError } =
      await supabaseClient.rpc("get_pending_admin_notifications");

    if (fetchError) {
      console.error("Error fetching pending notifications:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: "No pending notifications",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(
      `Processing ${pendingNotifications.length} pending notifications`
    );

    let processedCount = 0;
    let errorCount = 0;

    // Process each notification
    for (const notification of pendingNotifications) {
      try {
        // Call the admin notifications API to send the email
        const adminApiUrl = `${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "vercel.app")}/api/admin/notifications`;

        const response = await fetch(adminApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            type: notification.type,
            userData: { id: notification.user_id },
            profileData: null,
          }),
        });

        if (response.ok) {
          // Mark as processed successfully
          await supabaseClient.rpc("mark_admin_notification_processed", {
            notification_id: notification.id,
            success: true,
          });
          processedCount++;
        } else {
          const errorText = await response.text();
          console.error(
            `Failed to process notification ${notification.id}:`,
            errorText
          );

          // Mark as failed
          await supabaseClient.rpc("mark_admin_notification_processed", {
            notification_id: notification.id,
            success: false,
            error_message: errorText,
          });
          errorCount++;
        }
      } catch (error) {
        console.error(
          `Error processing notification ${notification.id}:`,
          error
        );

        // Mark as failed
        await supabaseClient.rpc("mark_admin_notification_processed", {
          notification_id: notification.id,
          success: false,
          error_message: error.message,
        });
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        total: pendingNotifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-admin-notifications function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
