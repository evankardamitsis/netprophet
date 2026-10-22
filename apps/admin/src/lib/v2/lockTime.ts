/**
 * A match with no start time (the import stores it at 00:00 Athens) takes votes until this Athens time on its day,
 * unless its tournament says otherwise (core.tournaments.untimed_lock_time, founder 22 Oct 2026).
 */
export const DEFAULT_UNTIMED_LOCK = '14:00';

/** what the time field may send: HH:MM, 00:00 to 23:59 */
export function validLockTime(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}
