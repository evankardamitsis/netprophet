import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user's session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { matchIds } = await req.json()
    
    if (!matchIds || !Array.isArray(matchIds) || matchIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'matchIds array is required and must not be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get selected matches with full details
    const { data: matches, error: matchesError } = await supabaseClient
      .from('matches')
      .select(`
        id,
        tournament_id,
        category_id,
        player_a_id,
        player_b_id,
        winner_id,
        status,
        start_time,
        lock_time,
        odds_a,
        odds_b,
        tournaments (
          id,
          name,
          surface,
          location,
          start_date,
          end_date,
          status
        ),
        tournament_categories (
          id,
          name
        ),
        player_a:players!matches_player_a_id_fkey (
          id,
          first_name,
          last_name,
          ntrp_rating,
          surface_preference,
          wins,
          losses,
          last5,
          current_streak,
          streak_type,
          age,
          hand,
          notes
        ),
        player_b:players!matches_player_b_id_fkey (
          id,
          first_name,
          last_name,
          ntrp_rating,
          surface_preference,
          wins,
          losses,
          last5,
          current_streak,
          streak_type,
          age,
          hand,
          notes
        ),
        winner:players!matches_winner_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .in('id', matchIds)
      .order('start_time', { ascending: true })

    if (matchesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch matches', details: matchesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the web_synced flag for the synced matches
    const { error: updateError } = await supabaseClient
      .from('matches')
      .update({ web_synced: true })
      .in('id', matchIds)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update sync status', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update web app cache or trigger web app refresh
    // For now, we'll return the matches data and let the web app handle the sync
    const syncResult = {
      success: true,
      matchIds,
      matchesCount: matches?.length || 0,
      matches: matches || [],
      timestamp: new Date().toISOString(),
      message: `Successfully synced ${matches?.length || 0} selected matches`
    }

    return new Response(
      JSON.stringify(syncResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
