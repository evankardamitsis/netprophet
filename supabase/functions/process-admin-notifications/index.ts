import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Resend API service
class ResendService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
    retries: number = 3
  ): Promise<any> {
    for (let attempt = 0; attempt < retries; attempt++) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: "NetProphet <noreply@netprophetapp.com>",
          to: [to],
          subject,
          html,
          text: text || undefined,
        }),
      });

      if (response.ok) {
        return response.json();
      }

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

      // For other errors or final retry attempt
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    throw new Error("Failed to send email after retries");
  }

  async sendWithTemplate(
    to: string,
    templateId: string,
    variables: Record<string, unknown>,
    retries: number = 3
  ): Promise<any> {
    for (let attempt = 0; attempt < retries; attempt++) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: "NetProphet <noreply@netprophetapp.com>",
          to: [to],
          template: { id: templateId, variables },
        }),
      });

      if (response.ok) return response.json();

      const errorText = await response.text();
      if (response.status === 429 && attempt < retries - 1) {
        const wait =
          (parseInt(response.headers.get("Retry-After") || "1") || 1) * 1000;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw new Error(`Resend API error: ${errorText}`);
    }
    throw new Error("Failed to send email after retries");
  }
}

// Helper function to process a single admin email (uses Resend hosted templates via RESEND_TEMPLATE_IDS)
async function processAdminEmail(
  emailLog: any,
  supabaseClient: any,
  resendService: ResendService
) {
  try {
    if (emailLog.status !== "pending" || emailLog.type !== "admin") return;

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
    // Also convert values to strings (Resend expects string values for template variables)
    const rawVariables = emailLog.variables || {};
    const variables: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(rawVariables)) {
      // Convert key to uppercase (e.g., 'user_name' -> 'USER_NAME')
      const upperKey = key.toUpperCase();
      
      // Convert value to string (Resend template variables must be strings)
      if (value === null || value === undefined) {
        variables[upperKey] = '';
      } else if (typeof value === 'boolean') {
        variables[upperKey] = String(value);
      } else if (typeof value === 'number') {
        variables[upperKey] = String(value);
      } else if (typeof value === 'object') {
        // For objects/arrays, stringify them
        variables[upperKey] = JSON.stringify(value);
      } else {
        variables[upperKey] = String(value);
      }
    }

    // Ensure all variables are strings (Resend requirement)
    for (const key in variables) {
      if (typeof variables[key] !== 'string') {
        variables[key] = String(variables[key] ?? '');
      }
    }

    await resendService.sendWithTemplate(
      emailLog.to_email,
      templateId,
      variables
    );

    console.log(
      `Admin email sent to ${emailLog.to_email} (template: ${templateKey})`
    );

    await supabaseClient
      .from("email_logs")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", emailLog.id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error processing admin email ${emailLog.id}:`, error);

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
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resendService = new ResendService(RESEND_API_KEY);

    // Get the webhook payload (single email log)
    const payload = await req.json();
    const emailLog = payload.record; // Supabase webhook sends the new record

    // If no record in payload, try to process all pending admin emails (manual trigger)
    if (!emailLog) {
      const { data: pendingEmails, error: fetchError } = await supabaseClient
        .from("email_logs")
        .select("*")
        .eq("status", "pending")
        .eq("type", "admin")
        .order("sent_at", { ascending: true });

      if (fetchError || !pendingEmails || pendingEmails.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            processed: 0,
            message: "No pending admin emails",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Process all pending admin emails with rate limiting
      // Resend allows 2 requests per second, so we add 600ms delay between requests
      let processedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < pendingEmails.length; i++) {
        const email = pendingEmails[i];
        try {
          await processAdminEmail(email, supabaseClient, resendService);
          processedCount++;
          
          // Add delay between emails to respect rate limit (2 req/sec = 500ms minimum)
          // Use 600ms to be safe
          if (i < pendingEmails.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 600));
          }
        } catch (error) {
          console.error(`Error processing admin email ${email.id}:`, error);
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

    // Process single admin email from webhook
    await processAdminEmail(emailLog, supabaseClient, resendService);

    return new Response(JSON.stringify({ success: true, processed: 1 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in process-admin-notifications function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
