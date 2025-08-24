import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: NextRequest) {
  try {
    const { packId, userId } = await request.json();

    // Validate required fields
    if (!packId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: packId and userId' },
        { status: 400 }
      );
    }

    // Define coin packs
    const coinPacks = {
      starter: { name: 'Starter Pack', price: 199, coins: 350 }, // €1.99 in cents
      basic: { name: 'Basic Pack', price: 499, coins: 950 }, // €4.99 in cents
      pro: { name: 'Pro Pack', price: 999, coins: 1950 }, // €9.99 in cents
      champion: { name: 'Champion Pack', price: 1999, coins: 3900 }, // €19.99 in cents
      legend: { name: 'Legend Pack', price: 3999, coins: 7700 }, // €39.99 in cents
    };

    const pack = coinPacks[packId as keyof typeof coinPacks];
    if (!pack) {
      return NextResponse.json(
        { error: 'Invalid pack ID' },
        { status: 400 }
      );
    }

    // Get user profile to verify they exist
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: pack.name,
              description: `${pack.coins} coins for NetProphet`,
            },
            unit_amount: pack.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/matches/rewards?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/matches/rewards?canceled=true`,
      metadata: {
        userId,
        packId,
        coins: pack.coins.toString(),
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
