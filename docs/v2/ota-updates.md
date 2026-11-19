# Over-the-air updates (from 1.0.1)

From app 1.0.1 most fixes to JS, text and screens reach players without a store review, through EAS Update (expo-updates).

## How the app takes an update

- At every cold start the native side asks the update server for the build's channel and runtime version. It never waits: the app opens on what it has (`fallbackToCacheTimeout: 0`) and downloads in the background.
- When the app comes back to the foreground it asks again, at most every 30 minutes (`apps/app/src/lib/otaThrottle.ts`, wired in `otaUpdates.ts`). Once an update is downloaded it stops asking for that session.
- A downloaded update is applied at the next cold start. The app never reloads by itself, so nobody is thrown out mid-vote.
- Off in development, in Expo Go and on the web (the web ships with Vercel, as before).

In practice: publish, and a player gets the fix the second time they open the app from cold (first open downloads, next open runs it).

## Runtime version: `appVersion`

`app.json` has `"runtimeVersion": { "policy": "appVersion" }`. A 1.0.1 build only takes updates published for runtime `1.0.1`; a 1.0.2 build only those for `1.0.2`.

Why not `fingerprint`: the fingerprint is a hash of the native project, and it has to come out the same on the Mac that builds iOS locally, on EAS cloud for Android and on the machine that runs `eas update`. A small difference (a tool version, a file outside git) gives a different hash and the update silently reaches nobody. `appVersion` is plain and readable in the dashboard.

The cost: the version is a promise that the native side has not changed. **Any native change needs a new version (`expo.version` in `apps/app/app.json`) before the store build**, otherwise an update made for the new native code could reach the old builds and crash them.

## Publish an update

From `apps/app`, on the code that should ship (normally the latest `v2`):

```sh
eas update --channel production --environment production --message "fix: ..."
```

- `--environment production` takes the `EXPO_PUBLIC_*` values (Supabase, PostHog, RevenueCat) from the EAS production environment, the same as a store build. Without them the bundle could ship pointing at no backend, so check `eas env:list --environment production` the first time.
- The update goes to every build on that channel with the same runtime version (`1.0.1` now). Android and iOS both, unless `--platform` is given.
- Try it first on the preview channel (`--channel preview`) with an internal build of the same version.

## What can go over the air

Yes: JS and TypeScript (screens, logic, copy, `@netprophet/*` packages), images, fonts and sounds that are imported in code.

No, needs a store build with a new version:

- a new or upgraded native module (anything in `package.json` with native code, an Expo SDK upgrade);
- changes to the native part of `app.json`: plugins, permissions, `ios.infoPlist`, `android` settings, icon, splash, bundle id, scheme;
- new permissions of any kind;
- `apps/app/plugins/*` (native config, such as the UIScene plugin).

When in doubt: if the change touches `package.json` dependencies or `app.json`, it is a store build.

## Roll back

- To an earlier update: `eas update:republish --group <group id>` (or pick the update in the dashboard and republish). Players get it like a new update.
- To what is inside the store build: `eas update:roll-back-to-embedded --channel production --runtime-version 1.0.1`.
- A rollback also needs two cold starts to reach a phone. An update that crashes at launch is rolled back by expo-updates on that phone by itself, to the last update that worked.

## Apple and Google

Apple allows downloaded JS and assets after review, as long as the update does not change the app's primary purpose (App Review Guideline 2.5.2 and the Developer Program License section on interpreted code). Fixes, text and screen changes in the same app are fine. Google Play allows the same for JS bundles. A new feature of real size goes through the store anyway.

## Before the first real update

1. Build 1.0.1 for iOS and Android with this change in (builds without expo-updates never take updates).
2. Check a Release build of iOS launches (UIScene plugin, iOS 27).
3. Publish a small update on `preview`, open an internal build twice from cold and see it.
4. The first `eas update --channel production` creates the update branch for the channel if it does not exist.
