import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

if (!RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY environment variable");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Resend API service
class ResendService {
  private apiKey: string;
  private baseUrl = "https://api.resend.com";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    text?: string,
    retries: number = 3
  ) {
    for (let attempt = 0; attempt < retries; attempt++) {
      const response = await fetch(`${this.baseUrl}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "NetProphet <noreply@netprophetapp.com>",
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text,
        }),
      });

      if (response.ok) {
        return await response.json();
      }

      // Get error details for better diagnostics
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      // Log detailed error information for diagnostics
      console.error(`[RESEND ERROR] Status: ${response.status}, Attempt: ${attempt + 1}/${retries}`);
      console.error(`[RESEND ERROR] Response:`, errorData);
      console.error(`[RESEND ERROR] Headers:`, Object.fromEntries(response.headers.entries()));

      // Handle rate limit errors (429) with exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
        
        if (attempt < retries - 1) {
          console.log(`Rate limit hit, retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      // Check for quota limit errors (403 or messages containing quota/limit keywords)
      const isQuotaError = 
        response.status === 403 ||
        (errorData.message && 
         (errorData.message.toLowerCase().includes("quota") || 
          errorData.message.toLowerCase().includes("daily limit") ||
          errorData.message.toLowerCase().includes("reached 100%") ||
          errorData.message.toLowerCase().includes("limit exceeded")));
      
      if (isQuotaError) {
        console.error(`[QUOTA ERROR DETECTED] This is a Resend quota limit issue`);
        throw new Error(`Resend quota limit reached: ${errorData.message || errorText}`);
      }

      // For other errors or final retry attempt
      throw new Error(`Failed to send email via Resend (${response.status}): ${errorText}`);
    }

    throw new Error("Failed to send email after retries");
  }

  async sendWithTemplate(
    to: string,
    templateId: string,
    variables: Record<string, string | number>,
    retries: number = 3
  ): Promise<any> {
    for (let attempt = 0; attempt < retries; attempt++) {
      const response = await fetch(`${this.baseUrl}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "NetProphet <noreply@netprophetapp.com>",
          to: [to],
          template: { id: templateId, variables },
        }),
      });

      if (response.ok) return await response.json();

      const errorText = await response.text();
      let errorData: { message?: string } = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      console.error(
        `[RESEND ERROR] sendWithTemplate status: ${response.status}, attempt: ${attempt + 1}/${retries}`,
        errorData
      );

      if (response.status === 429 && attempt < retries - 1) {
        const wait =
          (parseInt(response.headers.get("Retry-After") || "1") || 1) * 1000;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      throw new Error(
        `Failed to send via Resend template (${response.status}): ${errorData.message || errorText}`
      );
    }
    throw new Error("Failed to send email after retries");
  }
}

// Helper function to process a single email (uses Resend hosted templates via RESEND_TEMPLATE_IDS)
async function processEmail(
  emailLog: any,
  supabaseClient: any,
  resendService: ResendService
) {
  try {
    if (emailLog.status !== "pending" || emailLog.type !== "user") return;

    const rawMapping = Deno.env.get("RESEND_TEMPLATE_IDS") || "{}";
    let mapping: Record<string, string> = {};
    try {
      mapping = JSON.parse(rawMapping);
    } catch {
      // invalid JSON
    }

    const templateKey = `${emailLog.template}_${emailLog.language}`;
    const templateId =
      mapping[templateKey] || mapping[`${emailLog.template}_en`];

    if (!templateId) {
      const err = `Resend template not configured: ${templateKey}. Set RESEND_TEMPLATE_IDS.`;
      console.error(err);
      await supabaseClient
        .from("email_logs")
        .update({
          status: "failed",
          sent_at: new Date().toISOString(),
          error_message: err,
        })
        .eq("id", emailLog.id);
      throw new Error(err);
    }

    // Convert variable keys to uppercase for Resend templates
    // Resend templates use {{{VAR}}} format with uppercase variable names
    // Some variables should be numbers (e.g., WELCOME_BONUS_COINS, WINNINGS), others should be strings
    const rawVariables = emailLog.variables || {};
    const variables: Record<string, string | number> = {};
    
    // Variables (in lowercase) that should remain as numbers (not converted to strings)
    // These will be converted to uppercase for Resend, but the value stays as a number
    // Only welcome_bonus_coins and welcome_bonus_pass should be numbers for consistent formatting
    // Note: winnings and bet_amount must be strings for Resend templates (prediction_result templates)
    const numericVariables = new Set([
      'welcome_bonus_coins',
      'welcome_bonus_pass',  // Should be number 1 for same formatting as coins
      // winnings and bet_amount removed - Resend templates require them as strings
    ]);
    
    for (const [key, value] of Object.entries(rawVariables)) {
      // Convert key to uppercase (e.g., 'user_name' -> 'USER_NAME')
      const upperKey = key.toUpperCase();
      
      // Preserve numbers for specific numeric variables (check original lowercase key)
      if (numericVariables.has(key.toLowerCase()) && typeof value === 'number') {
        variables[upperKey] = value; // Keep as number
      } else if (value === null || value === undefined) {
        variables[upperKey] = '';
      } else if (typeof value === 'boolean') {
        variables[upperKey] = String(value);
      } else if (typeof value === 'number') {
        // For other numbers, convert to string (default behavior)
        variables[upperKey] = String(value);
      } else if (typeof value === 'object') {
        // For objects/arrays, stringify them
        variables[upperKey] = JSON.stringify(value);
      } else {
        variables[upperKey] = String(value);
      }
    }

    // Handle predicted_result fallback for prediction_result templates
    if (
      emailLog.template?.startsWith("prediction_result") &&
      (!variables.PREDICTED_RESULT ||
        variables.PREDICTED_RESULT === "" ||
        variables.PREDICTED_RESULT === "Not specified")
    ) {
      variables.PREDICTED_RESULT = "–";
    }

    await resendService.sendWithTemplate(
      emailLog.to_email,
      templateId,
      variables
    );

    console.log(`Email sent to ${emailLog.to_email} (template: ${templateKey})`);

    await supabaseClient
      .from("email_logs")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", emailLog.id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[EMAIL PROCESSING ERROR] Email ID: ${emailLog.id}`);
    console.error(`[EMAIL PROCESSING ERROR] To: ${emailLog.to_email}`);
    console.error(`[EMAIL PROCESSING ERROR] Template: ${emailLog.template}`);
    console.error(`[EMAIL PROCESSING ERROR] Error:`, errorMessage);
    console.error(`[EMAIL PROCESSING ERROR] Full Error:`, error);

    // Mark as failed with detailed error message
    await supabaseClient
      .from("email_logs")
      .update({
        status: "failed",
        sent_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("id", emailLog.id);

    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resendService = new ResendService(RESEND_API_KEY!);

    // Get the webhook payload (single email log)
    const payload = await req.json();
    const emailLog = payload.record; // Supabase webhook sends the new record

    // If webhook was triggered with a record, process it if it matches our criteria
    if (emailLog) {
      // Only process if it's a pending user email
      if (emailLog.status === "pending" && emailLog.type === "user") {
        try {
          await processEmail(emailLog, supabaseClient, resendService);
          return new Response(
            JSON.stringify({
              success: true,
              processed: 1,
              message: "Email processed",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (error) {
          console.error("Error processing webhook email:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } else {
        // Not a pending user email, ignore
        return new Response(
          JSON.stringify({
            success: true,
            processed: 0,
            message: "Email does not match criteria (not pending user email)",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // If no record in payload, try to process all pending emails (manual trigger)
    if (!emailLog) {
      const { data: pendingEmails, error: fetchError } = await supabaseClient
        .from("email_logs")
        .select("*")
        .eq("status", "pending")
        .eq("type", "user")
        .order("sent_at", { ascending: true });

      if (fetchError || !pendingEmails || pendingEmails.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            processed: 0,
            message: "No pending emails",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Process all pending emails with rate limiting
      // Resend allows 2 requests per second, so we add 600ms delay between requests
      let processedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < pendingEmails.length; i++) {
        const email = pendingEmails[i];
        try {
          await processEmail(email, supabaseClient, resendService);
          processedCount++;
          
          // Add delay between emails to respect rate limit (2 req/sec = 500ms minimum)
          // Use 600ms to be safe
          if (i < pendingEmails.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 600));
          }
        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error);
          errorCount++;
          
          // If rate limit error, add extra delay before continuing
          if (error.message && error.message.includes("rate_limit")) {
            console.log("Rate limit encountered, waiting 2 seconds before continuing...");
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            // Small delay even for other errors to avoid hammering the API
            if (i < pendingEmails.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          processed: processedCount,
          errors: errorCount,
          total: pendingEmails.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process single email from webhook
    await processEmail(emailLog, supabaseClient, resendService);

    return new Response(
      JSON.stringify({
        success: true,
        processed: 1,
        message: "Email processed successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-user-emails function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
