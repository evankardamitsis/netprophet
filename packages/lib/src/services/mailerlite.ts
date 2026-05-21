/**
 * MailerLite REST API client — single source of truth for MailerLite HTTP calls (Node/runtime).
 * Marketing automations only; transactional emails remain on Resend.
 */

import {
  buildFieldsPayload,
  formatMailerLiteDate,
  getMailerLiteApiBase,
  getMailerLiteApiKey,
  resolveGroupId,
  resolveGroupIds,
  type MailerLiteGroupKey,
  type SubscriberFields,
} from "./mailerlite/config";

export type { MailerLiteGroupKey, SubscriberFields };
export {
  buildFieldsPayload,
  formatMailerLiteDate,
  resolveGroupId,
  resolveGroupIds,
} from "./mailerlite/config";

const RATE_LIMIT_DELAY_MS = 550; // ~120 req/min

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type MailerLiteSubscriber = {
  id: string;
  email: string;
};

async function mailerLiteFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = getMailerLiteApiKey();
  if (!apiKey) {
    throw new Error("MAILERLITE_API_KEY is not configured");
  }
  const base = getMailerLiteApiBase();
  return fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers as Record<string, string>),
    },
  });
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`MailerLite API ${res.status}: ${text}`);
  }
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

function toGroupNumbers(groupIds: string[]): number[] {
  return groupIds
    .map((id) => parseInt(id, 10))
    .filter((n) => !Number.isNaN(n));
}

/** Look up subscriber id by email. */
export async function getSubscriberByEmail(
  email: string
): Promise<MailerLiteSubscriber | null> {
  const res = await mailerLiteFetch(
    `/subscribers/${encodeURIComponent(email)}`
  );
  if (res.status === 404) return null;
  const body = await parseResponse<{ data: MailerLiteSubscriber }>(res);
  return body.data ?? null;
}

/** Add or update a subscriber (upsert by email). */
export async function upsertSubscriber(data: {
  email: string;
  name?: string;
  fields?: Partial<SubscriberFields>;
  groups?: string[];
  groupKeys?: MailerLiteGroupKey[];
}): Promise<void> {
  const groupIds = [
    ...(data.groups ?? []),
    ...(data.groupKeys ? resolveGroupIds(data.groupKeys) : []),
  ];
  const groups = toGroupNumbers(groupIds);

  const payload: Record<string, unknown> = {
    email: data.email,
    status: "active",
  };

  if (data.name) {
    const parts = data.name.trim().split(/\s+/);
    payload.fields = {
      name: data.name,
      first_name: parts[0] ?? "",
      last_name: parts.slice(1).join(" ") ?? "",
      ...(data.fields ? buildFieldsPayload(data.fields as SubscriberFields) : {}),
    };
  } else if (data.fields) {
    payload.fields = buildFieldsPayload(data.fields as SubscriberFields);
  }

  if (groups.length > 0) {
    payload.groups = groups;
  }

  const res = await mailerLiteFetch("/subscribers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await parseResponse(res);
}

/** Update custom fields on an existing subscriber. */
export async function updateSubscriberFields(
  email: string,
  fields: Partial<SubscriberFields>
): Promise<void> {
  const fieldPayload = buildFieldsPayload(fields as SubscriberFields);
  if (Object.keys(fieldPayload).length === 0) return;

  const res = await mailerLiteFetch("/subscribers", {
    method: "POST",
    body: JSON.stringify({
      email,
      fields: fieldPayload,
    }),
  });
  await parseResponse(res);
}

/** Add subscriber to a group (triggers automations). */
export async function addToGroup(
  email: string,
  groupId: string
): Promise<void> {
  const subscriber = await getSubscriberByEmail(email);
  if (!subscriber) {
    await upsertSubscriber({ email, groups: [groupId] });
    return;
  }

  const res = await mailerLiteFetch(`/subscribers/${subscriber.id}/groups/${groupId}`, {
    method: "POST",
  });
  if (res.status === 409) return; // already in group
  await parseResponse(res);
}

export async function addToGroupByKey(
  email: string,
  key: MailerLiteGroupKey
): Promise<void> {
  const groupId = resolveGroupId(key);
  if (!groupId) {
    console.warn(`[mailerlite] Group env not set for ${key}`);
    return;
  }
  await addToGroup(email, groupId);
}

/** Remove subscriber from a group. */
export async function removeFromGroup(
  email: string,
  groupId: string
): Promise<void> {
  const subscriber = await getSubscriberByEmail(email);
  if (!subscriber) return;

  const res = await mailerLiteFetch(
    `/subscribers/${subscriber.id}/groups/${groupId}`,
    { method: "DELETE" }
  );
  if (res.status === 404) return;
  await parseResponse(res);
}

export async function removeFromGroupByKey(
  email: string,
  key: MailerLiteGroupKey
): Promise<void> {
  const groupId = resolveGroupId(key);
  if (!groupId) return;
  await removeFromGroup(email, groupId);
}

/** Bulk add emails to a group via import endpoint. */
export async function bulkAddToGroup(
  emails: string[],
  groupId: string
): Promise<void> {
  const unique = [...new Set(emails.filter(Boolean))];
  if (unique.length === 0) return;

  const groupNum = parseInt(groupId, 10);
  const subscribers = unique.map((email) => ({
    email,
    groups: [groupNum],
  }));

  const res = await mailerLiteFetch("/subscribers/import", {
    method: "POST",
    body: JSON.stringify({
      subscribers,
      resubscribe: true,
    }),
  });
  await parseResponse(res);
}

export async function bulkAddToGroupByKey(
  emails: string[],
  key: MailerLiteGroupKey
): Promise<void> {
  const groupId = resolveGroupId(key);
  if (!groupId) return;
  await bulkAddToGroup(emails, groupId);
}

/** Bulk remove — sequential with rate limiting. */
export async function bulkRemoveFromGroup(
  emails: string[],
  groupId: string
): Promise<void> {
  const unique = [...new Set(emails.filter(Boolean))];
  for (const email of unique) {
    try {
      await removeFromGroup(email, groupId);
    } catch (err) {
      console.warn(`[mailerlite] bulkRemove failed for ${email}:`, err);
    }
    await sleep(RATE_LIMIT_DELAY_MS);
  }
}

export async function bulkRemoveFromGroupByKey(
  emails: string[],
  key: MailerLiteGroupKey
): Promise<void> {
  const groupId = resolveGroupId(key);
  if (!groupId) return;
  await bulkRemoveFromGroup(emails, groupId);
}

/** Fire-and-forget wrapper — never throws to caller. */
export function fireAndForget(promise: Promise<unknown>, label: string): void {
  promise.catch((err) => {
    console.error(`[mailerlite] ${label} failed:`, err);
  });
}
