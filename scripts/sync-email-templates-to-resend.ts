/**
 * Sync email_templates from Supabase to Resend hosted templates.
 * Converts {{var}} → {{{var}}} and creates each (type, language) as a Resend template.
 *
 * Run: npx tsx scripts/sync-email-templates-to-resend.ts
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
 * (e.g. in .env.local)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Try multiple env file paths (from repo root and common app directories)
const envPaths = [
  ".env.local",
  ".env",
  "apps/web/.env.local",
  "apps/web/.env",
  "apps/admin/.env.local",
  "apps/admin/.env",
  path.join(process.cwd(), ".env.local"),
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), "apps/web/.env.local"),
  path.join(process.cwd(), "apps/web/.env"),
  path.join(process.cwd(), "apps/admin/.env.local"),
  path.join(process.cwd(), "apps/admin/.env"),
];

console.log(`📂 Current working directory: ${process.cwd()}\n`);
console.log("🔍 Checking for env files:");

let loadedEnv = false;
let loadedPath = "";
for (const envPath of envPaths) {
  const fullPath = path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  const exists = fs.existsSync(fullPath);
  console.log(`  ${exists ? "✓" : "✗"} ${fullPath}`);
  
  if (exists) {
    const result = dotenv.config({ path: fullPath });
    if (!result.error) {
      console.log(`\n✓ Loaded env from: ${fullPath}`);
      loadedEnv = true;
      loadedPath = fullPath;
      
      // Debug: show which keys were loaded (without values)
      if (result.parsed) {
        const keys = Object.keys(result.parsed);
        console.log(`  Found ${keys.length} variables: ${keys.join(", ")}`);
        
        // Show any SUPABASE-related keys to help debug
        const supabaseKeys = keys.filter(k => k.toUpperCase().includes("SUPABASE"));
        if (supabaseKeys.length > 0) {
          console.log(`\n  🔍 SUPABASE-related keys found:`);
          supabaseKeys.forEach(k => {
            const hasValue = !!result.parsed![k];
            const valuePreview = hasValue 
              ? `${result.parsed![k].substring(0, 20)}... (${result.parsed![k].length} chars)`
              : "empty";
            console.log(`     ${k}: ${hasValue ? "✓" : "✗"} ${valuePreview}`);
          });
        }
      }
      break;
    } else {
      console.log(`  ⚠️  Error loading: ${result.error.message}`);
    }
  }
}

if (!loadedEnv) {
  console.warn("\n⚠️  No .env.local or .env file found. Using process.env (shell/system vars).");
} else {
  console.log("");
}

// Debug: show which vars are found (without exposing values)
// Try multiple possible names for the service role key (Supabase may use different names)
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
// Service role key should be long (similar to anon key length, ~200+ chars)
// SUPABASE_ACCESS_TOKEN is usually short (~40 chars) and is NOT the service role key
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_SECRET ||
  process.env.SUPABASE_PROJECT_REF_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

console.log("\n📋 Environment check:");
console.log(
  `  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "✓ set" : "✗ missing"}`
);
console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? "✓ set" : "✗ missing"}`);
console.log(
  `  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ set" : "✗ missing"}`
);
console.log(
  `  SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? "✓ set" : "✗ missing"}`
);
console.log(
  `  SUPABASE_SECRET_KEY: ${process.env.SUPABASE_SECRET_KEY ? "✓ set" : "✗ missing"}`
);
console.log(
  `  SUPABASE_ACCESS_TOKEN: ${process.env.SUPABASE_ACCESS_TOKEN ? "✓ set (note: this is NOT the service role key)" : "✗ missing"}`
);
console.log(`  RESEND_API_KEY: ${resendApiKey ? "✓ set" : "✗ missing"}\n`);

// Debug: show all SUPABASE/RESEND related env vars (keys only, to help debug)
const allEnvKeys = Object.keys(process.env).filter(
  (k) => k.includes("SUPABASE") || k.includes("RESEND")
);
if (allEnvKeys.length > 0) {
  console.log("🔍 Found these SUPABASE/RESEND env vars:");
  allEnvKeys.forEach((k) => {
    const hasValue = !!process.env[k];
    const valueLength = process.env[k]?.length || 0;
    console.log(`  ${hasValue ? "✓" : "✗"} ${k} (${valueLength} chars)`);
  });
  console.log("");
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Missing required Supabase variables:\n" +
      "   - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL\n" +
      "   - Service role key (SUPABASE_SERVICE_ROLE_KEY or similar)\n\n" +
      "📝 How to find your service role key:\n" +
      "   1. Go to Supabase Dashboard → Your Project\n" +
      "   2. Settings → API (or Project Settings → API)\n" +
      "   3. Under 'Project API keys' or 'API Keys', find the 'service_role' key\n" +
      "   4. It should be long (~200+ characters, similar to your anon key)\n" +
      "   5. Click 'Reveal' or copy it\n\n" +
      "💡 Add to .env.local:\n" +
      "   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n\n" +
      "⚠️  Note: SUPABASE_ACCESS_TOKEN is NOT the service role key.\n" +
      "   The service role key is much longer and starts with 'eyJ' (JWT)."
  );
  process.exit(1);
}
if (!resendApiKey) {
  console.error(
    "❌ Missing RESEND_API_KEY\n\n" +
      "💡 Options:\n" +
      "   1. Add to .env.local: RESEND_API_KEY=re_...\n" +
      "   2. Export in shell: export RESEND_API_KEY=re_...\n" +
      "   3. Pass via command: RESEND_API_KEY=re_... npx tsx scripts/sync-email-templates-to-resend.ts"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const RESEND_TEMPLATES_URL = "https://api.resend.com/templates";

/** Convert {{var}} or {{{var}}} to Resend's {{{VAR}}} format, normalizing variable names to uppercase. */
function toResendVariables(s: string): string {
  if (!s || typeof s !== "string") return s;
  
  let result = s;
  
  // First: Convert all double braces {{var}} to triple braces {{{VAR}}}
  // Only match if it's a valid variable name (not already triple braces)
  result = result.replace(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}(?!\})/g, (match, varName) => {
    return `{{{${varName.toUpperCase()}}}}`;
  });
  
  // Second: Convert all triple braces {{{var}}} to uppercase {{{VAR}}}
  // Only convert if variable contains lowercase letters
  result = result.replace(/\{\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}\}/g, (match, varName) => {
    if (/[a-z]/.test(varName)) {
      return `{{{${varName.toUpperCase()}}}}`;
    }
    return match; // Already uppercase, don't touch
  });
  
  // Fix any malformed braces that might have been created
  // Replace 4+ opening braces with exactly 3
  result = result.replace(/\{\{+\{+/g, '{{{');
  // Replace 4+ closing braces with exactly 3
  result = result.replace(/\}+\}/g, (match) => {
    return match.length > 3 ? '}}}' : match;
  });
  
  return result;
}

/** Extract variable names from template content ({{VAR}} or {{{VAR}}} patterns) and normalize to uppercase. */
function extractVariablesFromContent(content: string): Set<string> {
  const vars = new Set<string>();
  if (!content || typeof content !== "string") return vars;
  
  // Match all variable patterns (content should already be converted to {{{VAR}}} format):
  // - {{{VAR}}} (triple braces - Resend format)
  // - {{VAR}} (double braces - legacy, should have been converted but catch it anyway)
  const patterns = [
    /\{\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}\}/g,  // {{{VAR}}}
    /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g,      // {{VAR}} (shouldn't exist after conversion, but catch it)
  ];
  
  for (const pattern of patterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        // Normalize to uppercase (Resend expects uppercase variable keys)
        const normalized = match[1].toUpperCase();
        vars.add(normalized);
      }
    }
  }
  
  return vars;
}

/** Build Resend variables array from template.variables and extracted from content (up to 20 keys).
 *  NOTE: subject and html_content should already be converted by toResendVariables before calling this function.
 */
function buildResendVariables(
  template: {
    variables?: Record<string, unknown>;
    subject?: string;  // Should already be converted to {{{VAR}}} format
    html_content?: string;  // Should already be converted to {{{VAR}}} format
  }
): { key: string; type: "string" | "number"; fallbackValue?: string }[] {
  // Extract variables from content (should already be in {{{VAR}}} format)
  const contentVars = new Set<string>();
  if (template.subject) {
    extractVariablesFromContent(template.subject).forEach((v) => contentVars.add(v));
  }
  if (template.html_content) {
    extractVariablesFromContent(template.html_content).forEach((v) => contentVars.add(v));
  }

  // Collect all unique keys (normalized to uppercase)
  const allKeys = new Map<string, { originalKey: string; value?: unknown }>();
  
  // Add variables from template.variables (normalize keys to uppercase)
  if (template.variables && typeof template.variables === "object") {
    Object.entries(template.variables).forEach(([k, v]) => {
      const normalized = k.toUpperCase();
      if (!allKeys.has(normalized)) {
        allKeys.set(normalized, { originalKey: k, value: v });
      }
    });
  }
  
  // Add variables extracted from content
  contentVars.forEach((v) => {
    const normalized = v.toUpperCase();
    if (!allKeys.has(normalized)) {
      allKeys.set(normalized, { originalKey: normalized });
    }
  });

  // Build array (limit to 20, ensure unique keys)
  const uniqueKeys = Array.from(allKeys.entries()).slice(0, 20);
  return uniqueKeys.map(([normalizedKey, { originalKey, value }]) => {
    const out: { key: string; type: "string" | "number"; fallbackValue?: string } = {
      key: normalizedKey,
      type: "string",
    };
    // Use fallback from template.variables if available
    if (value != null && typeof value !== "object") {
      out.fallbackValue = String(value);
      out.type = typeof value === "number" ? "number" : "string";
    }
    return out;
  });
}

/** List all existing templates in Resend. */
async function listResendTemplates(): Promise<{
  nameToId: Map<string, string>;
  allTemplates: Array<{ id: string; name: string; created_at?: string }>;
}> {
  const nameToId = new Map<string, string>();
  const allTemplates: Array<{ id: string; name: string; created_at?: string }> = [];
  
  try {
    const res = await fetch(RESEND_TEMPLATES_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      const body = await res.json();
      const templates = (body as { data?: Array<{ id: string; name: string; created_at?: string }> }).data || [];
      templates.forEach((t) => {
        if (t.name && t.id) {
          allTemplates.push(t);
          // Only set the first one we see (or we could keep the newest)
          if (!nameToId.has(t.name)) {
            nameToId.set(t.name, t.id);
          }
        }
      });
    }
  } catch (e) {
    console.warn(`⚠️  Could not list existing templates: ${e instanceof Error ? e.message : e}`);
  }
  
  return { nameToId, allTemplates };
}

/** Delete a template from Resend. */
async function deleteResendTemplate(templateId: string): Promise<void> {
  const res = await fetch(`${RESEND_TEMPLATES_URL}/${templateId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `Resend API ${res.status}: ${(body as { message?: string }).message || JSON.stringify(body)}`
    );
  }
}

/** Remove duplicate templates, keeping the first one found for each name. */
async function removeDuplicates(
  allTemplates: Array<{ id: string; name: string; created_at?: string }>
): Promise<number> {
  // Group by name
  const byName = new Map<string, Array<{ id: string; name: string; created_at?: string }>>();
  allTemplates.forEach((t) => {
    if (!byName.has(t.name)) {
      byName.set(t.name, []);
    }
    byName.get(t.name)!.push(t);
  });

  let deletedCount = 0;
  const duplicates: Array<{ name: string; ids: string[] }> = [];

  // Find duplicates (more than one template with same name)
  for (const [name, templates] of byName.entries()) {
    if (templates.length > 1) {
      // Sort by created_at if available (keep newest), otherwise keep first
      templates.sort((a, b) => {
        if (a.created_at && b.created_at) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return 0;
      });

      // Keep the first (newest if dates available), delete the rest
      const toKeep = templates[0];
      const toDelete = templates.slice(1);

      duplicates.push({ name, ids: toDelete.map((t) => t.id) });

      for (const template of toDelete) {
        try {
          await deleteResendTemplate(template.id);
          deletedCount++;
          console.log(`  🗑️  Deleted duplicate: ${name} (${template.id})`);
        } catch (e) {
          console.error(
            `  ❌ Failed to delete ${name} (${template.id}):`,
            e instanceof Error ? e.message : e
          );
        }
        // Small delay between deletes
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  }

  if (duplicates.length > 0) {
    console.log(`\n✅ Removed ${deletedCount} duplicate template(s). Kept the newest version of each.\n`);
  }

  return deletedCount;
}

/** Update an existing Resend template. */
async function updateResendTemplate(
  templateId: string,
  subject: string,
  html: string,
  variables: { key: string; type: "string" | "number"; fallbackValue?: string }[]
): Promise<{ id: string }> {
  // Final safety check: ensure ALL variables are uppercase before sending
  // Replace ALL triple-brace variables and uppercase them (regardless of current case)
  // This is the absolute final pass - it will uppercase everything
  let finalSubject = subject;
  let finalHtml = html;
  
  // Check for any lowercase variables before conversion
  const lowerBefore = (finalSubject + finalHtml).match(/\{\{\{([a-z_][a-z0-9_]*)\}\}\}/g);
  if (lowerBefore && lowerBefore.length > 0) {
    console.log(`  🔧 [updateResendTemplate] Final pass: Found ${lowerBefore.length} lowercase variable(s) before uppercasing: [${lowerBefore.slice(0, 3).join(", ")}${lowerBefore.length > 3 ? "..." : ""}]`);
  }
  
  // Uppercase ALL variables (single pass - only convert if contains lowercase to avoid double-conversion)
  let totalReplaced = 0;
  const beforeSubject = finalSubject;
  const beforeHtml = finalHtml;
  
  // Match triple braces and uppercase the variable name, but only if it contains lowercase letters
  finalSubject = finalSubject.replace(/\{\{\{([^}]+)\}\}\}/g, (match, varName) => {
    // Only replace if it contains lowercase letters (to avoid double-converting already-uppercase vars)
    if (/[a-z]/.test(varName)) {
      totalReplaced++;
      return `{{{${varName.trim().toUpperCase()}}}}`;
    }
    return match; // Already uppercase, don't touch it
  });
  finalHtml = finalHtml.replace(/\{\{\{([^}]+)\}\}\}/g, (match, varName) => {
    // Only replace if it contains lowercase letters (to avoid double-converting already-uppercase vars)
    if (/[a-z]/.test(varName)) {
      totalReplaced++;
      return `{{{${varName.trim().toUpperCase()}}}}`;
    }
    return match; // Already uppercase, don't touch it
  });
  
  if (totalReplaced > 0) {
    console.log(`  🔧 [updateResendTemplate] Uppercased ${totalReplaced} variable(s) in final pass`);
  }
  
  // Fix any malformed braces (too many opening or closing braces)
  // Replace any sequence of 4+ opening braces with exactly 3
  const malformedOpen = (finalSubject + finalHtml).match(/\{\{+\{+/g);
  if (malformedOpen) {
    finalSubject = finalSubject.replace(/\{\{+\{+/g, '{{{');
    finalHtml = finalHtml.replace(/\{\{+\{+/g, '{{{');
    console.log(`  🔧 [updateResendTemplate] Fixed ${malformedOpen.length} malformed opening brace sequence(s)`);
  }
  
  // Replace any sequence of 4+ closing braces with exactly 3
  const malformedClose = (finalSubject + finalHtml).match(/\}+\}/g);
  if (malformedClose) {
    finalSubject = finalSubject.replace(/\}+\}/g, (match) => {
      return match.length > 3 ? '}}}' : match;
    });
    finalHtml = finalHtml.replace(/\}+\}/g, (match) => {
      return match.length > 3 ? '}}}' : match;
    });
    console.log(`  🔧 [updateResendTemplate] Fixed ${malformedClose.length} malformed closing brace sequence(s)`);
  }
  
  // Verify no lowercase variables remain
  const lowerAfter = (finalSubject + finalHtml).match(/\{\{\{([a-z_][a-z0-9_]*)\}\}\}/g);
  if (lowerAfter && lowerAfter.length > 0) {
    console.error(`  ⚠️  [updateResendTemplate] WARNING: Still found ${lowerAfter.length} lowercase variable(s) after final pass: [${lowerAfter.slice(0, 3).join(", ")}${lowerAfter.length > 3 ? "..." : ""}]`);
    // One more aggressive pass - uppercase EVERYTHING between triple braces
    finalSubject = finalSubject.replace(/\{\{\{([^}]+)\}\}\}/g, (match, varName) => {
      return `{{{${varName.trim().toUpperCase()}}}}`;
    });
    finalHtml = finalHtml.replace(/\{\{\{([^}]+)\}\}\}/g, (match, varName) => {
      return `{{{${varName.trim().toUpperCase()}}}}`;
    });
  }
  
  // Final verification - sample the HTML to see what we're actually sending
  const sampleMatch = finalHtml.match(/\{\{\{([^}]+)\}\}\}/);
  if (sampleMatch) {
    console.log(`  🔍 [updateResendTemplate] Sample variable in HTML being sent: {{{${sampleMatch[1]}}}}`);
  }
  
  const res = await fetch(`${RESEND_TEMPLATES_URL}/${templateId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: finalSubject || "No subject",
      html: finalHtml || "<p></p>",
      variables: variables.length ? variables : undefined,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Resend API ${res.status}: ${(body as { message?: string }).message || JSON.stringify(body)}`
    );
  }
  const id = (body as { id?: string }).id;
  if (!id) throw new Error("Resend update template response missing id");
  return { id };
}

/** Create a new Resend template. */
async function createResendTemplate(
  name: string,
  subject: string,
  html: string,
  variables: { key: string; type: "string" | "number"; fallbackValue?: string }[]
): Promise<{ id: string }> {
  // Final safety check: ensure ALL variables are uppercase before sending
  // Replace ALL triple-brace variables and uppercase them (regardless of current case)
  // This is the absolute final pass - it will uppercase everything
  let finalSubject = subject;
  let finalHtml = html;
  
  // Check for any lowercase variables before conversion
  const lowerBefore = (finalSubject + finalHtml).match(/\{\{\{([a-z_][a-z0-9_]*)\}\}\}/g);
  if (lowerBefore && lowerBefore.length > 0) {
    console.log(`  🔧 [createResendTemplate] Final pass: Found ${lowerBefore.length} lowercase variable(s) before uppercasing: [${lowerBefore.slice(0, 3).join(", ")}${lowerBefore.length > 3 ? "..." : ""}]`);
  }
  
  // Uppercase ALL variables (single pass - only convert if contains lowercase to avoid double-conversion)
  let totalReplaced = 0;
  const beforeSubject = finalSubject;
  const beforeHtml = finalHtml;
  
  // Match triple braces and uppercase the variable name, but only if it contains lowercase letters
  finalSubject = finalSubject.replace(/\{\{\{([^}]+)\}\}\}/g, (match, varName) => {
    // Only replace if it contains lowercase letters (to avoid double-converting already-uppercase vars)
    if (/[a-z]/.test(varName)) {
      totalReplaced++;
      return `{{{${varName.trim().toUpperCase()}}}}`;
    }
    return match; // Already uppercase, don't touch it
  });
  finalHtml = finalHtml.replace(/\{\{\{([^}]+)\}\}\}/g, (match, varName) => {
    // Only replace if it contains lowercase letters (to avoid double-converting already-uppercase vars)
    if (/[a-z]/.test(varName)) {
      totalReplaced++;
      return `{{{${varName.trim().toUpperCase()}}}}`;
    }
    return match; // Already uppercase, don't touch it
  });
  
  if (totalReplaced > 0) {
    console.log(`  🔧 [createResendTemplate] Uppercased ${totalReplaced} variable(s) in final pass`);
  }
  
  // Fix any malformed braces (too many opening or closing braces)
  // Replace any sequence of 4+ opening braces with exactly 3
  const malformedOpen = (finalSubject + finalHtml).match(/\{\{+\{+/g);
  if (malformedOpen) {
    finalSubject = finalSubject.replace(/\{\{+\{+/g, '{{{');
    finalHtml = finalHtml.replace(/\{\{+\{+/g, '{{{');
    console.log(`  🔧 [createResendTemplate] Fixed ${malformedOpen.length} malformed opening brace sequence(s)`);
  }
  
  // Replace any sequence of 4+ closing braces with exactly 3
  const malformedClose = (finalSubject + finalHtml).match(/\}+\}/g);
  if (malformedClose) {
    finalSubject = finalSubject.replace(/\}+\}/g, (match) => {
      return match.length > 3 ? '}}}' : match;
    });
    finalHtml = finalHtml.replace(/\}+\}/g, (match) => {
      return match.length > 3 ? '}}}' : match;
    });
    console.log(`  🔧 [createResendTemplate] Fixed ${malformedClose.length} malformed closing brace sequence(s)`);
  }
  
  // Verify no lowercase variables remain
  const lowerAfter = (finalSubject + finalHtml).match(/\{\{\{([a-z_][a-z0-9_]*)\}\}\}/g);
  if (lowerAfter && lowerAfter.length > 0) {
    console.error(`  ⚠️  [createResendTemplate] WARNING: Still found ${lowerAfter.length} lowercase variable(s) after final pass: [${lowerAfter.slice(0, 3).join(", ")}${lowerAfter.length > 3 ? "..." : ""}]`);
    // One more aggressive pass - uppercase EVERYTHING between triple braces
    finalSubject = finalSubject.replace(/\{\{\{([^}]+)\}\}\}/g, (match, varName) => {
      return `{{{${varName.trim().toUpperCase()}}}}`;
    });
    finalHtml = finalHtml.replace(/\{\{\{([^}]+)\}\}\}/g, (match, varName) => {
      return `{{{${varName.trim().toUpperCase()}}}}`;
    });
  }
  
  // Final verification - sample the HTML to see what we're actually sending
  const sampleMatch = finalHtml.match(/\{\{\{([^}]+)\}\}\}/);
  if (sampleMatch) {
    console.log(`  🔍 [createResendTemplate] Sample variable in HTML being sent: {{{${sampleMatch[1]}}}}`);
  }
  
  const res = await fetch(RESEND_TEMPLATES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      subject: finalSubject || "No subject",
      html: finalHtml || "<p></p>",
      variables: variables.length ? variables : undefined,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Resend API ${res.status}: ${(body as { message?: string }).message || JSON.stringify(body)}`
    );
  }
  const id = (body as { id?: string }).id;
  if (!id) throw new Error("Resend create template response missing id");
  return { id };
}

async function main() {
  console.log("Fetching email_templates from Supabase...\n");

  const { data: rows, error } = await supabase
    .from("email_templates")
    .select("type, language, name, subject, html_content, variables")
    .eq("is_active", true)
    .neq("type", "promotional") // Exclude promotional templates (using Mailerlite for newsletters)
    .order("type")
    .order("language");

  if (error) {
    console.error("Supabase error:", error);
    process.exit(1);
  }
  if (!rows?.length) {
    console.log("No active email_templates found.");
    process.exit(0);
  }

  console.log("📋 Checking for existing templates in Resend...\n");
  const { nameToId: existingTemplates } = await listResendTemplates();
  
  if (existingTemplates.size > 0) {
    console.log(`  Found ${existingTemplates.size} existing template(s). Will update if exists, create if new.\n`);
  } else {
    console.log("  No existing templates found. Will create new ones.\n");
  }

  const mapping: Record<string, string> = {};

  for (let i = 0; i < rows.length; i++) {
    const t = rows[i] as {
      type: string;
      language: string;
      name?: string;
      subject?: string;
      html_content?: string;
      variables?: Record<string, unknown>;
    };
    const key = `${t.type}_${t.language}`;
    
    // Convert HTML/subject first to normalize variables
    let convertedSubject = toResendVariables(t.subject || "");
    let convertedHtml = toResendVariables(t.html_content || "");
    
    // Safety check: catch any remaining lowercase triple braces and fix them
    // This handles edge cases where the regex might have missed something
    // Use case-insensitive flag to catch everything
    const lowercaseVarPattern = /\{\{\{([a-z_][a-z0-9_]*)\}\}\}/gi;
    let fixedCount = 0;
    let previousHtml = convertedHtml;
    let previousSubject = convertedSubject;
    
    // Keep fixing until no more changes (multiple passes)
    for (let pass = 0; pass < 5; pass++) {
      convertedHtml = convertedHtml.replace(lowercaseVarPattern, (match, varName) => {
        fixedCount++;
        return `{{{${varName.toUpperCase()}}}}`;
      });
      convertedSubject = convertedSubject.replace(lowercaseVarPattern, (match, varName) => {
        fixedCount++;
        return `{{{${varName.toUpperCase()}}}}`;
      });
      
      // If no changes, break early
      if (convertedHtml === previousHtml && convertedSubject === previousSubject) {
        break;
      }
      previousHtml = convertedHtml;
      previousSubject = convertedSubject;
    }
    
    if (fixedCount > 0) {
      console.log(`  🔧 ${key}: Fixed ${fixedCount} lowercase variable(s) in HTML/subject`);
    }
    
    // Final verification: ensure NO lowercase variables remain
    // Check for lowercase variables (case-sensitive check)
    const finalCheck = /\{\{\{([a-z_][a-z0-9_]*)\}\}\}/g;
    const remainingLowercase = [
      ...convertedHtml.matchAll(finalCheck),
      ...convertedSubject.matchAll(finalCheck)
    ];
    if (remainingLowercase.length > 0) {
      const vars = [...new Set(remainingLowercase.map(m => m[1]))];
      console.error(`  ⚠️  ${key}: WARNING - Still found lowercase variables after all conversions: [${vars.join(", ")}]`);
      // Force fix one more time - replace ALL triple-brace variables and uppercase them
      convertedHtml = convertedHtml.replace(/\{\{\{([^}]+)\}\}\}/g, (match, varName) => {
        // Always uppercase, regardless of current case
        return `{{{${varName.toUpperCase()}}}}`;
      });
      convertedSubject = convertedSubject.replace(/\{\{\{([^}]+)\}\}\}/g, (match, varName) => {
        // Always uppercase, regardless of current case
        return `{{{${varName.toUpperCase()}}}}`;
      });
      console.log(`  🔧 ${key}: Force-uppercased all variables in final pass`);
    }
    
    // ALWAYS do a final pass to uppercase ALL variables (safety net)
    // This ensures that even if some variables are mixed case, they all become uppercase
    // But be careful - only match properly formatted triple braces to avoid double-conversion
    convertedHtml = convertedHtml.replace(/\{\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}\}/g, (match, varName) => {
      // Only convert if it contains lowercase letters
      if (/[a-z]/.test(varName)) {
        return `{{{${varName.toUpperCase()}}}}`;
      }
      return match; // Already uppercase
    });
    convertedSubject = convertedSubject.replace(/\{\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}\}/g, (match, varName) => {
      // Only convert if it contains lowercase letters
      if (/[a-z]/.test(varName)) {
        return `{{{${varName.toUpperCase()}}}}`;
      }
      return match; // Already uppercase
    });
    
    // Fix any malformed braces (too many closing braces or opening braces)
    // Replace any sequence of 4+ closing braces with exactly 3
    convertedHtml = convertedHtml.replace(/\}+\}/g, (match) => {
      if (match.length > 3) {
        return '}}}';
      }
      return match;
    });
    convertedSubject = convertedSubject.replace(/\}+\}/g, (match) => {
      if (match.length > 3) {
        return '}}}';
      }
      return match;
    });
    
    // Replace any sequence of 4+ opening braces with exactly 3
    convertedHtml = convertedHtml.replace(/\{\{+\{+/g, '{{{');
    convertedSubject = convertedSubject.replace(/\{\{+\{+/g, '{{{');
    
    // Build variables from converted content
    const variables = buildResendVariables({
      variables: t.variables,
      subject: convertedSubject,
      html_content: convertedHtml,
    });

    // Final verification: ensure all variables in HTML/subject are in the variables array
    const htmlVars = extractVariablesFromContent(convertedHtml);
    const subjectVars = extractVariablesFromContent(convertedSubject);
    const allHtmlVars = new Set([...htmlVars, ...subjectVars]);
    const variableKeys = new Set(variables.map(v => v.key));
    
    // Check for any missing variables
    const missingVars = Array.from(allHtmlVars).filter(v => !variableKeys.has(v));
    if (missingVars.length > 0) {
      console.error(`  ⚠️  ${key}: Variables found in HTML but not in array: [${missingVars.join(", ")}]`);
      // Add missing variables to the array
      missingVars.forEach(v => {
        variables.push({ key: v, type: "string" });
      });
      console.log(`  ➕ ${key}: Added ${missingVars.length} missing variable(s) to array`);
    }

    // Debug: show variables being sent (first 5 keys only)
    const varKeys = variables.map(v => v.key).slice(0, 5);
    if (varKeys.length > 0) {
      console.log(`  📝 ${key}: variables [${varKeys.join(", ")}${variables.length > 5 ? `, ... (${variables.length} total)` : ""}]`);
    }

    try {
      let id: string;
      const existingId = existingTemplates.get(key);
      
      if (existingId) {
        // Update existing template
        try {
          const result = await updateResendTemplate(
            existingId,
            convertedSubject,
            convertedHtml,
            variables
          );
          id = result.id;
          console.log(`  🔄 ${key} → ${id} (updated)`);
        } catch (updateError) {
          // If update fails, try to create new (might be a different error)
          const errorMsg = updateError instanceof Error ? updateError.message : String(updateError);
          console.log(`  ⚠️  ${key}: Update failed (${errorMsg}), trying to create new...`);
          const result = await createResendTemplate(
            key,
            convertedSubject,
            convertedHtml,
            variables
          );
          id = result.id;
          console.log(`  ✅ ${key} → ${id} (created new)`);
        }
      } else {
        // Create new template
        const result = await createResendTemplate(
          key,
          convertedSubject,
          convertedHtml,
          variables
        );
        id = result.id;
        console.log(`  ✅ ${key} → ${id} (created)`);
      }
      
      mapping[key] = id;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`  ❌ ${key}:`, errorMsg);
      if (errorMsg.includes("Variable") && errorMsg.includes("not defined")) {
        const missingVar = errorMsg.match(/Variable '([^']+)'/)?.[1];
        if (missingVar) {
          console.error(`     💡 Variable '${missingVar}' found in HTML but not in variables array.`);
          console.error(`     📋 Variables being sent: [${variables.map(v => v.key).join(", ")}]`);
          // Debug: show what variables are actually in the HTML
          const htmlVars = extractVariablesFromContent(convertedHtml);
          const subjectVars = extractVariablesFromContent(convertedSubject);
          const allHtmlVars = [...new Set([...htmlVars, ...subjectVars])];
          console.error(`     🔍 Variables found in HTML/subject: [${allHtmlVars.join(", ")}]`);
          // Check if missingVar (lowercase) matches any uppercase var
          const missingVarUpper = missingVar.toUpperCase();
          if (allHtmlVars.includes(missingVarUpper)) {
            console.error(`     ⚠️  Variable exists as '${missingVarUpper}' (uppercase) but Resend sees '${missingVar}' (lowercase) - conversion failed!`);
            // Try to find where it is in the HTML - check for actual lowercase (case-sensitive)
            const htmlMatchLower = convertedHtml.match(new RegExp(`\\{\\{\\{${missingVar}\\}\\}\\}`));
            const subjectMatchLower = convertedSubject.match(new RegExp(`\\{\\{\\{${missingVar}\\}\\}\\}`));
            if (htmlMatchLower || subjectMatchLower) {
              console.error(`     🔴 Found actual lowercase '${missingVar}' still in HTML/subject!`);
              // Show a sample of where it appears
              const sample = (htmlMatchLower?.[0] || subjectMatchLower?.[0] || '').substring(0, 50);
              console.error(`     📄 Sample: ${sample}...`);
            } else {
              console.error(`     💡 Note: No lowercase '${missingVar}' found in converted HTML - Resend may be using cached template`);
              console.error(`     💡 Suggestion: Try deleting and recreating the template in Resend dashboard`);
            }
          }
        }
      }
    }

    // Rate limit: Resend allows 2 requests per second, so wait 600ms between requests
    if (i < rows.length - 1) {
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  console.log("\n--- RESEND_TEMPLATE_IDS (set as Edge Function secret) ---\n");
  console.log(JSON.stringify(mapping, null, 2));
  console.log("\n--- Next: publish each template in Resend dashboard, then set RESEND_TEMPLATE_IDS and deploy Edge Functions. ---\n");
}

main();
