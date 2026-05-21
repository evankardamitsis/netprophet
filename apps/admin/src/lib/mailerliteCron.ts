import { createClient } from "@supabase/supabase-js";
import {
  bulkAddToGroupByKey,
  bulkRemoveFromGroupByKey,
  fireAndForget,
  updateSubscriberFields,
  addToGroupByKey,
  removeFromGroupByKey,
} from "@netprophet/lib";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getActivePlayerEmails(days = 14): Promise<string[]> {
  const supabase = getServiceClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: recentBets, error: betsError } = await supabase
    .from("bets")
    .select("user_id")
    .gte("created_at", since.toISOString());

  if (betsError) throw betsError;

  const userIds = [...new Set((recentBets ?? []).map((b) => b.user_id))];
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("email, is_admin")
    .in("id", userIds)
    .not("email", "is", null);

  if (profilesError) throw profilesError;

  return (profiles ?? [])
    .filter((p) => !p.is_admin && p.email)
    .map((p) => p.email);
}

export async function getAllSubscriberEmails(): Promise<string[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .not("email", "is", null)
    .or("is_admin.is.null,is_admin.eq.false");

  if (error) throw error;
  return (data ?? []).map((r) => r.email).filter(Boolean);
}

export async function getInactiveEmails(since: Date): Promise<string[]> {
  const supabase = getServiceClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, is_admin")
    .not("email", "is", null)
    .or("is_admin.is.null,is_admin.eq.false");

  if (error) throw error;

  const inactive: string[] = [];
  const sinceIso = since.toISOString();

  for (const profile of profiles ?? []) {
    const { count } = await supabase
      .from("bets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("created_at", sinceIso);

    if ((count ?? 0) === 0) {
      inactive.push(profile.email);
    }
  }
  return inactive;
}

/** Sunday weekly leaderboard + group sync */
export async function runWeeklyLeaderboardSync(): Promise<{
  updated: number;
}> {
  const supabase = getServiceClient();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, email, balance, accuracy_percentage, current_winning_streak, leaderboard_points, is_admin"
    )
    .not("email", "is", null)
    .order("leaderboard_points", { ascending: false });

  if (error) throw error;

  const active = (profiles ?? []).filter((p) => !p.is_admin);
  let rank = 0;
  let updated = 0;

  for (const profile of active) {
    rank += 1;

    const { data: weekBets } = await supabase
      .from("bets")
      .select("id, status, winnings_paid, created_at")
      .eq("user_id", profile.id)
      .gte("created_at", weekStart.toISOString());

    const predictionsThisWeek = weekBets?.length ?? 0;
    const coinsWon = (weekBets ?? [])
      .filter((b) => b.status === "won")
      .reduce((sum, b) => sum + (b.winnings_paid ?? 0), 0);

    fireAndForget(
      updateSubscriberFields(profile.email, {
        user_rank: rank,
        user_accuracy: Math.round(profile.accuracy_percentage ?? 0),
        streak: profile.current_winning_streak ?? 0,
        coins_won: coinsWon,
        coin_balance: profile.balance ?? 0,
      }),
      `weekly-fields-${profile.email}`
    );

    if (rank <= 20) {
      fireAndForget(
        addToGroupByKey(profile.email, "TOP_LEADERBOARD"),
        `top20-add-${profile.email}`
      );
    } else {
      fireAndForget(
        removeFromGroupByKey(profile.email, "TOP_LEADERBOARD"),
        `top20-remove-${profile.email}`
      );
    }

    if (predictionsThisWeek > 0) {
      fireAndForget(
        addToGroupByKey(profile.email, "ACTIVE_PLAYERS"),
        `active-add-${profile.email}`
      );
    }

    updated++;
  }

  return { updated };
}

export async function runInactivitySync(): Promise<{
  inactive7d: number;
  inactive30d: number;
}> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const inactive7d = await getInactiveEmails(sevenDaysAgo);
  const inactive30d = await getInactiveEmails(thirtyDaysAgo);

  for (const email of inactive7d) {
    fireAndForget(
      addToGroupByKey(email, "INACTIVE_7D"),
      `inactive7d-${email}`
    );
  }

  for (const email of inactive30d) {
    fireAndForget(addToGroupByKey(email, "INACTIVE_30D"), `inactive30d-${email}`);
    fireAndForget(
      removeFromGroupByKey(email, "INACTIVE_7D"),
      `inactive30d-remove7d-${email}`
    );
  }

  return { inactive7d: inactive7d.length, inactive30d: inactive30d.length };
}

export async function runTournamentAnnouncement(): Promise<{
  recipients: number;
}> {
  const emails = await getAllSubscriberEmails();

  fireAndForget(
    bulkRemoveFromGroupByKey(emails, "TOURNAMENT_TRIGGER"),
    "tournament-bulk-remove"
  );

  await new Promise((r) => setTimeout(r, 2000));

  fireAndForget(
    bulkAddToGroupByKey(emails, "TOURNAMENT_TRIGGER"),
    "tournament-bulk-add"
  );

  // Schedule removal after 1 hour via queue
  const supabase = getServiceClient();
  const removeAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await supabase.from("mailerlite_logs").insert({
    email: null,
    status: "pending",
    action: "bulk_remove_group",
    bulk_emails: emails,
    group_keys: ["TOURNAMENT_TRIGGER"],
    execute_after: removeAt,
  });

  return { recipients: emails.length };
}

export async function runMatchAlert(
  day: "monday" | "thursday"
): Promise<{ recipients: number }> {
  const key =
    day === "monday" ? "MATCH_ALERT_MONDAY" : "MATCH_ALERT_THURSDAY";
  const emails = await getActivePlayerEmails(14);

  fireAndForget(bulkAddToGroupByKey(emails, key), `match-alert-add-${day}`);

  const supabase = getServiceClient();
  const removeAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  await supabase.from("mailerlite_logs").insert({
    email: null,
    status: "pending",
    action: "bulk_remove_group",
    bulk_emails: emails,
    group_keys: [key],
    execute_after: removeAt,
  });

  return { recipients: emails.length };
}
