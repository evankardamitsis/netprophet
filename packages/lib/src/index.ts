// Types
export type { Database } from './types/database';
export type { Player } from './types/player';

// Supabase
export { supabase } from './supabase/client';
export type { SupabaseClient } from './supabase/client';

// Services
export { BetsService } from './supabase/bets';
export type { CreateBetData, CreateParlayBetData, BetWithMatch } from './supabase/bets';
export { DailyRewardsService } from './supabase/dailyRewards';
export type { DailyRewardStatus, DailyRewardClaim } from './supabase/dailyRewards';
export { WalletOperationsService } from './supabase/walletOperations';
export type { WalletOperationResult } from './supabase/walletOperations';

// Stores
export { useAuthStore } from './store/auth';

// Utilities
export * from './utils/validation';

// Odds Calculation
export * from './odds/calculateOdds';
export * from './odds/parlayCalculations';
export type { PlayerOddsData, MatchContext, OddsResult, H2HRecordInput } from './odds/calculateOdds'; 

// Tournament management
export * from './supabase/tournaments';

// Enhanced match management
export * from './supabase/matches'; 

export { MatchResultsService } from './supabase/matchResults';
export type { MatchResultWithDetails } from './supabase/matchResults';
export { NotificationsService } from './supabase/notifications';
export type { NotificationWithData } from './supabase/notifications';
export { TransactionsService } from './supabase/transactions';
export type { TransactionWithDetails } from './supabase/transactions';
export { ProfilesService } from './supabase/profiles';
export type { Profile } from './supabase/profiles';

// Player management
export { fetchPlayers, fetchPlayerById, insertPlayer, bulkInsertPlayers, updatePlayer, deletePlayer } from './supabase/players';

// Match Status Constants
export { MATCH_STATUSES, MATCH_STATUS_OPTIONS, getMatchStatusLabel, isActiveStatus, isFinishedStatus, type MatchStatus } from './constants/matchStatuses'; 