import type { Copy, NameGender } from '@netprophet/copy';
import type { KudoOption, Reactions, ReceivedKudo } from '@netprophet/db';

/**
 * Kudos and reactions (prototype V2): the line in the right form, the question above the picks, the reaction
 * chips after a tap, and the «Τι λένε για σένα» cloud on Εγώ. Pure; the screens lay these out.
 */

/** «Σταθερή στη baseline» for her, «Σταθεροί στη baseline» for a doubles pair */
export function kudoText(o: KudoOption, gender: NameGender, plural = false): string {
  return plural ? o.forms.plural : gender === 'f' ? o.forms.f : o.forms.m;
}

/** «Τι σου άρεσε περισσότερο στον αντίπαλο;», or «Τι θες να της πεις;» when thanking one player from Αποτελέσματα */
export function kudoQuestion(t: Copy, gender: NameGender, plural: boolean, toOne: boolean): string {
  if (toOne) return t.kudos.askTo[gender];
  return plural ? t.kudos.ask.plural : t.kudos.ask[gender];
}

/** the chips right after a tap, before the server answers: one pick per person, a second tap takes it back */
export function applyReaction(r: Reactions, key: string): Reactions {
  const counts = { ...r.counts };
  const bump = (k: string, by: number) => {
    const n = (counts[k] ?? 0) + by;
    if (n > 0) counts[k] = n;
    else delete counts[k];
  };
  if (r.mine) bump(r.mine, -1);
  if (r.mine === key) return { ...r, counts, mine: null };
  bump(key, 1);
  return { ...r, counts, mine: key };
}

export interface CloudKudo {
  key: string;
  text: string;
  n: number;
  /** 0 to 1 against the most said line: sizes the bubble */
  weight: number;
  /** the top line, lime, when it was said more than once */
  lead: boolean;
}

export const CLOUD_FIRST = 6;

/** «Τι λένε για σένα»: most said first, six unless «Όλα» */
export function kudosCloud(list: ReceivedKudo[], gender: NameGender, all: boolean): CloudKudo[] {
  const shown = all ? list : list.slice(0, CLOUD_FIRST);
  const top = shown[0]?.n || 1;
  return shown.map((k, i) => ({
    key: k.key,
    text: kudoText(k, gender, k.doubles_only),
    n: k.n,
    weight: k.n / top,
    lead: i === 0 && k.n > 1,
  }));
}
