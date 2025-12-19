import { loadStripe } from "@stripe/stripe-js";

// Use live keys in production, test keys in development
const isProduction = process.env.NODE_ENV === "production";
const publishableKey = isProduction
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
