import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AdminNotificationData {
  type: "user_registration" | "profile_claim";
  userData: {
    id: string;
    email: string;
    name?: string;
    created_at: string;
  };
  profileData?: {
    first_name?: string;
    last_name?: string;
    ntrp_rating?: number;
    age?: number;
    phone?: string;
  };
}

export async function sendAdminNotification(data: AdminNotificationData) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_ADMIN_URL}/api/admin/notifications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send admin notification: ${errorData.error}`);
    }

    const result = await response.json();
    console.log(`Admin notification sent successfully:`, result);
    return result;
  } catch (error) {
    console.error("Error sending admin notification:", error);
    throw error;
  }
}

export async function sendUserRegistrationNotification(userId: string) {
  try {
    // Fetch user data
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id, email, name, created_at")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      throw new Error(`Failed to fetch user data: ${userError?.message}`);
    }

    return await sendAdminNotification({
      type: "user_registration",
      userData: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("Error sending user registration notification:", error);
    throw error;
  }
}

export async function sendProfileClaimNotification(userId: string) {
  try {
    // Fetch user data
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id, email, name, created_at")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      throw new Error(`Failed to fetch user data: ${userError?.message}`);
    }

    // Fetch player profile data
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("first_name, last_name, ntrp_rating, age, phone")
      .eq("user_id", userId)
      .single();

    if (playerError && playerError.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is acceptable
      console.warn(`Failed to fetch player data: ${playerError.message}`);
    }

    return await sendAdminNotification({
      type: "profile_claim",
      userData: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
      },
      profileData: player || undefined,
    });
  } catch (error) {
    console.error("Error sending profile claim notification:", error);
    throw error;
  }
}
