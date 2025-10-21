import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { request } from "http";
// Using Supabase's built-in rate limiting instead of custom implementation

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export async function POST(request: NextRequest) {
  // Using Supabase's built-in rate limiting - no custom rate limiting needed

  try {
    const { packId, userId } = await request.json();

    // Validate required fields
    if (!packId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: packId and userId" },
        { status: 400 }
      );
    }

    // Define coin packs
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Get coin packs from database
    const coinPacksData = await supabase
      .from("coin_packs")
      .select("*")
      .eq("is_active", true)
      .order("price_euro", { ascending: true });

    if (coinPacksData.error) {
      console.error("Error fetching coin packs:", coinPacksData.error);
      return NextResponse.json(
        { error: "Failed to fetch coin packs" },
        { status: 500 }
      );
    }

    const coinPacks =
      coinPacksData.data?.reduce(
        (acc, pack) => {
          const totalCoins = pack.base_coins + pack.bonus_coins;
          const priceInCents = Math.round(pack.price_euro * 100);
          acc[pack.id] = {
            name: pack.name,
            price: priceInCents,
            coins: totalCoins,
          };
          return acc;
        },
        {} as Record<string, { name: string; price: number; coins: number }>
      ) || {};

    const pack = coinPacks[packId as keyof typeof coinPacks];
    if (!pack) {
      return NextResponse.json({ error: "Invalid pack ID" }, { status: 400 });
    }

    // Get user profile to verify they exist
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: pack.name,
              description: `${pack.coins} coins for NetProphet`,
              images: ["https://your-domain.com/coin-pack-image.png"], // Optional: Add product image
            },
            unit_amount: pack.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${request.nextUrl.origin}/en/matches/rewards?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/en/matches/rewards?canceled=true`,
      metadata: {
        userId,
        packId,
        coins: pack.coins.toString(),
      },
      // Customization options
      billing_address_collection: "auto", // or 'required'
      customer_email: profile.email, // Pre-fill customer email
      locale: "auto", // or 'en', 'es', 'fr', etc.
      submit_type: "pay", // Button text
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
