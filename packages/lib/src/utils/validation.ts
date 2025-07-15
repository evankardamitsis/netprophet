import { z } from 'zod';

export const predictionSchema = z.object({
  match_id: z.string().uuid(),
  pick: z.enum(['player_a', 'player_b']),
  stake_points: z.number().min(1).max(100),
});

export const matchSchema = z.object({
  player_a: z.string().uuid(),
  player_b: z.string().uuid(),
  played_at: z.string().datetime(),
});

export const playerSchema = z.object({
  name: z.string().min(1).max(100),
  club_id: z.string().uuid().optional(),
});

export type PredictionInput = z.infer<typeof predictionSchema>;
export type MatchInput = z.infer<typeof matchSchema>;
export type PlayerInput = z.infer<typeof playerSchema>; 