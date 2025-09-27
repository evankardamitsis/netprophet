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

    const { type, userId } = await req.json();

    if (!type || !userId) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: type and userId",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result;

    switch (type) {
      case "user_registration":
        result = await sendUserRegistrationNotification(supabaseClient, userId);
        break;

      case "profile_claim":
        result = await sendProfileClaimNotification(supabaseClient, userId);
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid notification type" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in admin-notifications function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendUserRegistrationNotification(
  supabaseClient: any,
  userId: string
) {
  try {
    // Fetch user data
    const { data: user, error: userError } = await supabaseClient
      .from("profiles")
      .select("id, email, name, created_at")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      throw new Error(`Failed to fetch user data: ${userError?.message}`);
    }

    // Send notification to admin API
    const adminUrl = Deno.env.get("ADMIN_API_URL") || "http://localhost:3001";
    const response = await fetch(`${adminUrl}/api/admin/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "user_registration",
        userData: {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.created_at,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send admin notification: ${errorData.error}`);
    }

    const result = await response.json();
    console.log("User registration notification sent:", result);
    return result;
  } catch (error) {
    console.error("Error sending user registration notification:", error);
    throw error;
  }
}

async function sendProfileClaimNotification(
  supabaseClient: any,
  userId: string
) {
  try {
    // Fetch user data
    const { data: user, error: userError } = await supabaseClient
      .from("profiles")
      .select("id, email, name, created_at")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      throw new Error(`Failed to fetch user data: ${userError?.message}`);
    }

    // Fetch player profile data
    const { data: player, error: playerError } = await supabaseClient
      .from("players")
      .select("first_name, last_name, ntrp_rating, age, phone")
      .eq("user_id", userId)
      .single();

    if (playerError && playerError.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is acceptable
      console.warn(`Failed to fetch player data: ${playerError.message}`);
    }

    // Send notification to admin API
    const adminUrl = Deno.env.get("ADMIN_API_URL") || "http://localhost:3001";
    const response = await fetch(`${adminUrl}/api/admin/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "profile_claim",
        userData: {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.created_at,
        },
        profileData: player || undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send admin notification: ${errorData.error}`);
    }

    const result = await response.json();
    console.log("Profile claim notification sent:", result);
    return result;
  } catch (error) {
    console.error("Error sending profile claim notification:", error);
    throw error;
  }
}
