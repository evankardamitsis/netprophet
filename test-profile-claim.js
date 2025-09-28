// Test script to verify profile claim flow and admin notifications
// Run this in the browser console on the web app

async function testProfileClaimFlow() {
  console.log("🧪 Testing Profile Claim Flow...");

  try {
    // Test 1: Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("❌ User not authenticated:", authError);
      return;
    }
    console.log("✅ User authenticated:", user.email);

    // Test 2: Check current profile status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("profile_claim_status, first_name, last_name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("❌ Error fetching profile:", profileError);
      return;
    }

    console.log("📋 Current profile status:", profile);

    // Test 3: Simulate profile creation request
    if (profile.profile_claim_status === "pending") {
      console.log("🔄 Testing profile creation request...");

      const { data, error } = await supabase.rpc(
        "handle_profile_creation_request",
        {
          user_id: user.id,
          user_first_name: "Test",
          user_last_name: "User",
        }
      );

      if (error) {
        console.error("❌ Profile creation request failed:", error);
        return;
      }

      console.log("✅ Profile creation request result:", data);

      // Test 4: Check if admin notification was created
      setTimeout(async () => {
        const { data: notifications, error: notifError } = await supabase
          .from("admin_notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (notifError) {
          console.error("❌ Error fetching notifications:", notifError);
          return;
        }

        console.log("📧 Admin notifications:", notifications);

        if (notifications && notifications.length > 0) {
          console.log("✅ Admin notification created successfully!");
          console.log("📋 Latest notification:", notifications[0]);
        } else {
          console.log("⚠️ No admin notifications found");
        }
      }, 2000);
    } else {
      console.log(
        "ℹ️ Profile already processed:",
        profile.profile_claim_status
      );
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testProfileClaimFlow();
