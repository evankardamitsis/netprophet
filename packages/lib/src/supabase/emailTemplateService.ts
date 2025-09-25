import { supabase } from "./client";

export interface EmailTemplate {
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
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateVariable {
  id: string;
  template_id: string;
  variable_name: string;
  display_name: string;
  description?: string;
  variable_type: string;
  is_required: boolean;
  default_value?: string;
  validation_rules: Record<string, any>;
  created_at: string;
}

export interface EmailTemplateVersion {
  id: string;
  template_id: string;
  version: number;
  subject: string;
  html_content: string;
  text_content?: string;
  variables: Record<string, any>;
  created_by?: string;
  created_at: string;
}

export class EmailTemplateService {
  /**
   * Get all active email templates
   */
  static async getTemplates(): Promise<EmailTemplate[]> {
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("is_active", true)
      .order("type", { ascending: true })
      .order("language", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get template by type and language
   */
  static async getTemplate(
    type: string,
    language: string
  ): Promise<EmailTemplate | null> {
    const { data, error } = await supabase
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

  /**
   * Get template by ID
   */
  static async getTemplateById(id: string): Promise<EmailTemplate | null> {
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  /**
   * Create a new email template
   */
  static async createTemplate(
    template: Omit<EmailTemplate, "id" | "created_at" | "updated_at">
  ): Promise<EmailTemplate> {
    const { data, error } = await supabase
      .from("email_templates")
      .insert(template)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update an email template
   */
  static async updateTemplate(
    id: string,
    updates: Partial<EmailTemplate>
  ): Promise<EmailTemplate> {
    const { data, error } = await supabase
      .from("email_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete an email template (soft delete by setting is_active to false)
   */
  static async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from("email_templates")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
  }

  /**
   * Get template variables
   */
  static async getTemplateVariables(
    templateId: string
  ): Promise<EmailTemplateVariable[]> {
    const { data, error } = await supabase
      .from("email_template_variables")
      .select("*")
      .eq("template_id", templateId)
      .order("variable_name", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create template variables
   */
  static async createTemplateVariables(
    variables: Omit<EmailTemplateVariable, "id" | "created_at">[]
  ): Promise<EmailTemplateVariable[]> {
    const { data, error } = await supabase
      .from("email_template_variables")
      .insert(variables)
      .select();

    if (error) throw error;
    return data || [];
  }

  /**
   * Update template variables
   */
  static async updateTemplateVariables(
    templateId: string,
    variables: Omit<
      EmailTemplateVariable,
      "id" | "template_id" | "created_at"
    >[]
  ): Promise<void> {
    // Delete existing variables
    await supabase
      .from("email_template_variables")
      .delete()
      .eq("template_id", templateId);

    // Insert new variables
    const variablesWithTemplateId = variables.map((v) => ({
      ...v,
      template_id: templateId,
    }));
    const { error } = await supabase
      .from("email_template_variables")
      .insert(variablesWithTemplateId);

    if (error) throw error;
  }

  /**
   * Get template versions
   */
  static async getTemplateVersions(
    templateId: string
  ): Promise<EmailTemplateVersion[]> {
    const { data, error } = await supabase
      .from("email_template_versions")
      .select("*")
      .eq("template_id", templateId)
      .order("version", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a new template version
   */
  static async createTemplateVersion(
    version: Omit<EmailTemplateVersion, "id" | "created_at">
  ): Promise<EmailTemplateVersion> {
    const { data, error } = await supabase
      .from("email_template_versions")
      .insert(version)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Render template with variables
   */
  static renderTemplate(
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

  /**
   * Validate template variables
   */
  static validateVariables(
    template: EmailTemplate,
    variables: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Get required variables from template
    const requiredVars = Object.keys(template.variables).filter(
      (key) =>
        template.variables[key] === "" ||
        template.variables[key] === null ||
        template.variables[key] === undefined
    );

    // Check if all required variables are provided
    requiredVars.forEach((varName) => {
      if (
        !(varName in variables) ||
        variables[varName] === "" ||
        variables[varName] === null ||
        variables[varName] === undefined
      ) {
        errors.push(`Required variable '${varName}' is missing`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get template statistics
   */
  static async getTemplateStats(): Promise<{
    total_templates: number;
    active_templates: number;
    templates_by_type: Record<string, number>;
    templates_by_language: Record<string, number>;
  }> {
    const { data, error } = await supabase
      .from("email_templates")
      .select("type, language, is_active");

    if (error) throw error;

    const total_templates = data.length;
    const active_templates = data.filter((t) => t.is_active).length;

    const templates_by_type: Record<string, number> = {};
    const templates_by_language: Record<string, number> = {};

    data.forEach((template) => {
      templates_by_type[template.type] =
        (templates_by_type[template.type] || 0) + 1;
      templates_by_language[template.language] =
        (templates_by_language[template.language] || 0) + 1;
    });

    return {
      total_templates,
      active_templates,
      templates_by_type,
      templates_by_language,
    };
  }
}

export const emailTemplateService = new EmailTemplateService();
