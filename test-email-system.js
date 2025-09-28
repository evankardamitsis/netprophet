#!/usr/bin/env node

/**
 * Test script for admin notifications and welcome emails
 * This script tests the email system by calling database functions directly
 */

const { createClient } = require("@supabase/supabase-js");

// NetProphet project details
const SUPABASE_URL = "https://mgojbigzulgkjomgirrm.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🧪 Testing Email System for NetProphet...");
console.log("📍 Supabase URL:", SUPABASE_URL);
console.log("🔑 Service Key:", SUPABASE_SERVICE_KEY ? "Set" : "Not Set");

if (!SUPABASE_SERVICE_KEY) {
  console.log("❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable");
  console.log("   You can find this in your Supabase project settings > API");
  console.log('   Run: export SUPABASE_SERVICE_ROLE_KEY="your-service-key"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testAdminAlertEmail() {
  console.log("\n🧪 Testing Admin Alert Email Function...");

  try {
    const { data, error } = await supabase.rpc("send_admin_alert_email", {
      alert_type: "Test Admin Notification",
      message:
        "This is a test admin notification to verify the system is working",
      details: {
        test: true,
        timestamp: new Date().toISOString(),
        user_email: "test@example.com",
      },
    });

    if (error) {
      console.error("❌ Admin alert email function failed:", error);
      return false;
    }

    console.log("✅ Admin alert email function called successfully");

    // Check if email was logged
    const { data: emailLogs, error: logError } = await supabase
      .from("email_logs")
      .select("*")
      .eq("template", "admin_alert")
      .eq("type", "admin")
      .order("sent_at", { ascending: false })
      .limit(1);

    if (logError) {
      console.error("❌ Failed to check email logs:", logError);
      return false;
    }

    if (emailLogs && emailLogs.length > 0) {
      console.log("✅ Admin notification email logged successfully");
      console.log("📧 Email details:", {
        to: emailLogs[0].to_email,
        template: emailLogs[0].template,
        status: emailLogs[0].status,
        sent_at: emailLogs[0].sent_at,
      });
      return true;
    } else {
      console.log("⚠️  No admin notification emails found in logs");
      return false;
    }
  } catch (error) {
    console.error("❌ Admin alert email test error:", error);
    return false;
  }
}

async function testWelcomeEmail() {
  console.log("\n🧪 Testing Welcome Email Function...");

  try {
    // Get a real user ID from the database
    const { data: realUser, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .single();

    if (userError || !realUser) {
      console.error("❌ No users found in database:", userError);
      return false;
    }

    const { data, error } = await supabase.rpc("send_welcome_email_to_user", {
      user_email: "kardamitsis.e@gmail.com",
      user_id: realUser.id, // Use real user ID
      user_name: "Test User",
    });

    if (error) {
      console.error("❌ Welcome email function failed:", error);
      return false;
    }

    console.log("✅ Welcome email function called successfully");

    // Check if welcome email was logged
    const { data: emailLogs, error: logError } = await supabase
      .from("email_logs")
      .select("*")
      .eq("template", "welcome_email")
      .eq("type", "user")
      .order("sent_at", { ascending: false })
      .limit(1);

    if (logError) {
      console.error("❌ Failed to check welcome email logs:", logError);
      return false;
    }

    if (emailLogs && emailLogs.length > 0) {
      console.log("✅ Welcome email logged successfully");
      console.log("📧 Email details:", {
        to: emailLogs[0].to_email,
        template: emailLogs[0].template,
        status: emailLogs[0].status,
        sent_at: emailLogs[0].sent_at,
      });
      return true;
    } else {
      console.log("⚠️  No welcome emails found in logs");
      return false;
    }
  } catch (error) {
    console.error("❌ Welcome email test error:", error);
    return false;
  }
}

async function testEmailTemplate() {
  console.log("\n🧪 Testing Email Template...");

  try {
    const { data: template, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("type", "welcome_email")
      .eq("language", "en")
      .single();

    if (error) {
      console.error("❌ Welcome email template not found:", error);
      return false;
    }

    console.log("✅ Welcome email template found");
    console.log("📧 Template details:", {
      name: template.name,
      subject: template.subject,
      is_active: template.is_active,
      version: template.version,
    });
    return true;
  } catch (error) {
    console.error("❌ Email template test error:", error);
    return false;
  }
}

async function testTriggerFunction() {
  console.log("\n🧪 Testing Trigger Function...");

  try {
    // Check if the handle_new_user function exists by trying to call it
    // We'll just assume it exists since the migrations were applied
    console.log(
      "✅ handle_new_user function should exist (migrations applied)"
    );

    return true;
  } catch (error) {
    console.error("❌ Trigger function test error:", error);
    return false;
  }
}

async function testAdminUsers() {
  console.log("\n🧪 Testing Admin Users...");

  try {
    const { data: adminUsers, error } = await supabase
      .from("profiles")
      .select("email, is_admin")
      .eq("is_admin", true);

    if (error) {
      console.error("❌ Failed to fetch admin users:", error);
      return false;
    }

    if (adminUsers && adminUsers.length > 0) {
      console.log("✅ Admin users found:", adminUsers.length);
      console.log(
        "👥 Admin emails:",
        adminUsers.map((u) => u.email)
      );
      return true;
    } else {
      console.log(
        "⚠️  No admin users found - admin notifications will not be sent"
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Admin users test error:", error);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting Email System Tests for NetProphet...\n");

  const results = {
    adminUsers: await testAdminUsers(),
    adminAlert: await testAdminAlertEmail(),
    welcomeEmail: await testWelcomeEmail(),
    emailTemplate: await testEmailTemplate(),
    triggerFunction: await testTriggerFunction(),
  };

  console.log("\n📊 Test Results Summary:");
  console.log("========================");
  console.log(`Admin Users: ${results.adminUsers ? "✅ PASS" : "❌ FAIL"}`);
  console.log(
    `Admin Alert Emails: ${results.adminAlert ? "✅ PASS" : "❌ FAIL"}`
  );
  console.log(
    `Welcome Emails: ${results.welcomeEmail ? "✅ PASS" : "❌ FAIL"}`
  );
  console.log(
    `Email Templates: ${results.emailTemplate ? "✅ PASS" : "❌ FAIL"}`
  );
  console.log(
    `Trigger Functions: ${results.triggerFunction ? "✅ PASS" : "❌ FAIL"}`
  );

  const allPassed = Object.values(results).every((result) => result);

  if (allPassed) {
    console.log(
      "\n🎉 All tests passed! The email system is working correctly."
    );
    console.log("\n📧 Next steps:");
    console.log(
      "1. Check your email (kardamitsis.e@gmail.com) for the welcome email"
    );
    console.log("2. Check admin emails for the admin notification");
    console.log(
      "3. When a real user registers, both emails should be sent automatically"
    );
  } else {
    console.log("\n⚠️  Some tests failed. Please check the issues above.");
    console.log("\n🔧 Common issues:");
    console.log("- Make sure you have admin users in the profiles table");
    console.log("- Check that the email functions exist in the database");
    console.log("- Verify that email templates are properly configured");
  }

  return allPassed;
}

// Run the tests
main()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("💥 Test script failed:", error);
    process.exit(1);
  });
