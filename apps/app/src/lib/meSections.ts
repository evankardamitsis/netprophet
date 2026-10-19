/**
 * Εγώ, calm (founder, 19 Oct 2026: "optimize UX and not overwhelm the user"). The main page is the player first:
 * Baller and name, the game level, today's quests, one «Τα νούμερά σου ›» row, the look; then Pro as one quiet row
 * and Ρυθμίσεις at the bottom. Everything else is one tap away on «Τα νούμερά σου» (the ?page=stats page).
 */
export type MeSection = 'hero' | 'level' | 'quests' | 'numbers' | 'look' | 'pro' | 'settings';

export interface MeSectionsInput {
  /** unlock `level_bar` */
  levelBar: boolean;
  /** unlock `daily_quests` */
  quests: boolean;
  /** unlock `frames` or `backgrounds` */
  look: boolean;
  /** unlock `pro_sheet`: the quiet Pro row shows for free and Pro players alike (Pro sees its active line) */
  proOpen: boolean;
}

/** the sections of the main Εγώ page, top to bottom */
export function meSections(i: MeSectionsInput): MeSection[] {
  const out: MeSection[] = ['hero'];
  if (i.levelBar) out.push('level');
  if (i.quests) out.push('quests');
  out.push('numbers');
  if (i.look) out.push('look');
  if (i.proOpen) out.push('pro');
  out.push('settings');
  return out;
}

export type MePage = 'main' | 'numbers';

/** `/me?page=stats` is «Τα νούμερά σου» (the header's σερί and πόντοι open it); anything else is the main page */
export function mePageOf(page: string | string[] | undefined): MePage {
  const p = Array.isArray(page) ? page[0] : page;
  return p === 'stats' ? 'numbers' : 'main';
}
