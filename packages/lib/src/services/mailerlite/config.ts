/**
 * MailerLite group IDs and custom field keys — loaded from environment.
 * Never hardcode account-specific IDs in application logic.
 */

export type MailerLiteGroupKey =
  | "NEW_USERS"
  | "ACTIVE_PLAYERS"
  | "COIN_BUYERS"
  | "TOP_LEADERBOARD"
  | "ZERO_PREDICTIONS"
  | "INACTIVE_7D"
  | "INACTIVE_30D"
  | "TOURNAMENT_TRIGGER"
  | "MATCH_ALERT_MONDAY"
  | "MATCH_ALERT_THURSDAY";

export type SubscriberFields = {
  coin_balance?: number;
  last_prediction_date?: string;
  user_rank?: number;
  user_accuracy?: number;
  streak?: number;
  coins_won?: number;
  last_login_date?: string;
};

const GROUP_ENV_MAP: Record<MailerLiteGroupKey, string> = {
  NEW_USERS: "GROUP_NEW_USERS",
  ACTIVE_PLAYERS: "GROUP_ACTIVE_PLAYERS",
  COIN_BUYERS: "GROUP_COIN_BUYERS",
  TOP_LEADERBOARD: "GROUP_TOP_LEADERBOARD",
  ZERO_PREDICTIONS: "GROUP_ZERO_PREDICTIONS",
  INACTIVE_7D: "GROUP_INACTIVE_7D",
  INACTIVE_30D: "GROUP_INACTIVE_30D",
  TOURNAMENT_TRIGGER: "GROUP_TOURNAMENT_TRIGGER",
  MATCH_ALERT_MONDAY: "GROUP_MATCH_ALERT_MONDAY",
  MATCH_ALERT_THURSDAY: "GROUP_MATCH_ALERT_THURSDAY",
};

export function getMailerLiteApiKey(): string | undefined {
  return process.env.MAILERLITE_API_KEY;
}

export function getMailerLiteApiBase(): string {
  return (
    process.env.MAILERLITE_API_BASE?.replace(/\/$/, "") ||
    "https://connect.mailerlite.com/api"
  );
}

export function resolveGroupId(key: MailerLiteGroupKey): string | undefined {
  const envName = GROUP_ENV_MAP[key];
  return process.env[envName];
}

export function resolveGroupIds(keys: MailerLiteGroupKey[]): string[] {
  return keys
    .map((k) => resolveGroupId(k))
    .filter((id): id is string => Boolean(id));
}

/** Format dates for MailerLite custom fields (YYYY-MM-DD). */
export function formatMailerLiteDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export const FIELD_KEYS = {
  coin_balance: "FIELD_COIN_BALANCE",
  last_prediction_date: "FIELD_LAST_PREDICTION_DATE",
  user_rank: "FIELD_USER_RANK",
  user_accuracy: "FIELD_USER_ACCURACY",
  streak: "FIELD_STREAK",
  coins_won: "FIELD_COINS_WON",
  last_login_date: "FIELD_LAST_LOGIN_DATE",
} as const;

export function resolveFieldKey(envKey: string, fallback: string): string {
  return process.env[envKey] || fallback;
}

export function buildFieldsPayload(
  fields: SubscriberFields
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (fields.coin_balance !== undefined) {
    out[resolveFieldKey(FIELD_KEYS.coin_balance, "coin_balance")] =
      fields.coin_balance;
  }
  if (fields.last_prediction_date !== undefined) {
    out[resolveFieldKey(FIELD_KEYS.last_prediction_date, "last_prediction_date")] =
      fields.last_prediction_date;
  }
  if (fields.user_rank !== undefined) {
    out[resolveFieldKey(FIELD_KEYS.user_rank, "user_rank")] = fields.user_rank;
  }
  if (fields.user_accuracy !== undefined) {
    out[resolveFieldKey(FIELD_KEYS.user_accuracy, "user_accuracy")] =
      fields.user_accuracy;
  }
  if (fields.streak !== undefined) {
    out[resolveFieldKey(FIELD_KEYS.streak, "streak")] = fields.streak;
  }
  if (fields.coins_won !== undefined) {
    out[resolveFieldKey(FIELD_KEYS.coins_won, "coins_won")] = fields.coins_won;
  }
  if (fields.last_login_date !== undefined) {
    out[resolveFieldKey(FIELD_KEYS.last_login_date, "last_login_date")] =
      fields.last_login_date;
  }
  return out;
}
