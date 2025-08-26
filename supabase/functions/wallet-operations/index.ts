/* eslint-disable */
// @ts-nocheck
// Deno runtime imports - these are valid in Deno environment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Daily rewards constants - centralized configuration
const DAILY_REWARDS_CONSTANTS = {
  // Daily login reward (given every day)
  DAILY_LOGIN_REWARD: 30,
  
  // Welcome bonus (given only once to new users)
  WELCOME_BONUS: 100,
  
  // 7-day streak bonus (given every 7th consecutive day)
  SEVEN_DAY_STREAK_BONUS: 100,
  
  // Streak milestone interval (every X days)
  STREAK_MILESTONE_INTERVAL: 7,
} as const;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Function called with method:', req.method, 'and URL:', req.url)
  
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

    console.log('Processing request:', { method, action, userId: user.id })

    if (method === 'POST') {
      let body = null;
      // Only parse body for actions that need it
      if (
        action === 'place_bet' ||
        action === 'add_referral_bonus' ||
        action === 'add_leaderboard_prize' ||
        action === 'purchase_item' ||
        action === 'enter_tournament' ||
        action === 'unlock_insight' ||
        action === 'record_win' ||
        action === 'record_loss'
      ) {
        body = await req.json();
      }

      switch (action) {
        case 'place_bet':
          return await handlePlaceBet(supabase, user, body)
        
        case 'claim_welcome_bonus':
          console.log('Handling claim_welcome_bonus for user:', user.id)
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
    console.log('Error in main function:', error)
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

  console.log('Place bet request:', { user: user.id, amount, matchId, description })

  // Validate bet amount
  if (amount < 10 || amount > 1000) {
    throw new Error('Invalid bet amount')
  }

  // Check user balance
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single()

  console.log('Profile query result:', { profile, error: profileError })

  if (profileError) {
    console.error('Profile query error:', profileError)
    throw new Error(`Failed to load profile: ${profileError.message}`)
  }

  if (!profile) {
    console.log('No profile found, creating one with default balance')
    // Create profile with 0 balance - users get welcome bonus instead
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        balance: 0,
        daily_login_streak: 0,
        has_received_welcome_bonus: false,
        total_winnings: 0,
        total_losses: 0,
        won_bets: 0,
        lost_bets: 0,
        total_bets: 0,
        referral_bonus_earned: 0,
        leaderboard_prizes_earned: 0
      })
      .select('balance')
      .single()

    if (createError) {
      console.error('Failed to create profile:', createError)
      throw new Error(`Failed to create profile: ${createError.message}`)
    }

    console.log('Created new profile:', newProfile)
    
    if (newProfile.balance < amount) {
      throw new Error(`Insufficient balance: ${newProfile.balance} < ${amount}`)
    }
  } else {
    console.log('Existing profile balance:', profile.balance)
    
    if (profile.balance < amount) {
      throw new Error(`Insufficient balance: ${profile.balance} < ${amount}`)
    }
  }

  // Update balance and create transaction
  const currentBalance = profile ? profile.balance : 0
  const newBalance = currentBalance - amount
  
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ balance: newBalance })
    .eq('id', user.id)

  if (updateError) {
    console.error('Balance update error:', updateError)
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

  // Get updated balance
  const { data: updatedProfile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single()

  return new Response(
    JSON.stringify({
      success: true,
      data: { newBalance: updatedProfile?.balance || 0 }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handleClaimWelcomeBonus(supabase: any, user: any) {
  console.log('handleClaimWelcomeBonus called for user:', user.id)
      const bonus = DAILY_REWARDS_CONSTANTS.WELCOME_BONUS // Use centralized constant

  try {
    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance, has_received_welcome_bonus')
      .eq('id', user.id)
      .single()

    console.log('Profile query result:', { profile, error: profileError })

    if (profileError) {
      console.log('Profile error:', profileError)
      throw new Error(`Failed to load profile: ${profileError.message}`)
    }

    if (!profile) {
      console.log('Profile not found')
      throw new Error('Profile not found')
    }

    if (profile.has_received_welcome_bonus) {
      console.log('Welcome bonus already claimed via profile flag')
      throw new Error('Welcome bonus already claimed')
    }

    const currentBalance = profile.balance || 0
    const newBalance = currentBalance + bonus

    console.log('Updating balance:', { currentBalance, newBalance })

    // Update balance and create transaction
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        balance: newBalance,
        has_received_welcome_bonus: true
      })
      .eq('id', user.id)

    if (updateError) {
      console.log('Update error:', updateError)
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

    console.log('Welcome bonus claimed successfully, returning response')
    return new Response(
      JSON.stringify({
        success: true,
        data: { newBalance }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.log('Error in handleClaimWelcomeBonus:', error)
    throw error
  }
}

async function handleAddReferralBonus(supabase: any, user: any, body: any) {
  const { amount } = body

  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('balance, referral_bonus_earned')
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw new Error(`Failed to load profile: ${profileError.message}`)
  }

  const currentBalance = profile?.balance || 0
  const currentReferralBonus = profile?.referral_bonus_earned || 0
  const newBalance = currentBalance + amount
  const newReferralBonus = currentReferralBonus + amount

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      balance: newBalance,
      referral_bonus_earned: newReferralBonus
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
      type: 'referral_bonus',
      amount: amount,
      description: 'Referral bonus'
    })

  if (transactionError) {
    console.error('Failed to record transaction:', transactionError)
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { newBalance }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handleAddLeaderboardPrize(supabase: any, user: any, body: any) {
  const { amount } = body

  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('balance, leaderboard_prizes_earned')
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw new Error(`Failed to load profile: ${profileError.message}`)
  }

  const currentBalance = profile?.balance || 0
  const currentLeaderboardPrizes = profile?.leaderboard_prizes_earned || 0
  const newBalance = currentBalance + amount
  const newLeaderboardPrizes = currentLeaderboardPrizes + amount

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      balance: newBalance,
      leaderboard_prizes_earned: newLeaderboardPrizes
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
      type: 'leaderboard_prize',
      amount: amount,
      description: 'Leaderboard prize'
    })

  if (transactionError) {
    console.error('Failed to record transaction:', transactionError)
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { newBalance }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handlePurchaseItem(supabase: any, user: any, body: any) {
  const { cost, itemName } = body

  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw new Error(`Failed to load profile: ${profileError.message}`)
  }

  const currentBalance = profile?.balance || 0

  if (currentBalance < cost) {
    throw new Error('Insufficient balance')
  }

  const newBalance = currentBalance - cost

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ balance: newBalance })
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
      description: `Purchase: ${itemName}`
    })

  if (transactionError) {
    console.error('Failed to record transaction:', transactionError)
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { newBalance }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handleEnterTournament(supabase: any, user: any, body: any) {
  const { cost, tournamentName } = body

  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw new Error(`Failed to load profile: ${profileError.message}`)
  }

  const currentBalance = profile?.balance || 0

  if (currentBalance < cost) {
    throw new Error('Insufficient balance')
  }

  const newBalance = currentBalance - cost

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ balance: newBalance })
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
      data: { newBalance }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handleUnlockInsight(supabase: any, user: any, body: any) {
  const { cost, insightName } = body

  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw new Error(`Failed to load profile: ${profileError.message}`)
  }

  const currentBalance = profile?.balance || 0

  if (currentBalance < cost) {
    throw new Error('Insufficient balance')
  }

  const newBalance = currentBalance - cost

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ balance: newBalance })
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
      description: `Insight unlock: ${insightName}`
    })

  if (transactionError) {
    console.error('Failed to record transaction:', transactionError)
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { newBalance }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handleRecordWin(supabase: any, user: any, body: any) {
  const { stake, odds, description } = body
  const winnings = Math.floor(stake * odds)

  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('balance, total_winnings, won_bets')
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw new Error(`Failed to load profile: ${profileError.message}`)
  }

  const currentBalance = profile?.balance || 0
  const currentTotalWinnings = profile?.total_winnings || 0
  const currentWonBets = profile?.won_bets || 0
  const newBalance = currentBalance + winnings
  const newTotalWinnings = currentTotalWinnings + winnings
  const newWonBets = currentWonBets + 1

  // Update balance and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      balance: newBalance,
      total_winnings: newTotalWinnings,
      won_bets: newWonBets
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
      data: { newBalance, winnings }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function handleRecordLoss(supabase: any, user: any, body: any) {
  const { stake, description } = body

  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('total_losses, lost_bets')
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw new Error(`Failed to load profile: ${profileError.message}`)
  }

  const currentTotalLosses = profile?.total_losses || 0
  const currentLostBets = profile?.lost_bets || 0
  const newTotalLosses = currentTotalLosses + stake
  const newLostBets = currentLostBets + 1

  // Update statistics and create transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      total_losses: newTotalLosses,
      lost_bets: newLostBets
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
      data: { loss: stake }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
} 