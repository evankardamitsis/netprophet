import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Validate that the publishable key is set
if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable');
}
