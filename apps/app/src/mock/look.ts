import type { GetLookResult, LookCategory, LookItem, LookKind } from '@netprophet/db';

/** [category, key, name, kind, price, earn rule], in the server's order (mirrors supabase-v2 m3_look) */
const ROWS: [LookCategory, string, string, string, LookKind, number | null, string | null][] = [
  ['frame', 'frame_friends', 'Φίλοι', 'Friends', 'earned', null, 'Το κερδίζεις όταν φέρεις έναν φίλο'],
  ['frame', 'frame_level', 'Level', 'Level', 'earned', null, 'Το κερδίζεις με ένα badge σε χρυσή βαθμίδα'],
  ['frame', 'frame_month_top', 'Κορυφή μήνα', 'Top of the month', 'earned', null, 'Το κερδίζεις στην πρώτη τριάδα της Κατάταξης'],
  ['frame', 'frame_seven', 'Επτά', 'Seven', 'earned', null, 'Το κερδίζεις με 7 σωστές στη σειρά'],
  ['frame', 'frame_ten', 'Δέκα', 'Ten', 'earned', null, 'Το κερδίζεις με 10 σωστές στη σειρά'],
  ['frame', 'frame_week', 'Της εβδομάδας', 'Of the week', 'earned', null, 'Το κερδίζεις με την εβδομαδιαία αποστολή'],
  ['frame', 'frame_founding', 'Πρώτη γενιά', 'Founding', 'earned', null, 'Για όσους ήταν από την αρχή'],
  ['frame', 'frame_gold', 'Χρυσό', 'Gold', 'buy', 1.99, null],
  ['frame', 'frame_grass', 'Γρασίδι', 'Grass', 'buy', 1.99, null],
  ['frame', 'frame_retro', 'Ρετρό', 'Retro', 'buy', 1.99, null],
  ['background', 'bg_clay', 'Χωμάτινο γήπεδο', 'Clay court', 'earned', null, 'Το κερδίζεις με μια αποστολή'],
  ['background', 'bg_grass', 'Γρασίδι', 'Grass', 'earned', null, 'Το κερδίζεις με την εβδομαδιαία αποστολή'],
  ['background', 'bg_night', 'Βραδινό ματς', 'Night match', 'earned', null, 'Το κερδίζεις με μια αποστολή'],
  ['background', 'bg_center', 'Κεντρικό γήπεδο', 'Centre court', 'buy', 0.99, null],
  ['background', 'bg_hard', 'Σκληρό γήπεδο', 'Hard court', 'buy', 0.99, null],
  ['background', 'bg_indoor', 'Κλειστό γήπεδο', 'Indoor court', 'buy', 0.99, null],
  ['kit', 'kit_black', 'Μαύρο', 'Black', 'buy', 0.99, null],
  ['kit', 'kit_green', 'Πράσινο', 'Green', 'free', null, null],
  ['kit', 'kit_white', 'Λευκό', 'White', 'buy', 0.99, null],
  ['kit', 'kit_night', 'Σετ Βραδινό ματς', 'Night match set', 'earned', null, 'Το κερδίζεις με το badge Μάντης του κλαμπ'],
  ['kit', 'kit_clay', 'Σετ Χώμα', 'Clay set', 'pack', 1.99, null],
  ['kit', 'kit_grass', 'Σετ Γρασίδι', 'Grass set', 'pack', 1.99, null],
];

/** what the guest owns of the earned and bought items */
const OWNED = new Set(['frame_seven', 'bg_night', 'bg_clay']);

/** the guest's wardrobe (mock mode and the dev guest): the free kits, a frame and two backgrounds earned, night on the card */
export function mockLook(): GetLookResult {
  const items: LookItem[] = ROWS.map(([category, key, name_el, name_en, kind, price_eur, earn_rule]) => ({
    key,
    category,
    name_el,
    name_en,
    kind,
    price_eur,
    earn_rule,
    owned: kind === 'free' || OWNED.has(key),
    source: OWNED.has(key) ? 'earned' : null,
    equipped: key === 'bg_night' || key === 'kit_green',
  }));
  return { items, equipped: { frame: null, background: 'bg_night', kit: 'kit_green' } };
}
