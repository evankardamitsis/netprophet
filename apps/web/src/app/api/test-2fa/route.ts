import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { action, userId, email } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: "Missing Supabase configuration" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "enable-2fa") {
      // Enable 2FA for a user by email
      const { data: users, error: usersError } =
        await supabase.auth.admin.listUsers();

      if (usersError) {
        return NextResponse.json(
          { success: false, error: usersError.message },
          { status: 500 }
        );
      }

      const user = users.users.find((u) => u.email === email);
      if (!user) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      // Enable 2FA in profiles table
      const { error: enableError } = await supabase
        .from("profiles")
        .update({ two_factor_enabled: true })
        .eq("id", user.id);

      if (enableError) {
        return NextResponse.json(
          { success: false, error: enableError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `2FA enabled for user ${email}`,
        userId: user.id,
      });
    } else if (action === "check-users") {
      // List all users
      const { data: users, error: usersError } =
        await supabase.auth.admin.listUsers();

      if (usersError) {
        return NextResponse.json(
          { success: false, error: usersError.message },
          { status: 500 }
        );
      }

      const userList = users.users.map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      }));

      return NextResponse.json({
        success: true,
        users: userList,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Test 2FA API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
