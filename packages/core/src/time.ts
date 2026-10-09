/**
 * Time helpers. Rules never read the clock: every function takes an instant.
 * All period keys (day, week, month) are computed in Europe/Athens, DST included.
 * Instants are ISO 8601 strings (UTC `Z` or with an offset), the same shape the database serialises.
 */
export type Instant = string;
export const ATHENS_TZ = 'Europe/Athens';

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ATHENS_TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function toMs(at: Instant): number {
  const ms = Date.parse(at);
  if (Number.isNaN(ms)) throw new RangeError(`Invalid instant: ${at}`);
  return ms;
}

export function toInstant(ms: number): Instant {
  return new Date(ms).toISOString();
}

export function localParts(at: Instant): LocalParts {
  const ms = toMs(at);
  const out: Record<string, number> = {};
  for (const p of formatter.formatToParts(new Date(ms))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return {
    year: out.year ?? 0,
    month: out.month ?? 0,
    day: out.day ?? 0,
    hour: out.hour ?? 0,
    minute: out.minute ?? 0,
    second: out.second ?? 0,
  };
}

/** Offset of Europe/Athens from UTC at the given epoch ms (+2h winter, +3h summer). */
function offsetMs(ms: number): number {
  const p = localParts(toInstant(ms));
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Epoch ms of 00:00 Athens time on the given calendar date. DST changes happen at 03:00/04:00, so midnight is never ambiguous. */
function localMidnightMs(year: number, month: number, day: number): number {
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - offsetMs(guess);
  const second = guess - offsetMs(first);
  return second;
}

const pad = (n: number, w = 2): string => String(n).padStart(w, '0');

export function dateKey(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

function parseKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { year: y ?? 0, month: m ?? 1, day: d ?? 1 };
}

/** Add whole calendar days to a `YYYY-MM-DD` key. */
export function addDays(key: string, days: number): string {
  const { year, month, day } = parseKey(key);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return dateKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** `YYYY-MM-DD` of the Athens calendar day containing the instant. */
export function dayKey(at: Instant): string {
  const p = localParts(at);
  return dateKey(p.year, p.month, p.day);
}

/** `YYYY-MM-DD` of the Monday that starts the Athens week containing the instant. */
export function weekKey(at: Instant): string {
  const key = dayKey(at);
  const { year, month, day } = parseKey(key);
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  return addDays(key, -((dow + 6) % 7));
}

/** `YYYY-MM` of the Athens month containing the instant. */
export function monthKey(at: Instant): string {
  const p = localParts(at);
  return `${pad(p.year, 4)}-${pad(p.month)}`;
}

function midnightOfKey(key: string): Instant {
  const { year, month, day } = parseKey(key);
  return toInstant(localMidnightMs(year, month, day));
}

/** Next 00:00 Athens strictly after the instant. */
export function nextDayReset(at: Instant): Instant {
  return midnightOfKey(addDays(dayKey(at), 1));
}

/** Next Monday 00:00 Athens strictly after the instant. */
export function nextWeekReset(at: Instant): Instant {
  return midnightOfKey(addDays(weekKey(at), 7));
}

/** Next 1st-of-month 00:00 Athens strictly after the instant. */
export function nextMonthReset(at: Instant): Instant {
  const p = localParts(at);
  const y = p.month === 12 ? p.year + 1 : p.year;
  const m = p.month === 12 ? 1 : p.month + 1;
  return midnightOfKey(dateKey(y, m, 1));
}

/** Start (00:00 Athens) of the Athens day with this key. */
export function startOfDay(key: string): Instant {
  return midnightOfKey(key);
}

/** Days left in the month for «Τέλος μήνα σε N μέρες»: 1 on the last day, 31 on the 1st of a 31-day month. */
export function daysLeftInMonth(at: Instant): number {
  const p = localParts(at);
  const last = new Date(Date.UTC(p.year, p.month, 0)).getUTCDate();
  return last - p.day + 1;
}

/** The «Οι 6 της ημέρας» set changes at 09:00 Athens. Before 09:00 you are still on the previous set. */
export function quizDayKey(at: Instant): string {
  const p = localParts(at);
  const key = dateKey(p.year, p.month, p.day);
  return p.hour < 9 ? addDays(key, -1) : key;
}
