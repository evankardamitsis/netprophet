/**
 * Environment Variable Validation
 * Validates that all required environment variables are present at startup
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    description: "Supabase project URL",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    description: "Supabase anonymous key",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    description: "Supabase service role key (server-side only)",
  },
  {
    name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    required: true,
    description: "Stripe publishable key",
  },
  {
    name: "STRIPE_SECRET_KEY",
    required: true,
    description: "Stripe secret key (server-side only)",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    required: true,
    description: "Stripe webhook secret",
  },
  {
    name: "CRON_SECRET",
    required: false,
    description: "Secret for cron job authentication",
  },
  {
    name: "NEXT_PUBLIC_SITE_URL",
    required: false,
    description: "Site URL for redirects",
  },
  {
    name: "NEXT_PUBLIC_SENTRY_DSN",
    required: false,
    description: "Sentry DSN for error monitoring (recommended for production)",
  },
];

/**
 * Validate environment variables
 * Throws an error if required variables are missing
 */
export function validateEnvVars(): void {
  const missingVars: string[] = [];
  const warnings: string[] = [];

  ENV_VARS.forEach((envVar) => {
    const value = process.env[envVar.name];

    if (!value || value.trim() === "") {
      if (envVar.required) {
        missingVars.push(`${envVar.name} - ${envVar.description}`);
      } else {
        warnings.push(`${envVar.name} - ${envVar.description} (optional)`);
      }
    }
  });

  if (missingVars.length > 0) {
    const errorMessage = [
      "❌ Missing required environment variables:",
      "",
      ...missingVars.map((v) => `  • ${v}`),
      "",
      "Please check your .env file or environment configuration.",
      "See env.example for reference.",
    ].join("\n");

    throw new Error(errorMessage);
  }

  if (warnings.length > 0 && process.env.NODE_ENV === "development") {
    console.warn("⚠️  Optional environment variables not set:");
    warnings.forEach((w) => console.warn(`  • ${w}`));
  }

  if (process.env.NODE_ENV === "development") {
    console.log("✅ All required environment variables are present");
  }
}

/**
 * Get environment info for debugging (safe - doesn't expose secrets)
 */
export function getEnvInfo(): Record<string, boolean> {
  return ENV_VARS.reduce(
    (acc, envVar) => {
      acc[envVar.name] = !!process.env[envVar.name];
      return acc;
    },
    {} as Record<string, boolean>
  );
}
