import { loadStripe } from "@stripe/stripe-js";

// Use live keys when: (a) NODE_ENV is production, OR (b) explicit NEXT_PUBLIC_STRIPE_USE_LIVE=true
// This ensures quick buy (low balance, wallet) uses the same Stripe env as production/admin setup
const useLiveKeys =
  process.env.NEXT_PUBLIC_STRIPE_USE_LIVE === "true" ||
  process.env.NODE_ENV === "production";
const publishableKey = useLiveKeys
  ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
  : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

// Initialize Stripe with your publishable key
export const stripePromise = loadStripe(publishableKey);

// Validate that the publishable key is set
if (!publishableKey) {
  throw new Error("Missing Stripe publishable key environment variable");
}
