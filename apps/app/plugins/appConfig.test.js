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

// Over-the-air updates (docs/v2/ota-updates.md): the URL is this project's, a build only takes updates published for
// its own version, and the UIScene plugin (iOS 27 launch crash) stays in the list.
describe('app.json for over-the-air updates', () => {
  it('points at the EAS Update URL of this project', () => {
    expect(app.updates.enabled).toBe(true);
    expect(app.updates.url).toBe(`https://u.expo.dev/${app.extra.eas.projectId}`);
  });
  it('never waits for the network at launch', () => {
    expect(app.updates.checkAutomatically).toBe('ON_LOAD');
    expect(app.updates.fallbackToCacheTimeout).toBe(0);
  });
  it('ties updates to the app version', () => {
    expect(app.runtimeVersion).toEqual({ policy: 'appVersion' });
  });
  it('keeps the scene life cycle plugin', () => {
    expect(app.plugins).toContain('./plugins/withSceneLifecycle');
  });
});

// Google Play flagged build 11 (20 Nov 2026): DEX obfuscation 2%, under its 25% bar, fix by Feb 2027. R8 shrinks and
// obfuscates the Android release build; any Android build with it is tested on a phone before production.
describe('app.json for the Android release build', () => {
  it('turns on R8 (minify and shrink resources)', () => {
    const entry = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-build-properties');
    expect(entry?.[1]?.android).toMatchObject({ enableMinifyInReleaseBuilds: true, enableShrinkResourcesInReleaseBuilds: true });
  });
});
