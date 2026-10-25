/**
 * Where Pro shows itself to players without it (founder, 22 Oct 2026: "show it in more places, not spam"). Pure rules,
 * no storage and no screens, so every surface asks the same question and the tests pin the answers.
 *
 * - Pro players never see a sales entry.
 * - The header pill and Εγώ's card are always there for players without Pro.
 * - Every other entry is one quiet line or card per moment, and once it was tapped it rests until the next day.
 * - 'onboarding' is the soft paywall after a new sign-up: it opens once (proOnboarding.ts keeps the one-shot), so it has no
 *   daily rest of its own. 'ladder' is the locked section on Κατάταξη, always there for players without Pro like Εγώ's card.
 *   'results_end' is the line after the last result played, once a day.
 * - While we do not know yet whether the player has Pro, nothing shows (no flash that disappears).
 * Nothing here sells advantage: every entry is information, alerts or convenience.
 */
export type ProMoment =
  | 'header'
  | 'me'
  | 'home'
  | 'player'
  | 'tournament_player'
  | 'my_match'
  | 'result'
  | 'follow'
  | 'opponent'
  | 'onboarding'
  | 'results_end'
  | 'ladder';

/** the moments that rest for the day once tapped; the header pill and Εγώ's card never do */
export const CAPPED_MOMENTS: readonly ProMoment[] = ['home', 'player', 'tournament_player', 'my_match', 'result', 'follow', 'results_end'];

/** the day each capped moment was last tapped, «2026-10-22» in the player's own calendar */
export type ProSeen = Partial<Record<ProMoment, string>>;

/** «2026-10-22» from the device's local date */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** what storage held; anything unreadable is nothing seen */
export function parseSeen(raw: string | null | undefined): ProSeen {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
    const out: ProSeen = {};
    for (const m of CAPPED_MOMENTS) {
      const day = (v as Record<string, unknown>)[m];
      if (typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)) out[m] = day;
    }
    return out;
  } catch {
    return {};
  }
}

/** the moment was tapped today: it rests until tomorrow. Uncapped moments change nothing. */
export function markSeen(seen: ProSeen, moment: ProMoment, now: Date): ProSeen {
  if (!CAPPED_MOMENTS.includes(moment)) return seen;
  return { ...seen, [moment]: dayKey(now) };
}

/**
 * Does this moment show its Pro entry now? `pro` is null while unknown. `ready` is false until storage has been read,
 * so a capped entry never flashes and then goes away.
 */
export function showsProEntry(input: { moment: ProMoment; pro: boolean | null; seen: ProSeen; now: Date; ready?: boolean }): boolean {
  const { moment, pro, seen, now, ready = true } = input;
  if (pro !== false) return false;
  if (!CAPPED_MOMENTS.includes(moment)) return true;
  if (!ready) return false;
  return seen[moment] !== dayKey(now);
}

/** the free week is said only when the server says it is there to take */
export function showsTrial(pro: boolean | null, trialAvailable: boolean | undefined): boolean {
  return pro === false && trialAvailable === true;
}
