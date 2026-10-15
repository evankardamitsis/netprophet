import type { Copy } from '@netprophet/copy';

/**
 * A match's category (founder, 15 Oct 2026: "show the category on the players matches"): the organiser's event
 * («Μ 40+») and the discipline («Διπλό γυναικών»), as the tournament page shows them.
 */
export function disciplineLabel(discipline: string | null | undefined, t: Copy): string | null {
  return (discipline && t.tournaments.detail.disciplines[discipline]) || null;
}

/** «Μ 40+ · Απλό», or null outside an event */
export function categoryLabel(level: string | null | undefined, discipline: string | null | undefined, t: Copy): string | null {
  return [level, disciplineLabel(discipline, t)].filter(Boolean).join(' · ') || null;
}
