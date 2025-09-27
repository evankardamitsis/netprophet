import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    console.log("Clearing test admin emails...");

    // Delete only test emails with old test patterns or very old emails
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Clear old pending emails and test emails
    const { error: deleteError } = await supabase
      .from("email_logs")
      .delete()
      .eq("template", "admin_alert")
      .eq("type", "admin")
      .or(
        `sent_at.lt.${oneHourAgo},status.eq.pending,variables->>alert_type.eq.Test Admin Notification`
      );

    if (deleteError) {
      console.error("Error clearing test emails:", deleteError);
      return NextResponse.json(
        { error: "Failed to clear test emails", details: deleteError.message },
        { status: 500 }
      );
    }

    console.log("Test emails cleared successfully!");

    return NextResponse.json({
      success: true,
      message:
        "Old test emails cleared successfully! Recent emails are preserved.",
    });
  } catch (error) {
    console.error("Unexpected error in clear-test-emails:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
