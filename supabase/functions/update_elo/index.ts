import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Match {
  id: string;
  player_a: string;
  player_b: string;
  a_score: number | null;
  b_score: number | null;
  processed: boolean;
}

interface Player {
  id: string;
  elo: number;
}

const K_FACTOR = 32; // Elo rating change factor

function calculateEloChange(winnerElo: number, loserElo: number): number {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  return Math.round(K_FACTOR * (1 - expectedWinner));
}

function calculateProbability(eloA: number, eloB: number): { probA: number; probB: number } {
  const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  const expectedB = 1 - expectedA;
  return {
    probA: Math.round(expectedA * 100) / 100,
    probB: Math.round(expectedB * 100) / 100,
  };
}

function calculatePoints(probA: number, probB: number): { pointsFav: number; pointsDog: number } {
  const fav = Math.max(probA, probB);
  const dog = Math.min(probA, probB);
  
  // Points system: favorite gets fewer points, underdog gets more
  const pointsFav = Math.round((1 - fav) * 50) + 10; // 10-60 points
  const pointsDog = Math.round(fav * 50) + 40; // 40-90 points
  
  return { pointsFav, pointsDog };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get unprocessed matches
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('id, player_a, player_b, a_score, b_score, processed')
      .eq('processed', false)
      .not('a_score', 'is', null)
      .not('b_score', 'is', null);

    if (matchesError) {
      throw new Error(`Error fetching matches: ${matchesError.message}`);
    }

    if (!matches || matches.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No unprocessed matches found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processedMatches = [];

    for (const match of matches) {
      // Get player Elo ratings
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, elo')
        .in('id', [match.player_a, match.player_b]);

      if (playersError) {
        console.error(`Error fetching players for match ${match.id}:`, playersError);
        continue;
      }

      if (!players || players.length !== 2) {
        console.error(`Invalid players data for match ${match.id}`);
        continue;
      }

      const playerA = players.find(p => p.id === match.player_a)!;
      const playerB = players.find(p => p.id === match.player_b)!;

      // Determine winner and loser
      const aWon = match.a_score! > match.b_score!;
      const winner = aWon ? playerA : playerB;
      const loser = aWon ? playerB : playerA;

      // Calculate Elo changes
      const eloChange = calculateEloChange(winner.elo, loser.elo);
      const newWinnerElo = winner.elo + eloChange;
      const newLoserElo = Math.max(loser.elo - eloChange, 100); // Minimum Elo of 100

      // Calculate probabilities and points
      const { probA, probB } = calculateProbability(newWinnerElo, newLoserElo);
      const { pointsFav, pointsDog } = calculatePoints(probA, probB);

      // Update players' Elo ratings
      await supabase
        .from('players')
        .update({ elo: newWinnerElo })
        .eq('id', winner.id);

      await supabase
        .from('players')
        .update({ elo: newLoserElo })
        .eq('id', loser.id);

      // Update match with probabilities, points, and mark as processed
      await supabase
        .from('matches')
        .update({
          prob_a: probA,
          prob_b: probB,
          points_fav: pointsFav,
          points_dog: pointsDog,
          processed: true,
        })
        .eq('id', match.id);

      processedMatches.push({
        matchId: match.id,
        winner: winner.id,
        loser: loser.id,
        eloChange,
        newWinnerElo,
        newLoserElo,
        probA,
        probB,
        pointsFav,
        pointsDog,
      });
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${processedMatches.length} matches`,
        processedMatches,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update_elo function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 