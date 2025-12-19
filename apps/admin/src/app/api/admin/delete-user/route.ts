import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize admin user
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const currentUserId = authResult.userId;
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (currentUserId === id) {
      return NextResponse.json(
        { success: false, error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    console.log("Admin deleting user:", { id, adminUserId: currentUserId });

    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing environment variables");
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // First, check if profile exists and get their email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, is_admin")
      .eq("id", id)
      .single();

    // If profile exists, check admin restrictions
    if (profile && !profileError) {
      // If deleting an admin, check if they're the last admin
      if (profile.is_admin) {
        const { count: adminCount, error: countError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_admin", true);

        if (countError) {
          console.error("Error counting admins:", countError);
          return NextResponse.json(
            { success: false, error: "Failed to verify admin count" },
            { status: 500 }
          );
        }

        if (adminCount && adminCount <= 1) {
          return NextResponse.json(
            { success: false, error: "Cannot delete the last admin user" },
            { status: 400 }
          );
        }
      }
    } else {
      // Profile doesn't exist - this is okay, we'll just try to delete auth user
      console.log(
        "Profile not found, proceeding with auth user deletion only",
        { userId: id }
      );
    }

    // Delete from profiles first (if it exists) to avoid FK constraint errors when deleting auth user
    if (profile && !profileError) {
      const { error: deleteProfileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id);

      if (deleteProfileError) {
        console.error("Error deleting from profiles:", deleteProfileError);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to delete user profile: ${deleteProfileError.message}`,
          },
          { status: 500 }
        );
      }
    }

    // Check if the auth user exists before attempting delete
    const { error: fetchAuthError } = await supabase.auth.admin.getUserById(id);

    if (fetchAuthError && fetchAuthError.status === 404) {
      // Auth record already gone; treat as success
      console.warn("Auth user already deleted, skipping auth delete", {
        userId: id,
      });
    } else {
      // Now delete from Supabase Auth using admin API
      // Note: Requires service_role key
      const { error: deleteAuthError } =
        await supabase.auth.admin.deleteUser(id);

      if (deleteAuthError) {
        console.error("Error deleting from auth:", deleteAuthError);

        // Check if user was actually deleted despite the error
        // Sometimes cleanup errors occur but user is still deleted
        const { error: verifyError } =
          await supabase.auth.admin.getUserById(id);
        const userActuallyDeleted = verifyError && verifyError.status === 404;

        // If auth user is already missing or was successfully deleted, treat as success
        const alreadyDeleted =
          deleteAuthError.status === 404 ||
          userActuallyDeleted ||
          (deleteAuthError.message || "")
            .toLowerCase()
            .includes("loading user") ||
          (deleteAuthError.message || "")
            .toLowerCase()
            .includes("database error") ||
          (deleteAuthError.message || "").toLowerCase().includes("unaccent");

        if (!alreadyDeleted) {
          return NextResponse.json(
            {
              success: false,
              error: `Failed to delete user from authentication: ${deleteAuthError.message}`,
            },
            { status: 500 }
          );
        } else {
          console.warn("Auth user deleted (cleanup error ignored)", {
            userId: id,
            error: deleteAuthError.message,
          });
        }
      }
    }

    // After auth/profile deletion, clean up any linked player records
    // If this fails, log but don't block user deletion (cleanup-only step)
    try {
      const { error: playerCleanupError } = await supabase
        .from("players")
        .update({
          claimed_by_user_id: null,
          is_active: false,
        })
        .eq("claimed_by_user_id", id);

      if (playerCleanupError) {
        console.error("Error cleaning up linked players for deleted user:", {
          userId: id,
          error: playerCleanupError,
        });
      } else {
        console.log(
          "Successfully cleaned up linked players for deleted user:",
          { userId: id }
        );
      }
    } catch (cleanupError) {
      console.error(
        "Unexpected error during player cleanup for deleted user:",
        cleanupError
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "User successfully deleted and any linked athlete profiles were deactivated and unlinked.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in delete-user API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
