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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get current time in Greece timezone (Europe/Athens)
    const now = new Date()
    const greeceTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Athens"}))
    
    console.log('Running match automation at:', greeceTime.toISOString())
    console.log('Local time:', now.toISOString())

    // Find matches that need status updates
    const { data: matchesToUpdate, error: matchesError } = await supabaseClient
      .from('matches')
      .select('id, status, start_time, lock_time, web_synced, locked')
      .in('status', ['upcoming'])
      .not('start_time', 'is', null)
      .order('start_time')

    if (matchesError) {
      console.error('Error fetching matches:', matchesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch matches' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const updates = {
      locked: [] as string[],
      live: [] as string[],
      errors: [] as string[]
    }

    for (const match of matchesToUpdate || []) {
      try {
        const startTime = new Date(match.start_time!)
        const lockTime = match.lock_time ? new Date(match.lock_time) : null
        
        // Check if match should be locked (lock time has passed)
        if (lockTime && greeceTime >= lockTime && match.status === 'upcoming' && !match.locked) {
          console.log(`Locking match ${match.id} - lock time: ${lockTime.toISOString()}`)
          
          const { error: lockError } = await supabaseClient
            .from('matches')
            .update({ 
              locked: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', match.id)
            .eq('status', 'upcoming')
            .eq('locked', false)

          if (lockError) {
            console.error(`Error locking match ${match.id}:`, lockError)
            updates.errors.push(`Failed to lock match ${match.id}: ${lockError.message}`)
          } else {
            updates.locked.push(match.id)
          }
        }

        // Check if match should go live (start time has passed)
        if (greeceTime >= startTime && match.status === 'upcoming') {
          console.log(`Making match ${match.id} live - start time: ${startTime.toISOString()}`)
          
          const { error: liveError } = await supabaseClient
            .from('matches')
            .update({ 
              status: 'live',
              updated_at: new Date().toISOString()
            })
            .eq('id', match.id)
            .eq('status', 'upcoming')

          if (liveError) {
            console.error(`Error making match ${match.id} live:`, liveError)
            updates.errors.push(`Failed to make match ${match.id} live: ${liveError.message}`)
          } else {
            updates.live.push(match.id)
          }
        }
      } catch (error) {
        console.error(`Error processing match ${match.id}:`, error)
        updates.errors.push(`Error processing match ${match.id}: ${error.message}`)
      }
    }

    // Log summary
    console.log('Match automation summary:', {
      totalMatches: matchesToUpdate?.length || 0,
      locked: updates.locked.length,
      live: updates.live.length,
      errors: updates.errors.length
    })

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: greeceTime.toISOString(),
        summary: {
          totalMatches: matchesToUpdate?.length || 0,
          locked: updates.locked.length,
          live: updates.live.length,
          errors: updates.errors.length
        },
        updates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Match automation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
