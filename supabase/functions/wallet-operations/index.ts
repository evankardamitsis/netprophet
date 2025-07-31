/* eslint-disable */
// @ts-nocheck
// Deno runtime imports - these are valid in Deno environment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid token')
    }

    const { method } = req
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (method === 'POST') {
      const body = await req.json()

      switch (action) {
        case 'place_bet':
          return await handlePlaceBet(supabase, user, body)
        
        case 'claim_welcome_bonus':
          return await handleClaimWelcomeBonus(supabase, user)
        
        case 'add_referral_bonus':
          return await handleAddReferralBonus(supabase, user, body)
        
        case 'add_leaderboard_prize':
          return await handleAddLeaderboardPrize(supabase, user, body)
        
        case 'purchase_item':
          return await handlePurchaseItem(supabase, user, body)
        
        case 'enter_tournament':
          return await handleEnterTournament(supabase, user, body)
        
        case 'unlock_insight':
          return await handleUnlockInsight(supabase, user, body)
        
        case 'record_win':
          return await handleRecordWin(supabase, user, body)
        
        case 'record_loss':
          return await handleRecordLoss(supabase, user, body)
        
        default:
          throw new Error('Invalid action')
      }
    }

    throw new Error('Invalid method')

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function handlePlaceBet(supabase: any, user: any, body: any) {
  const { amount, matchId, description } = body

  // Validate bet amount
  if (amount < 10 || amount > 1000) {
    throw new Error('Invalid bet amount')
  }

  // Check user balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single()

  if (!profile || profile.balance < amount) {
    throw new Error('Insufficient balance')
  }

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ balance: supabase.sql`balance - ${amount}` })
    .eq('id', user.id)

  if (updateError) {
    throw updateError
  }

  // Record transaction
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'bet',
      amount: -amount,
      description
    })

  if (transactionError) {
    console.error('Failed to record transaction:', transactionError)
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { newBalance: profile.balance - amount }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handleClaimWelcomeBonus(supabase: any, user: any) {
  const bonus = 250 // Welcome bonus amount

  // Check if already claimed
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', 'welcome_bonus')
    .single()

  if (existing) {
    throw new Error('Welcome bonus already claimed')
  }

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      balance: supabase.sql`balance + ${bonus}`,
      has_received_welcome_bonus: true
    })
    .eq('id', user.id)

  if (updateError) {
    throw updateError
  }

  // Record transaction
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'welcome_bonus',
      amount: bonus,
      description: 'Welcome bonus'
    })

  if (transactionError) {
    console.error('Failed to record transaction:', transactionError)
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { bonus }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handleAddReferralBonus(supabase: any, user: any, body: any) {
  const { amount } = body

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      balance: supabase.sql`balance + ${amount}`,
      referral_bonus_earned: supabase.sql`referral_bonus_earned + ${amount}`
    })
    .eq('id', user.id)

  if (updateError) {
    throw updateError
  }

  // Record transaction
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'referral',
      amount: amount,
      description: 'Referral bonus'
    })

  if (transactionError) {
    console.error('Failed to record transaction:', transactionError)
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { amount }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handleAddLeaderboardPrize(supabase: any, user: any, body: any) {
  const { amount } = body

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      balance: supabase.sql`balance + ${amount}`,
      leaderboard_prizes_earned: supabase.sql`leaderboard_prizes_earned + ${amount}`
    })
    .eq('id', user.id)

  if (updateError) {
    throw updateError
  }

  // Record transaction
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'leaderboard',
      amount: amount,
      description: 'Leaderboard prize'
    })

  if (transactionError) {
    console.error('Failed to record transaction:', transactionError)
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { amount }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handlePurchaseItem(supabase: any, user: any, body: any) {
  const { cost, itemName } = body

  // Check user balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single()

  if (!profile || profile.balance < cost) {
    throw new Error('Insufficient balance')
  }

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ balance: supabase.sql`balance - ${cost}` })
    .eq('id', user.id)

  if (updateError) {
    throw updateError
  }

  // Record transaction
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'purchase',
      amount: -cost,
      description: `Purchased ${itemName}`
    })

  if (transactionError) {
    console.error('Failed to record transaction:', transactionError)
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { newBalance: profile.balance - cost }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handleEnterTournament(supabase: any, user: any, body: any) {
  const { cost, tournamentName } = body

  // Check user balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single()

  if (!profile || profile.balance < cost) {
    throw new Error('Insufficient balance')
  }

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ balance: supabase.sql`balance - ${cost}` })
    .eq('id', user.id)

  if (updateError) {
    throw updateError
  }

  // Record transaction
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'tournament_entry',
      amount: -cost,
      description: `Tournament entry: ${tournamentName}`
    })

  if (transactionError) {
    console.error('Failed to record transaction:', transactionError)
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { newBalance: profile.balance - cost }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handleUnlockInsight(supabase: any, user: any, body: any) {
  const { cost, insightName } = body

  // Check user balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single()

  if (!profile || profile.balance < cost) {
    throw new Error('Insufficient balance')
  }

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ balance: supabase.sql`balance - ${cost}` })
    .eq('id', user.id)

  if (updateError) {
    throw updateError
  }

  // Record transaction
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'insight_unlock',
      amount: -cost,
      description: `Unlocked insight: ${insightName}`
    })

  if (transactionError) {
    console.error('Failed to record transaction:', transactionError)
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { newBalance: profile.balance - cost }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handleRecordWin(supabase: any, user: any, body: any) {
  const { stake, odds, description } = body
  const winnings = Math.round(stake * odds)

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      balance: supabase.sql`balance + ${winnings}`,
      total_winnings: supabase.sql`total_winnings + ${winnings}`,
      won_bets: supabase.sql`won_bets + 1`
    })
    .eq('id', user.id)

  if (updateError) {
    throw updateError
  }

  // Record transaction
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'win',
      amount: winnings,
      description
    })

  if (transactionError) {
    console.error('Failed to record transaction:', transactionError)
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { winnings }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handleRecordLoss(supabase: any, user: any, body: any) {
  const { stake, description } = body

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      total_losses: supabase.sql`total_losses + ${stake}`,
      lost_bets: supabase.sql`lost_bets + 1`
    })
    .eq('id', user.id)

  if (updateError) {
    throw updateError
  }

  // Record transaction
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'loss',
      amount: -stake,
      description
    })

  if (transactionError) {
    console.error('Failed to record transaction:', transactionError)
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { stake }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
} 