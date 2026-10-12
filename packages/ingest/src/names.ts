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
