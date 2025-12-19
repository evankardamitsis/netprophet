import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

// Using Supabase's built-in rate limiting instead of custom implementation

// Use live keys in production, test keys in development
const isProduction = process.env.NODE_ENV === "production";
const stripeSecretKey = isProduction
  ? process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY!
  : process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY!;

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-07-30.basil",
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

// Use live webhook secret in production, test in development
const endpointSecret = isProduction
  ? process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET!
  : process.env.STRIPE_WEBHOOK_SECRET_TEST ||
    process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  // Using Supabase's built-in rate limiting - no custom rate limiting needed

  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Extract metadata
        const { userId, packId, coins } = session.metadata!;
        const coinsToAdd = parseInt(coins);

        if (!userId || !coinsToAdd) {
          console.error(
            "Missing required metadata in session:",
            session.metadata
          );
          return NextResponse.json(
            { error: "Missing metadata" },
            { status: 400 }
          );
        }

        if (!supabase) {
          console.error("Database not configured");
          return NextResponse.json(
            { error: "Database not configured" },
            { status: 500 }
          );
        }

        // Check if this session has already been processed (idempotency)
        const { data: existingTransaction } = await supabase
          .from("transactions")
          .select("id")
          .eq("stripe_session_id", session.id)
          .single();

        if (existingTransaction) {
          console.log(`Session ${session.id} already processed, skipping`);
          return NextResponse.json({ received: true });
        }

        // Add coins to user's balance
        const { error: updateError } = await supabase.rpc(
          "add_coins_to_balance",
          {
            user_uuid: userId,
            coins_to_add: coinsToAdd,
          }
        );

        if (updateError) {
          console.error("Error adding coins to balance:", updateError);
          return NextResponse.json(
            { error: "Failed to update balance" },
            { status: 500 }
          );
        }

        // Create transaction record
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            user_id: userId,
            type: "purchase",
            amount: coinsToAdd,
            description: `Purchased ${packId} pack`,
            stripe_session_id: session.id,
            status: "completed",
          });

        if (transactionError) {
          console.error("Error creating transaction record:", transactionError);
          // Don't fail the webhook if transaction record fails
        }

        console.log(`Successfully added ${coinsToAdd} coins to user ${userId}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment failed:", paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
