/**
 * MailerLite API — shared Deno module for Edge Functions.
 * Group/field env vars match packages/lib/src/services/mailerlite/config.ts
 */

const GROUP_ENV: Record<string, string> = {
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

const FIELD_ENV: Record<string, string> = {
  coin_balance: "FIELD_COIN_BALANCE",
  last_prediction_date: "FIELD_LAST_PREDICTION_DATE",
  user_rank: "FIELD_USER_RANK",
  user_accuracy: "FIELD_USER_ACCURACY",
  streak: "FIELD_STREAK",
  coins_won: "FIELD_COINS_WON",
  last_login_date: "FIELD_LAST_LOGIN_DATE",
};

function apiKey(): string {
  const key = Deno.env.get("MAILERLITE_API_KEY");
  if (!key) throw new Error("MAILERLITE_API_KEY not configured");
  return key;
}

function apiBase(): string {
  return (
    Deno.env.get("MAILERLITE_API_BASE")?.replace(/\/$/, "") ||
    "https://connect.mailerlite.com/api"
  );
}

export function resolveGroupId(key: string): string | undefined {
  const envName = GROUP_ENV[key];
  return envName ? Deno.env.get(envName) : undefined;
}

function resolveFieldName(key: string): string {
  const envName = FIELD_ENV[key];
  return (envName && Deno.env.get(envName)) || key;
}

function buildFields(
  fields: Record<string, string | number>
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) {
      out[resolveFieldName(k)] = v;
    }
  }
  return out;
}

async function mlFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey()}`,
      ...(init.headers as Record<string, string>),
    },
  });
}

async function parseOk(res: Response): Promise<void> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MailerLite ${res.status}: ${text}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getSubscriberByEmail(
  email: string
): Promise<{ id: string } | null> {
  const res = await mlFetch(`/subscribers/${encodeURIComponent(email)}`);
  if (res.status === 404) return null;
  await parseOk(res);
  const body = await res.json();
  return body?.data ?? null;
}

export async function upsertSubscriber(opts: {
  email: string;
  name?: string;
  fields?: Record<string, string | number>;
  groupIds?: string[];
  groupKeys?: string[];
}): Promise<void> {
  const ids = [
    ...(opts.groupIds ?? []),
    ...(opts.groupKeys ?? [])
      .map((k) => resolveGroupId(k))
      .filter((id): id is string => Boolean(id)),
  ].map((id) => parseInt(id, 10)).filter((n) => !isNaN(n));

  const payload: Record<string, unknown> = {
    email: opts.email,
    status: "active",
  };

  if (opts.name) {
    const parts = opts.name.trim().split(/\s+/);
    payload.fields = {
      name: opts.name,
      first_name: parts[0] ?? "",
      last_name: parts.slice(1).join(" ") ?? "",
      ...buildFields(opts.fields ?? {}),
    };
  } else if (opts.fields) {
    payload.fields = buildFields(opts.fields);
  }

  if (ids.length) payload.groups = ids;

  const res = await mlFetch("/subscribers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await parseOk(res);
}

export async function updateSubscriberFields(
  email: string,
  fields: Record<string, string | number>
): Promise<void> {
  const res = await mlFetch("/subscribers", {
    method: "POST",
    body: JSON.stringify({ email, fields: buildFields(fields) }),
  });
  await parseOk(res);
}

export async function addToGroup(email: string, groupId: string): Promise<void> {
  const sub = await getSubscriberByEmail(email);
  if (!sub) {
    await upsertSubscriber({ email, groupIds: [groupId] });
    return;
  }
  const res = await mlFetch(`/subscribers/${sub.id}/groups/${groupId}`, {
    method: "POST",
  });
  if (res.status !== 409) await parseOk(res);
}

export async function addToGroupByKey(
  email: string,
  key: string
): Promise<void> {
  const id = resolveGroupId(key);
  if (!id) return;
  await addToGroup(email, id);
}

export async function removeFromGroup(
  email: string,
  groupId: string
): Promise<void> {
  const sub = await getSubscriberByEmail(email);
  if (!sub) return;
  const res = await mlFetch(`/subscribers/${sub.id}/groups/${groupId}`, {
    method: "DELETE",
  });
  if (res.status !== 404) await parseOk(res);
}

export async function removeFromGroupByKey(
  email: string,
  key: string
): Promise<void> {
  const id = resolveGroupId(key);
  if (!id) return;
  await removeFromGroup(email, id);
}

export async function bulkAddToGroup(
  emails: string[],
  groupId: string
): Promise<void> {
  const unique = [...new Set(emails.filter(Boolean))];
  if (!unique.length) return;
  const groupNum = parseInt(groupId, 10);
  const res = await mlFetch("/subscribers/import", {
    method: "POST",
    body: JSON.stringify({
      subscribers: unique.map((email) => ({ email, groups: [groupNum] })),
      resubscribe: true,
    }),
  });
  await parseOk(res);
}

export async function bulkRemoveFromGroup(
  emails: string[],
  groupId: string
): Promise<void> {
  for (const email of [...new Set(emails.filter(Boolean))]) {
    try {
      await removeFromGroup(email, groupId);
    } catch (e) {
      console.warn(`bulkRemove ${email}:`, e);
    }
    await sleep(550);
  }
}

export function parseFieldsJson(
  raw: Record<string, unknown> | null
): Record<string, string | number> {
  if (!raw) return {};
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== null && v !== undefined) {
      out[k] = typeof v === "number" ? v : String(v);
    }
  }
  return out;
}
