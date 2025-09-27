import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    console.log("Creating test admin notifications...");

    // Check if there are recent test notifications to avoid duplicates
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentEmails, error: checkError } = await supabase
      .from("email_logs")
      .select("id")
      .eq("template", "admin_alert")
      .eq("type", "admin")
      .gte("sent_at", fiveMinutesAgo)
      .limit(1);

    if (recentEmails && recentEmails.length > 0) {
      console.log(
        "Recent test notifications found, skipping to avoid duplicates"
      );
      return NextResponse.json({
        success: true,
        message:
          "Recent test notifications already exist. Please wait a few minutes before creating new ones, or clear test emails first.",
        skipped: true,
      });
    }

    // Get a real user for testing
    const { data: realUser, error: userError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("is_admin", false)
      .limit(1)
      .single();

    if (userError || !realUser) {
      console.log("No real user found, using placeholder data");
    }

    const testUserEmail = realUser?.email || "test.user@example.com";
    const testUserName = realUser
      ? `${realUser.first_name} ${realUser.last_name}`
      : "Test User";

    // Test 1: New User Registration
    console.log("Creating test notification: New User Registration");
    const { data: emailResult1, error: emailError1 } = await supabase.rpc(
      "send_admin_alert_email",
      {
        alert_type: "New User Registration",
        message: `A new user ${testUserEmail} has registered on the NetProphet platform and requires admin attention.`,
        details: null,
      }
    );

    if (emailError1) {
      console.error("Error creating first test notification:", emailError1);
      return NextResponse.json(
        {
          error: "Failed to create test notification",
          details: emailError1.message,
          code: emailError1.code,
          hint: emailError1.hint,
        },
        { status: 500 }
      );
    }

    // Test 2: User Claimed Profile
    console.log("Creating test notification: User Claimed Profile");
    const { data: emailResult2, error: emailError2 } = await supabase.rpc(
      "send_admin_alert_email",
      {
        alert_type: "User Claimed Profile",
        message: `A user ${testUserEmail} has successfully claimed their player profile ${testUserName} and is now active on the platform.`,
        details: null,
      }
    );

    if (emailError2) {
      console.error("Error creating second test notification:", emailError2);
      return NextResponse.json(
        {
          error: "Failed to create second test notification",
          details: emailError2.message,
          code: emailError2.code,
          hint: emailError2.hint,
        },
        { status: 500 }
      );
    }

    console.log("Test notifications created successfully!");

    // Verify how many emails were actually created
    const { data: createdEmails, error: verifyError } = await supabase
      .from("email_logs")
      .select("id, to_email, variables")
      .eq("template", "admin_alert")
      .eq("type", "admin")
      .eq("status", "pending")
      .gte("sent_at", fiveMinutesAgo);

    const emailCount = createdEmails?.length || 0;
    console.log(`Created ${emailCount} emails total`);

    return NextResponse.json({
      success: true,
      message: `Test notifications created successfully! 2 test alerts (New User Registration & User Claimed Profile) have been queued for all admin users. Created ${emailCount} emails total. Use 'Process Email Queue' to send them.`,
      notifications_created: 2,
      emails_created: emailCount,
      alert_types: ["New User Registration", "User Claimed Profile"],
    });
  } catch (error) {
    console.error("Unexpected error in create-test-notifications:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
