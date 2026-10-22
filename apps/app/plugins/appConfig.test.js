import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The Android side of app.json as Google Play reads it (22 Oct 2026, Play production package): the Data safety
// form and the permissions declaration follow from these, so a change here should change
// docs/v2/store/android/data-safety.md too.
const app = JSON.parse(readFileSync(join(__dirname, '..', 'app.json'), 'utf8')).expo;

describe('app.json for Google Play', () => {
  it('keeps the package Play knows', () => {
    expect(app.android.package).toBe('gr.monadlabs.netprophet');
  });
  it('blocks the draw-over-apps permission the Expo template adds and nothing uses', () => {
    expect(app.android.blockedPermissions).toContain('android.permission.SYSTEM_ALERT_WINDOW');
  });
  it('asks for no sensitive permission by name', () => {
    const asked = app.android.permissions ?? [];
    const sensitive = /LOCATION|CAMERA|RECORD_AUDIO|READ_MEDIA|CONTACTS|SMS|CALL_LOG|SCHEDULE_EXACT_ALARM|USE_EXACT_ALARM|AD_ID/;
    expect(asked.filter((p) => sensitive.test(p))).toEqual([]);
  });
});
