#!/usr/bin/env node

/**
 * Test script for automatic email processing
 * This script tests the cron endpoint to ensure automatic email processing works
 */

const https = require("https");
const http = require("http");

const ADMIN_URL = process.env.ADMIN_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "test-secret";

async function testCronEndpoint() {
  console.log("🧪 Testing automatic email processing...");
  console.log(`📍 Admin URL: ${ADMIN_URL}`);

  try {
    const url = new URL(`${ADMIN_URL}/api/cron/process-emails`);
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(url.toString(), options);
    const data = await response.json();

    if (response.ok) {
      console.log("✅ Cron endpoint test successful!");
      console.log(`📊 Results: ${data.message}`);
      if (data.processed > 0) {
        console.log(`📧 Processed: ${data.processed} emails`);
        console.log(`✅ Successful: ${data.successful}`);
        console.log(`❌ Failed: ${data.failed}`);
      }
    } else {
      console.log("❌ Cron endpoint test failed!");
      console.log(`Error: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.log("❌ Test failed with error:", error.message);
  }
}

// Run the test
testCronEndpoint();
