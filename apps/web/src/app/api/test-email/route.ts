import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type, language = "en", featuredMatches } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Call the Supabase Edge Function directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log("Environment check:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      url: supabaseUrl,
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          success: false,
          error: `Supabase configuration missing. URL: ${!!supabaseUrl}, ServiceKey: ${!!supabaseServiceKey}`,
        },
        { status: 500 }
      );
    }

    let emailData: any = {
      to: email,
      type: type || "2fa",
      language: language || "en",
    };

    // Set up email data based on type
    switch (type) {
      case "2fa":
        emailData.template = "2fa";
        emailData.variables = {
          code: "123456",
          user_email: email,
        };
        break;

      case "promotional":
        emailData.template = "promotional_update";
        emailData.variables = {
          featured_matches: featuredMatches || [
            {
              tournament: "Wimbledon",
              player1: "Novak Djokovic",
              player2: "Rafael Nadal",
              time: "14:30",
            },
            {
              tournament: "French Open",
              player1: "Carlos Alcaraz",
              player2: "Jannik Sinner",
              time: "16:00",
            },
          ],
          user_email: email,
        };
        break;

      case "winnings":
        emailData.template = "winnings_notification";
        emailData.variables = {
          match_name: "Djokovic vs Nadal",
          prediction: "Djokovic",
          winnings_amount: 150,
          user_email: email,
        };
        break;

      case "admin":
        emailData.template = "admin_alert";
        emailData.variables = {
          alert_type: "Test Alert",
          message: "This is a test admin alert email",
          details: { test: true, timestamp: new Date().toISOString() },
        };
        break;

      default:
        emailData.template = "2fa";
        emailData.variables = {
          code: "123456",
          user_email: email,
        };
    }

    // Call the Edge Function
    console.log("Calling Edge Function:", {
      url: `${supabaseUrl}/functions/v1/send-email`,
      emailData,
    });

    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    console.log("Edge Function response:", {
      status: response.status,
      statusText: response.statusText,
    });

    const result = await response.json();
    console.log("Edge Function result:", result);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: result.message || "Failed to send email" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      data: result,
    });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
