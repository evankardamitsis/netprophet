/**
 * Daily Rewards Constants
 * Centralized configuration for daily reward amounts
 */

export const DAILY_REWARDS_CONSTANTS = {
  // Daily login reward (given every day)
  DAILY_LOGIN_REWARD: 30,
  
  // Welcome bonus (given only once to new users)
  WELCOME_BONUS: 100,
  
  // 7-day streak bonus (given every 7th consecutive day)
  SEVEN_DAY_STREAK_BONUS: 100,
  
  // Streak milestone interval (every X days)
  STREAK_MILESTONE_INTERVAL: 7,
} as const;

export type DailyRewardsConstants = typeof DAILY_REWARDS_CONSTANTS;
