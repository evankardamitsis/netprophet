import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Process pending admin emails - webhook endpoint
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Verify authentication (optional but recommended)
    // Accept either CRON_SECRET (via Authorization header) or EMAIL_WEBHOOK_SECRET (via custom header)
    const authHeader = request.headers.get("authorization");
    const webhookSecret = request.headers.get("x-webhook-secret");

    const isAuthorized =
      authHeader === `Bearer ${process.env.CRON_SECRET}` ||
      (process.env.EMAIL_WEBHOOK_SECRET &&
        webhookSecret === process.env.EMAIL_WEBHOOK_SECRET) ||
      !process.env.EMAIL_WEBHOOK_SECRET; // Allow if EMAIL_WEBHOOK_SECRET not set (for easier setup)

    if (!isAuthorized) {
      console.log("❌ Unauthorized request to process emails");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("📧 Processing pending admin emails...");

    // Get pending admin emails (process all pending, including old ones)
    // Remove the 30-minute filter to process all pending emails
    const { data: emailLogs, error: fetchError } = await supabase
      .from("email_logs")
      .select("*")
      .eq("template", "admin_alert")
      .eq("type", "admin")
      .eq("status", "pending")
      .order("sent_at", { ascending: true });

    if (fetchError) {
      console.error("Error fetching email logs:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch email logs", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!emailLogs || emailLogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No admin emails to process",
        processed: 0,
      });
    }

    // Deduplicate emails by to_email and variables (to avoid sending duplicates)
    const uniqueEmails = new Map();
    emailLogs.forEach((emailLog) => {
      const key = `${emailLog.to_email}-${JSON.stringify(emailLog.variables)}`;
      if (!uniqueEmails.has(key)) {
        uniqueEmails.set(key, emailLog);
      }
    });

    const uniqueEmailLogs = Array.from(uniqueEmails.values());
    console.log(
      `Found ${emailLogs.length} total emails, ${uniqueEmailLogs.length} unique emails to process`
    );

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // Process each unique email log
    for (const emailLog of uniqueEmailLogs) {
      try {
        console.log(`Processing email to: ${emailLog.to_email}`);

        // Call the send-email function to actually send the email
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              to: emailLog.to_email,
              template: emailLog.template,
              type: emailLog.type,
              language: emailLog.language,
              variables: emailLog.variables,
            }),
          }
        );

        if (response.ok) {
          successCount++;
          results.push({
            id: emailLog.id,
            to: emailLog.to_email,
            status: "sent_successfully",
          });
          console.log(`✅ Email sent successfully to: ${emailLog.to_email}`);
        } else {
          errorCount++;
          const errorText = await response.text();
          results.push({
            id: emailLog.id,
            to: emailLog.to_email,
            status: "send_failed",
            error: errorText,
          });
          console.error(
            `❌ Failed to send email to: ${emailLog.to_email}`,
            errorText
          );
        }
      } catch (error) {
        errorCount++;
        results.push({
          id: emailLog.id,
          to: emailLog.to_email,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(
          `❌ Error processing email to: ${emailLog.to_email}`,
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${uniqueEmailLogs.length} unique admin emails (${emailLogs.length} total found, ${emailLogs.length - uniqueEmailLogs.length} duplicates removed): ${successCount} successful, ${errorCount} failed`,
      processed: uniqueEmailLogs.length,
      totalFound: emailLogs.length,
      duplicatesRemoved: emailLogs.length - uniqueEmailLogs.length,
      successful: successCount,
      failed: errorCount,
      results,
    });
  } catch (error) {
    console.error("Unexpected error in process-emails:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
