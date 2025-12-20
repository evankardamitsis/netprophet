// Types
export type { Database } from "./types/database";
export type { Player } from "./types/player";

// Supabase
export { supabase } from "./supabase/client";

// Services
export { BetsService } from "./supabase/bets";
export type { CreateBetData, CreateParlayBetData } from "./supabase/bets";
export { DailyRewardsService } from "./supabase/dailyRewards";
export type {
  DailyRewardStatus,
  DailyRewardClaim,
} from "./supabase/dailyRewards";
export { WalletOperationsService } from "./supabase/walletOperations";
export type { WalletOperationResult } from "./supabase/walletOperations";
export { LeaderboardService } from "./supabase/leaderboard";
export type { LeaderboardEntry, UserStats } from "./supabase/leaderboard";

// Utilities
export * from "./utils/validation";

// Odds Calculation
export * from "./odds/calculateOdds";
export * from "./odds/parlayCalculations";
export type {
  PlayerOddsData,
  MatchContext,
  OddsResult,
  H2HRecordInput,
} from "./odds/calculateOdds";

// Tournament management
export * from "./supabase/tournaments";
export { TournamentPurchaseService } from "./supabase/tournamentPurchases";
export type {
  TournamentPurchase,
  TournamentAccessResult,
  TournamentPurchaseResult,
} from "./supabase/tournamentPurchases";

// Enhanced match management
export * from "./supabase/matches";

export { MatchResultsService } from "./supabase/matchResults";
export type { MatchResultWithDetails } from "./supabase/matchResults";
export { NotificationsService } from "./supabase/notifications";
export type { NotificationWithData } from "./supabase/notifications";
export { WelcomeBonusNotificationService } from "./supabase/welcomeBonusNotifications";
export type { WelcomeBonusNotification } from "./supabase/welcomeBonusNotifications";
export { TransactionsService } from "./supabase/transactions";
export type { TransactionWithDetails } from "./supabase/transactions";
export { ProfilesService } from "./supabase/profiles";
export type { Profile } from "./supabase/profiles";

// Player management
export {
  fetchPlayers,
  fetchActivePlayers,
  fetchPlayerById,
  insertPlayer,
  bulkInsertPlayers,
  updatePlayer,
  deletePlayer,
  updatePlayerStatus,
  updatePlayerStatsFromMatchResult,
  reversePlayerStatsFromMatchResult,
  getPlayerMatchHistory,
} from "./supabase/players";

// Storage utilities for athlete photos
export {
  uploadAthletePhoto,
  getAthletePhotoUrl,
  deleteAthletePhoto,
  deleteAllPlayerPhotos,
  photoExists,
} from "./supabase/storage";
export type { UploadPhotoResult, DeletePhotoResult } from "./supabase/storage";

// Match Status Constants
export {
  MATCH_STATUSES,
  MATCH_STATUS_OPTIONS,
  getMatchStatusLabel,
  isActiveStatus,
  isFinishedStatus,
  type MatchStatus,
} from "./constants/matchStatuses";

// Daily Rewards Constants
export {
  DAILY_REWARDS_CONSTANTS,
  type DailyRewardsConstants,
} from "./constants/dailyRewards";

// Power-ups
export * from "./supabase/powerUps";

// Email Service
export { EmailService, emailService } from "./supabase/emailService";
export type { EmailData, EmailLog } from "./supabase/emailService";

// Email Template Service
export {
  EmailTemplateService,
  emailTemplateService,
} from "./supabase/emailTemplateService";
export type {
  EmailTemplate,
  EmailTemplateVariable,
  EmailTemplateVersion,
} from "./supabase/emailTemplateService";
