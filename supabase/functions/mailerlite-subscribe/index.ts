import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");
const MAILERLITE_GROUP_ID = Deno.env.get("MAILERLITE_GROUP_ID") || "users"; // Default group ID

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * MailerLite Subscribe Edge Function
 *
 * This function adds subscribers to MailerLite for automated marketing workflows.
 * It is completely separate from transactional emails (which use Resend).
 *
 * Purpose:
 * - Add new users to MailerLite for automated welcome sequences
 * - Trigger onboarding workflows
 * - Enable marketing campaigns
 *
 * Note: This does NOT replace transactional emails (2FA, winnings, admin alerts).
 */

interface SubscribeRequest {
  email: string;
  name?: string;
  groups?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!MAILERLITE_API_KEY) {
      console.warn(
        "MAILERLITE_API_KEY not configured - skipping MailerLite subscription"
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "MailerLite API key not configured",
          note: "This is non-critical - user registration continues",
        }),
        {
          status: 200, // Return 200 to not block user registration
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const subscribeData: SubscribeRequest = await req.json();
    const { email, name, groups = [] } = subscribeData;

    if (!email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare subscriber data for MailerLite
    const subscriberData: any = {
      email,
      status: "active",
    };

    // Add name if provided
    if (name) {
      const nameParts = name.split(" ");
      subscriberData.fields = {
        name: name,
        first_name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" ") || "",
      };
    }

    // Add to default group if no groups specified
    // MailerLite API requires group IDs as numbers, not strings
    const groupsToAdd: number[] = [];
    
    if (groups.length > 0) {
      // Convert all group IDs to numbers
      for (const groupId of groups) {
        const groupIdNum = typeof groupId === 'string' 
          ? parseInt(groupId, 10) 
          : groupId;
        if (!isNaN(groupIdNum)) {
          groupsToAdd.push(groupIdNum);
        }
      }
    } else if (MAILERLITE_GROUP_ID) {
      // Convert to number if it's a string
      const groupIdNum = typeof MAILERLITE_GROUP_ID === 'string' 
        ? parseInt(MAILERLITE_GROUP_ID, 10) 
        : MAILERLITE_GROUP_ID;
      if (!isNaN(groupIdNum)) {
        groupsToAdd.push(groupIdNum);
      }
    }

    // Include groups in subscriber data (preferred method - avoids separate API call)
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
      console.error(`MailerLite API error: ${response.status} - ${errorText}`);

      // Don't throw - MailerLite failures shouldn't block user registration
      return new Response(
        JSON.stringify({
          success: false,
          error: `MailerLite API error: ${response.status}`,
          note: "User registration continues - this is non-critical",
        }),
        {
          status: 200, // Return 200 to not block user registration
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const mailerLiteData = await response.json();

    // Note: Groups are now included in the initial subscriber creation above
    // This is the preferred method and avoids the 404 error
    // The subscriber is automatically added to the specified groups during creation

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscriber added to MailerLite",
        data: mailerLiteData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in mailerlite-subscribe:", error);

    // Don't throw - MailerLite failures shouldn't block user registration
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to subscribe to MailerLite",
        note: "User registration continues - this is non-critical",
      }),
      {
        status: 200, // Return 200 to not block user registration
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
