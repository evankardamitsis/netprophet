import { fold } from './text';

/**
 * Names for matching. Sheets send «ΚΑΡΔΑΜΙΤΣΗΣ ΕΥΑΓΓΕΛΟΣ», the app stores «Βαγγέλης Καρδαμίτσης». A name key
 * folds accents and case, turns formal first names into the everyday ones (Ευάγγελος = Βαγγέλης) and sorts the
 * words, so order does not matter. Matching against the roster happens in the database with these keys.
 */
const NICKNAMES: Record<string, string> = {
  ευαγγελοσ: 'βαγγελησ',
  κωνσταντινοσ: 'κωστασ',
  ιωαννησ: 'γιαννησ',
  γεωργιοσ: 'γιωργοσ',
  δημητριοσ: 'δημητρησ',
  νικολαοσ: 'νικοσ',
  παναγιωτησ: 'πανοσ',
  αθανασιοσ: 'θανασησ',
  θεοδωροσ: 'θοδωρησ',
  μιχαηλ: 'μιχαλησ',
  ευστρατιοσ: 'στρατοσ',
  χαραλαμποσ: 'μπαμπησ',
  σπυριδων: 'σπυροσ',
  σπυριδωνασ: 'σπυροσ',
  εμμανουηλ: 'μανωλησ',
  γρηγοριοσ: 'γρηγορησ',
  ανδρεασ: 'ανδρεασ',
  βασιλειοσ: 'βασιλησ',
  αριστειδησ: 'αρησ',
  ευθυμιοσ: 'θυμιοσ',
  αικατερινη: 'κατερινα',
  ελενη: 'ελενη',
  αναστασια: 'τασια',
  βασιλικη: 'βασω',
  ευαγγελια: 'λιτσα',
  παναγιωτα: 'γιωτα',
};

/** the everyday form of a formal first name («ΕΥΑΓΓΕΛΟΣ» → «βαγγελησ»), folded; the name itself otherwise */
export function everydayFirst(first: string): string {
  return nameTokens(first).join(' ');
}

/** words of a name, folded, with formal first names made everyday */
export function nameTokens(name: string): string[] {
  return fold(name)
    .replace(/[^α-ωa-z\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 1)
    .map((t) => NICKNAMES[t] ?? t);
}

/** order-free key: «ΚΑΡΔΑΜΙΤΣΗΣ ΕΥΑΓΓΕΛΟΣ» and «Βαγγέλης Καρδαμίτσης» give the same key */
export function nameKey(name: string): string {
  return nameTokens(name).sort().join(' ');
}

/** «ΠΑΠΑΣ Γ. / ΝΙΚΟΥ Κ.»: the people on one side of a match */
export function splitSide(raw: string): string[] {
  return raw
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** a person as the sheet writes them: SURNAME first, then the first name (which can be missing) */
export interface SheetPerson {
  surname: string;
  first: string;
  /** folded «surname first», the fingerprint key (parse_oop.py norm_key) */
  key: string;
}

/** accents off, lowercase, final ς as σ, single spaces: parse_oop.py norm_key */
export function sheetKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * One side of a match: one person, or two with «/»; flags first_name_missing and latin_name. In a doubles category
 * (`doubles`) a side of exactly two words with no «/» is two surnames, «ΓΕΜΙΔΟΠΟΥΛΟΥ ΦΕΛΕΜΕΓΚΑΣ» (founder, 17 Oct: ΑΟΚ
 * writes pairs that way); flagged pair_by_space.
 */
export function parseSheetSide(raw: string, doubles = false): { people: SheetPerson[]; flags: string[]; pair: boolean } {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  const bySpace = doubles && !raw.includes('/') && words.length === 2;
  const pair = raw.includes('/') || bySpace;
  const parts = bySpace ? words : raw.includes('/') ? raw.split('/').map((p) => p.trim()) : [raw.trim()];
  const flags = new Set<string>(bySpace ? ['pair_by_space'] : []);
  const people = parts.map((p) => {
    const n = p.trim().replace(/\s+/g, ' ');
    const at = n.indexOf(' ');
    const surname = at < 0 ? n : n.slice(0, at);
    const first = at < 0 ? '' : n.slice(at + 1);
    if (!first) flags.add('first_name_missing');
    if (/[A-Za-z]/.test(p)) flags.add('latin_name');
    return { surname, first, key: sheetKey(surname + (first ? ` ${first}` : '')) };
  });
  return { people, flags: [...flags], pair };
}
