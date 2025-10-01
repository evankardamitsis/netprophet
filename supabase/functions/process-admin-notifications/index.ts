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
    text?: string
  ): Promise<any> {
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

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    return response.json();
  }
}

// Render template function
function renderTemplate(
  template: any,
  variables: Record<string, any>
): { subject: string; html: string; text?: string } {
  let subject = template.subject || "Admin Alert";
  let html = template.html_content || "";
  let text = template.text_content || "";

  // Replace variables in subject
  Object.keys(variables).forEach((key) => {
    const value = variables[key] || "";
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    subject = subject.replace(placeholder, String(value));
    html = html.replace(placeholder, String(value));
    if (text) {
      text = text.replace(placeholder, String(value));
    }
  });

  return { subject, html, text: text || undefined };
}

// Helper function to process a single admin email
async function processAdminEmail(
  emailLog: any,
  supabaseClient: any,
  resendService: ResendService
) {
  try {
    // Skip if not pending or not admin type
    if (emailLog.status !== "pending" || emailLog.type !== "admin") {
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

    console.log(`Admin email sent to ${emailLog.to_email}:`, emailResult);

    // Mark as sent
    await supabaseClient
      .from("email_logs")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", emailLog.id);
  } catch (error) {
    console.error(`Error processing admin email ${emailLog.id}:`, error);

    // Mark as failed
    await supabaseClient
      .from("email_logs")
      .update({
        status: "failed",
        sent_at: new Date().toISOString(),
        error_message: error.message,
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
        .order("created_at", { ascending: true })
        .limit(50);

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

      // Process all pending admin emails
      let processedCount = 0;
      let errorCount = 0;

      for (const email of pendingEmails) {
        try {
          await processAdminEmail(email, supabaseClient, resendService);
          processedCount++;
        } catch (error) {
          console.error(`Error processing admin email ${email.id}:`, error);
          errorCount++;
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
