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
}

// Email template rendering
function renderTemplate(
  template: any,
  variables: Record<string, any>
): { subject: string; html: string; text?: string } {
  const mergedVariables = { ...template.variables, ...variables };

  // Replace variables in subject
  let subject = template.subject;
  Object.keys(mergedVariables).forEach((key) => {
    const placeholder = `{{${key}}}`;
    subject = subject.replace(
      new RegExp(placeholder, "g"),
      String(mergedVariables[key] || "")
    );
  });

  // Replace variables in HTML content
  let html = template.html_content;
  
  // Special handling for predicted_result - remove sections if empty
  const predictedResultValue = mergedVariables['predicted_result'];
  if (!predictedResultValue || predictedResultValue === '' || predictedResultValue === 'Not specified') {
    // Remove table row containing predicted_result (for lost emails)
    html = html.replace(
      /<tr[^>]*>[\s\S]*?{{predicted_result}}[\s\S]*?<\/tr>/gi,
      ''
    );
    // Remove paragraph containing predicted_result (for won emails)
    html = html.replace(
      /<p[^>]*style="[^"]*margin-top:[^"]*margin-bottom:[^"]*"[^>]*>[\s\S]*?<strong[^>]*>[\s\S]*?Predicted Result:[\s\S]*?<\/strong>[\s\S]*?{{predicted_result}}[\s\S]*?<\/p>/gi,
      ''
    );
    html = html.replace(
      /<p[^>]*style="[^"]*margin-top:[^"]*margin-bottom:[^"]*"[^>]*>[\s\S]*?<strong[^>]*>[\s\S]*?Προβλεπόμενο Αποτέλεσμα:[\s\S]*?<\/strong>[\s\S]*?{{predicted_result}}[\s\S]*?<\/p>/gi,
      ''
    );
    // Also handle simpler patterns
    html = html.replace(
      /<p[^>]*>[\s\S]*?Predicted Result:[\s\S]*?{{predicted_result}}[\s\S]*?<\/p>/gi,
      ''
    );
    html = html.replace(
      /<p[^>]*>[\s\S]*?Προβλεπόμενο Αποτέλεσμα:[\s\S]*?{{predicted_result}}[\s\S]*?<\/p>/gi,
      ''
    );
  }
  
  // Replace all variables
  Object.keys(mergedVariables).forEach((key) => {
    const placeholder = `{{${key}}}`;
    const value = mergedVariables[key];
    html = html.replace(
      new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g"),
      String(value || "")
    );
  });

  // Replace variables in text content
  let text = template.text_content;
  if (text) {
    // Special handling for predicted_result - remove lines if empty
    const predictedResultValue = mergedVariables['predicted_result'];
    if (!predictedResultValue || predictedResultValue === '' || predictedResultValue === 'Not specified') {
      // Remove lines containing predicted_result
      text = text.replace(
        /.*Predicted Result:.*{{predicted_result}}.*\n?/gi,
        ''
      );
      text = text.replace(
        /.*Προβλεπόμενο Αποτέλεσμα:.*{{predicted_result}}.*\n?/gi,
        ''
      );
    }
    
    // Replace all variables
    Object.keys(mergedVariables).forEach((key) => {
      const placeholder = `{{${key}}}`;
      const value = mergedVariables[key];
      text = text.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g"),
        String(value || "")
      );
    });
  }

  return { subject, html, text };
}

// Helper function to process a single email
async function processEmail(
  emailLog: any,
  supabaseClient: any,
  resendService: ResendService
) {
  try {
    // Skip if not pending or not user type
    if (emailLog.status !== "pending" || emailLog.type !== "user") {
      return;
    }

    // Get the email template
    const { data: template, error: templateError } = await supabaseClient
      .from("email_templates")
      .select("*")
      .eq("type", emailLog.template)
      .eq("language", emailLog.language)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error(
        `Template not found: ${emailLog.template} (${emailLog.language})`
      );

      // Mark as failed
      await supabaseClient
        .from("email_logs")
        .update({
          status: "failed",
          sent_at: new Date().toISOString(),
          error_message: `Template not found: ${emailLog.template}`,
        })
        .eq("id", emailLog.id);

      throw new Error(`Template not found: ${emailLog.template}`);
    }

    // Render the email template with variables
    const renderedEmail = renderTemplate(template, emailLog.variables || {});

    // Send email via Resend
    const emailResult = await resendService.sendEmail(
      emailLog.to_email,
      renderedEmail.subject,
      renderedEmail.html,
      renderedEmail.text
    );

    console.log(`Email sent to ${emailLog.to_email}:`, emailResult);

    // Mark as sent
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
