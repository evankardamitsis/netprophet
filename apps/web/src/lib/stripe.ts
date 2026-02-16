import { loadStripe } from "@stripe/stripe-js";

// Use live keys when: (a) NODE_ENV is production, OR (b) explicit NEXT_PUBLIC_STRIPE_USE_LIVE=true
// Must match create-checkout-session and webhook so Stripe.js and Checkout Session use same mode
const useLiveKeys =
  process.env.NEXT_PUBLIC_STRIPE_USE_LIVE === "true" ||
  process.env.NODE_ENV === "production";

const getPublishableKey = (): string => {
  if (useLiveKeys) {
    const liveKey =
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE ||
      (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_live_")
        ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        : null);
    if (!liveKey || liveKey.startsWith("pk_test_")) {
      throw new Error(
        "Production/live mode requires a live Stripe publishable key (pk_live_...). " +
          "Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE in your production environment."
      );
    }
    return liveKey;
  }
  return (
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
  );
};

const publishableKey = getPublishableKey();

if (!publishableKey) {
  throw new Error("Missing Stripe publishable key environment variable");
}

export const stripePromise = loadStripe(publishableKey);
