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

    if (method === 'GET' && action === 'check') {
      // Check if user can claim daily reward
      const { data, error } = await supabase
        .rpc('can_claim_daily_reward', { user_uuid: user.id })

      if (error) {
        throw error
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: data[0]
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    if (method === 'POST' && action === 'claim') {
      // Claim daily reward
      const { data, error } = await supabase
        .rpc('claim_daily_reward', { user_uuid: user.id })

      if (error) {
        throw error
      }

      const result = data[0]
      
      if (result.success) {
        // Update user's wallet balance in the profiles table
        // First get current balance
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single()

        if (profileError) {
          throw profileError
        }

        const currentBalance = profileData.balance || 0
        const newBalance = currentBalance + result.reward_amount

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            balance: newBalance,
            daily_login_streak: result.new_streak
          })
          .eq('id', user.id)

        if (updateError) {
          throw updateError
        }

        // Add transaction record
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'daily_login',
            amount: result.reward_amount,
            description: `Daily login bonus (${result.new_streak} day streak)`
          })

        if (transactionError) {
          console.error('Failed to record transaction:', transactionError)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: result
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    throw new Error('Invalid action')

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