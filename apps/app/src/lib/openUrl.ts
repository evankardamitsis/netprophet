/**
 * Links that come from the database or from staff (sponsor CTAs, tournament pages) open only when they are plain https.
 * No javascript:, intent:, tel:, custom schemes or http. Pure, so the opener is passed in (Linking.openURL in the app).
 */
export function isHttpsUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    return new URL(url.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Opens the url with `open` when it is https; anything else is ignored. Never throws. Returns whether it opened. */
export function safeOpen(url: string | null | undefined, open: (url: string) => Promise<unknown>): boolean {
  if (!isHttpsUrl(url)) return false;
  void open(url.trim()).catch(() => undefined);
  return true;
}
