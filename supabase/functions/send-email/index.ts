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

interface EmailData {
  to: string | string[];
  template: string;
  variables?: Record<string, any>;
  language?: "en" | "el";
  type: "promotional" | "notification" | "admin" | "2fa";
}

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  language: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables: Record<string, any>;
  is_active: boolean;
  version: number;
}

// Email template service for database operations
class EmailTemplateService {
  constructor(private supabase: any) {}

  async getTemplate(
    type: string,
    language: string
  ): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase
      .from("email_templates")
      .select("*")
      .eq("type", type)
      .eq("language", language)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // No rows found
      throw error;
    }
    return data;
  }

  renderTemplate(
    template: EmailTemplate,
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
    Object.keys(mergedVariables).forEach((key) => {
      const placeholder = `{{${key}}}`;
      html = html.replace(
        new RegExp(placeholder, "g"),
        String(mergedVariables[key] || "")
      );
    });

    // Replace variables in text content
    let text = template.text_content;
    if (text) {
      Object.keys(mergedVariables).forEach((key) => {
        const placeholder = `{{${key}}}`;
        text = text!.replace(
          new RegExp(placeholder, "g"),
          String(mergedVariables[key] || "")
        );
      });
    }

    return { subject, html, text };
  }

  async logEmail(
    userId: string | null,
    to: string,
    template: string,
    type: string,
    language: string,
    variables: Record<string, any>,
    status: string
  ) {
    await this.supabase.from("email_logs").insert({
      user_id: userId,
      to: Array.isArray(to) ? to.join(", ") : to,
      template,
      type,
      language,
      variables,
      status,
    });
  }
}

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
    text?: string
  ) {
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

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send email via Resend: ${error}`);
    }

    return await response.json();
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const emailData: EmailData = await req.json();

    const { to, template, variables = {}, language = "en", type } = emailData;

    if (!to || !template || !type) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: to, template, and type are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const templateService = new EmailTemplateService(supabase);
    const resendService = new ResendService(RESEND_API_KEY!);

    // Check authentication and permissions
    const authHeader = req.headers.get("Authorization");
    let user = null;
    let isAdmin = false;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      if (token === supabaseServiceKey) {
        // Service role key - admin access
        isAdmin = true;
      } else {
        // User JWT token
        const {
          data: { user: userData },
          error: userError,
        } = await supabase.auth.getUser(token);
        if (userError) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Invalid authentication token",
            }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        user = userData;

        // Check if user is admin
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single();

          isAdmin = profile?.is_admin || false;
        }
      }
    }

    // Check permissions based on email type
    if (type === "2fa") {
      // 2FA emails can be sent without full authentication
      // This is needed during the 2FA flow when user is not fully authenticated yet
      console.log("Sending 2FA email to:", to);
    } else {
      // Other email types require admin privileges
      if (!isAdmin) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Admin privileges required for this email type",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Get template from database
    const emailTemplate = await templateService.getTemplate(template, language);
    if (!emailTemplate) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Template '${template}' not found for language '${language}'`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Render template with variables
    const renderedEmail = templateService.renderTemplate(
      emailTemplate,
      variables
    );

    // Send email via Resend
    const emailResult = await resendService.sendEmail(
      to,
      renderedEmail.subject,
      renderedEmail.html,
      renderedEmail.text
    );

    // Log email to database
    await templateService.logEmail(
      user?.id || null,
      to,
      template,
      type,
      language,
      variables,
      "sent"
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        data: emailResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send email",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
