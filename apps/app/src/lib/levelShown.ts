/**
 * Players' playing levels are hidden (founder, 14 Oct 2026: "removing player levels completely, we only keep users
 * levels playing the game"; chosen: hide, keep inside). The database still works them out every night (the quiz
 * uses them for upsets), so turning this back on brings every level line, pill and stat back as they were.
 */
export const PLAYER_LEVEL_SHOWN = false;
