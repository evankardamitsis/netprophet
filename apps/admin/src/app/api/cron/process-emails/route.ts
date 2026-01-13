import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔄 Starting automatic email processing...");

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get recent pending admin emails (last 30 minutes to avoid processing old emails)
    const thirtyMinutesAgo = new Date(
      Date.now() - 30 * 60 * 1000
    ).toISOString();

    const { data: emailLogs, error: fetchError } = await supabase
      .from("email_logs")
      .select("*")
      .eq("template", "admin_alert")
      .eq("type", "admin")
      .eq("status", "pending")
      .gte("created_at", thirtyMinutesAgo)
      .order("created_at", { ascending: true })
      .limit(50); // Process up to 50 emails at a time

    if (fetchError) {
      console.error("Error fetching pending emails:", fetchError);
      return NextResponse.json(
        {
          error: "Failed to fetch pending emails",
          details: fetchError.message,
        },
        { status: 500 }
      );
    }

    if (!emailLogs || emailLogs.length === 0) {
      console.log("✅ No pending emails to process");
      return NextResponse.json({
        success: true,
        message: "No pending emails to process",
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
      `📧 Processing ${uniqueEmailLogs.length} unique emails (${emailLogs.length} total found, ${emailLogs.length - uniqueEmailLogs.length} duplicates removed)...`
    );

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // Process each unique email log
    for (const emailLog of uniqueEmailLogs) {
      try {
        console.log(`📤 Sending email to: ${emailLog.to_email}`);

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
          // Update email log status to 'sent'
          await supabase
            .from("email_logs")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", emailLog.id);

          successCount++;
          results.push({
            id: emailLog.id,
            to: emailLog.to_email,
            status: "sent_successfully",
          });
          console.log(`✅ Email sent successfully to: ${emailLog.to_email}`);
        } else {
          // Update email log status to 'failed'
          await supabase
            .from("email_logs")
            .update({
              status: "failed",
              error_message: await response.text(),
            })
            .eq("id", emailLog.id);

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
        // Update email log status to 'failed'
        await supabase
          .from("email_logs")
          .update({
            status: "failed",
            error_message:
              error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", emailLog.id);

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

    console.log(
      `✅ Email processing completed: ${successCount} successful, ${errorCount} failed`
    );

    return NextResponse.json({
      success: true,
      message: `Processed ${uniqueEmailLogs.length} unique emails (${emailLogs.length} total found, ${emailLogs.length - uniqueEmailLogs.length} duplicates removed): ${successCount} successful, ${errorCount} failed`,
      processed: uniqueEmailLogs.length,
      totalFound: emailLogs.length,
      duplicatesRemoved: emailLogs.length - uniqueEmailLogs.length,
      successful: successCount,
      failed: errorCount,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
