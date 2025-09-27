import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { alert_type, message, details } = body;

    // Get all admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name, id")
      .eq("is_admin", true);

    if (adminError) {
      console.error("Error fetching admin users:", adminError);
      return NextResponse.json(
        { error: "Failed to fetch admin users", details: adminError.message },
        { status: 500 }
      );
    }

    if (!adminUsers || adminUsers.length === 0) {
      return NextResponse.json(
        { error: "No admin users found" },
        { status: 500 }
      );
    }

    // Prepare template variables
    const templateVariables = {
      alert_type,
      message,
      details: details ? JSON.stringify(details) : "",
      timestamp: new Date().toISOString(),
    };

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Send email to each admin user via the send-email function
    for (const admin of adminUsers) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              to: admin.email,
              template: "admin_alert",
              type: "admin",
              language: "en",
              variables: templateVariables,
            }),
          }
        );

        if (response.ok) {
          successCount++;
          results.push({
            email: admin.email,
            status: "sent",
            name: `${admin.first_name} ${admin.last_name}`,
          });
        } else {
          errorCount++;
          const errorText = await response.text();
          results.push({
            email: admin.email,
            status: "failed",
            error: errorText,
            name: `${admin.first_name} ${admin.last_name}`,
          });
        }
      } catch (error) {
        errorCount++;
        results.push({
          email: admin.email,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          name: `${admin.first_name} ${admin.last_name}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent admin alert to ${successCount} admin(s), ${errorCount} failed`,
      results: {
        total: adminUsers.length,
        success: successCount,
        failed: errorCount,
        details: results,
      },
    });
  } catch (error) {
    console.error("Unexpected error in send-admin-alert:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
