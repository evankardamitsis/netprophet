import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

// POST - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize admin user
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const adminUserId = authResult.userId;

    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Use the database function to mark all as read, passing the admin user ID
    const { data, error } = await supabase.rpc("mark_all_notifications_read", {
      p_user_id: adminUserId,
    });

    if (error) {
      console.error("Error marking all notifications as read:", error);
      return NextResponse.json(
        { error: "Failed to mark all notifications as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data || 0,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
