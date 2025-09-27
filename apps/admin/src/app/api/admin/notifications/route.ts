import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AdminNotificationData {
  type: "user_registration" | "profile_claim";
  userData: {
    id: string;
    email: string;
    name?: string;
    created_at: string;
  };
  profileData?: {
    first_name?: string;
    last_name?: string;
    ntrp_rating?: number;
    age?: number;
    phone?: string;
  };
}

export async function GET() {
  try {
    console.log("Fetching admin notifications...");

    // Fetch notifications first
    const { data: notifications, error } = await supabase
      .from("admin_notifications")
      .select(
        `
        id,
        type,
        user_id,
        status,
        created_at,
        sent_at,
        error_message
      `
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      );
    }

    // Fetch user profiles for all notifications
    const userIds = notifications?.map((n) => n.user_id) || [];
    let profilesData: any[] = [];

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("id", userIds);

      if (!profilesError && profiles) {
        profilesData = profiles;
      }
    }

    // Fetch player information for profile_claim notifications
    const profileClaimNotifications =
      notifications?.filter((n) => n.type === "profile_claim") || [];
    const playerIds = profileClaimNotifications.map((n) => n.user_id);

    let playersData: any[] = [];
    if (playerIds.length > 0) {
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("user_id, first_name, last_name")
        .in("user_id", playerIds);

      if (!playersError && players) {
        playersData = players;
      }
    }

    // Combine the data
    const enrichedNotifications =
      notifications?.map((notification) => {
        const userProfile = profilesData.find(
          (p) => p.id === notification.user_id
        );
        const playerData = playersData.find(
          (p) => p.user_id === notification.user_id
        );

        return {
          id: notification.id,
          type: notification.type,
          user_id: notification.user_id,
          status: notification.status,
          created_at: notification.created_at,
          sent_at: notification.sent_at,
          error_message: notification.error_message,
          user_email: userProfile?.email,
          user_name: userProfile
            ? `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim()
            : null,
          player_name: playerData
            ? `${playerData.first_name} ${playerData.last_name}`.trim()
            : null,
        };
      }) || [];

    // Calculate stats
    const stats = {
      total: notifications?.length || 0,
      pending: notifications?.filter((n) => n.status === "pending").length || 0,
      sent: notifications?.filter((n) => n.status === "sent").length || 0,
      failed: notifications?.filter((n) => n.status === "failed").length || 0,
    };

    return NextResponse.json({
      notifications: enrichedNotifications,
      stats,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AdminNotificationData = await request.json();
    const { type, userData, profileData } = body;

    // Initialize Resend only when we need to send emails
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    // Get all admin users from the profiles table
    const { data: adminUsers, error: adminError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
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

    console.log(
      `Found ${adminUsers.length} admin users:`,
      adminUsers.map((u) => u.email)
    );

    // Get admin emails from the profiles table
    const adminEmails = adminUsers.map((admin) => admin.email);

    let subject: string;
    let htmlContent: string;

    switch (type) {
      case "user_registration":
        subject = `New User Registration - ${userData.email}`;
        htmlContent = generateUserRegistrationEmail(userData);
        break;

      case "profile_claim":
        subject = `Player Profile Claimed - ${userData.email}`;
        htmlContent = generateProfileClaimEmail(userData, profileData);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid notification type" },
          { status: 400 }
        );
    }

    // Send email to all admin emails
    const emailPromises = adminEmails.map((email) =>
      resend.emails.send({
        from: "NetProphet Admin <admin@netprophetapp.com>",
        to: email.trim(),
        subject,
        html: htmlContent,
      })
    );

    const results = await Promise.allSettled(emailPromises);

    // Check if any emails failed
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length > 0) {
      console.error("Some admin emails failed to send:", failed);
      return NextResponse.json(
        { error: "Some emails failed to send", failed },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emailsSent: results.length,
      type,
    });
  } catch (error) {
    console.error("Error sending admin notification:", error);
    return NextResponse.json(
      { error: "Failed to send admin notification" },
      { status: 500 }
    );
  }
}

function generateUserRegistrationEmail(
  userData: AdminNotificationData["userData"]
): string {
  const registrationDate = new Date(userData.created_at).toLocaleString();

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New User Registration</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .label { font-weight: 600; color: #495057; }
            .value { color: #212529; margin-bottom: 10px; }
            .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎾 New User Registration</h1>
                <p>A new user has registered on NetProphet</p>
            </div>
            <div class="content">
                <div class="info-box">
                    <div class="label">User ID:</div>
                    <div class="value">${userData.id}</div>
                    
                    <div class="label">Email:</div>
                    <div class="value">${userData.email}</div>
                    
                    ${
                      userData.name
                        ? `
                    <div class="label">Name:</div>
                    <div class="value">${userData.name}</div>
                    `
                        : ""
                    }
                    
                    <div class="label">Registration Date:</div>
                    <div class="value">${registrationDate}</div>
                </div>
                
                <div class="footer">
                    <p>This is an automated notification from NetProphet Admin System</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
}

function generateProfileClaimEmail(
  userData: AdminNotificationData["userData"],
  profileData?: AdminNotificationData["profileData"]
): string {
  const registrationDate = new Date(userData.created_at).toLocaleString();

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Player Profile Claimed</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .label { font-weight: 600; color: #495057; }
            .value { color: #212529; margin-bottom: 10px; }
            .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
            .player-badge { background: #28a745; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏆 Player Profile Claimed</h1>
                <p>A user has claimed their player profile on NetProphet</p>
            </div>
            <div class="content">
                <div class="info-box">
                    <div class="label">User ID:</div>
                    <div class="value">${userData.id}</div>
                    
                    <div class="label">Email:</div>
                    <div class="value">${userData.email}</div>
                    
                    <div class="label">Registration Date:</div>
                    <div class="value">${registrationDate}</div>
                </div>
                
                ${
                  profileData
                    ? `
                <div class="info-box">
                    <h3>Player Information:</h3>
                    ${
                      profileData.first_name
                        ? `
                    <div class="label">First Name:</div>
                    <div class="value">${profileData.first_name}</div>
                    `
                        : ""
                    }
                    
                    ${
                      profileData.last_name
                        ? `
                    <div class="label">Last Name:</div>
                    <div class="value">${profileData.last_name}</div>
                    `
                        : ""
                    }
                    
                    ${
                      profileData.ntrp_rating
                        ? `
                    <div class="label">NTRP Rating:</div>
                    <div class="value">${profileData.ntrp_rating.toFixed(1)}</div>
                    `
                        : ""
                    }
                    
                    ${
                      profileData.age
                        ? `
                    <div class="label">Age:</div>
                    <div class="value">${profileData.age}</div>
                    `
                        : ""
                    }
                    
                    ${
                      profileData.phone
                        ? `
                    <div class="label">Phone:</div>
                    <div class="value">${profileData.phone}</div>
                    `
                        : ""
                    }
                </div>
                `
                    : ""
                }
                
                <div class="footer">
                    <p>This is an automated notification from NetProphet Admin System</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
}
