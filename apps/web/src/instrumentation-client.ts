// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";
const isExplicitlyEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // In development, avoid heavy client integrations to reduce hook latency
  integrations:
    isProd || isExplicitlyEnabled ? [Sentry.replayIntegration()] : [],

  // Performance Tracing
  tracesSampleRate: isProd ? 0.1 : 0,

  // Session Replay
  replaysSessionSampleRate: isProd ? 0.1 : 0,
  replaysOnErrorSampleRate: isProd ? 1.0 : 0,

  // Only enable in production or when explicitly set
  enabled: isProd || isExplicitlyEnabled,

  // Debug off by default
  debug: false,
});

// Avoid extra work in dev; export a no-op so the hook is present but cheap
export const onRouterTransitionStart =
  isProd || isExplicitlyEnabled
    ? Sentry.captureRouterTransitionStart
    : () => {};
