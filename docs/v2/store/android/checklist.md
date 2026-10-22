# Google Play: going live on production

Drafted 22 Oct 2026. Ordered so each step only needs the ones above it; iOS runs in parallel and the two
«Release» steps at the end go out the same day. Owner: **F** founder (Play Console, RevenueCat, Expo, Firebase,
Google Cloud: accounts and keys are never typed by Claude), **C** Claude (code, docs, checks), **F+C** the founder
clicks while Claude prepares or verifies.

Where things stand: Play app 4974301376563892711 (developer 5453313776669476156, Monad Labs, an organisation
account, so Play's «12 testers for 14 days» rule for new personal accounts does not apply). Internal testing is live
with version code 2 (0.1.0, built 21 Oct). Checked in that AAB: target SDK 36 and min SDK 24 (the newest Android
level, so it meets Play's yearly target rule), Play Billing 8.3.0 through react-native-purchases 10.14 (newer than
any version Play has retired), every native library 16 KB aligned on all four ABIs (Play requires it for apps that
target Android 15 and up), no `AD_ID`, no
media, location, camera or microphone permissions.

## Blockers found in the code

| # | Blocker | Status |
|---|---|---|
| B1 | **Play subscriptions grant no Pro.** RevenueCat sends a Play subscription's `product_id` as `<subscription_id>:<base_plan_id>` (for example `pro_monthly:monthly`), but `api.apply_store_event` looks it up with an exact match in `core.store_products` (`20270221000000_security_pass_2.sql`). Every Play Pro purchase would be recorded as «unknown product» and grant nothing. The app side already handles both forms (`apps/app/src/lib/store.ts`). Cosmetics (one-time products) are not affected. | **Not fixed here**: the DB change was outside what this session was allowed to write. Fix (C, next PR, with a pgTAP case): in a new migration, replace the product lookup with `where product_id in (e ->> 'product_id', split_part(e ->> 'product_id', ':', 1)) order by (product_id = e ->> 'product_id') desc limit 1`, test `pro_monthly:monthly` granting Pro, then `scripts/v2-db-remote.sh push` (F). Must land before any real Play subscription. |
| B2 | No web page for account deletion (Play requires a URL besides the in-app path). | **Fixed in this PR**: `/delete-account` and `/en/delete-account` on netprophetapp.com; /support points to it. Goes live when the site deploys. |
| B3 | No terms of use. Play's UGC and subscription rules expect them, Apple asks for an EULA link on the Pro screen. Shared with iOS. | **Drafted (22 Oct)**: `/terms` and `/en/terms` on the site (footer and /support link to them), «Όροι χρήσης» and «Απόρρητο» links on the Pro screen and in Εγώ › Ρυθμίσεις. F and a lawyer review the text before launch. |
| B4 | The privacy policy does not name RevenueCat as a processor. | **Done (22 Oct)**: RevenueCat is listed, and the sponsored banners are described (no ad SDK). F approves the text with the terms. |

Smaller things, fixed in this PR or not blocking:
- `SYSTEM_ALERT_WINDOW` (draw over other apps) came from the Expo template and nothing uses it: blocked in `app.json`
  (`android.blockedPermissions`), with a test (`apps/app/plugins/appConfig.test.js`). Takes effect from the next build.
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` with `maxSdkVersion 32` come from Expo modules; harmless and not
  declared anywhere on Play. Blocking them too is possible after a check that sharing a card still works on an
  Android 10 phone.
- Notification permission: asked once, after the first vote (`askForPushOnce` in `src/lib/push.ts`), never at
  launch; the Android channel is made only after a yes. Fine for Android 13+.
- No «manage subscription» link on the Pro screen. Not required by Play, but it saves support mail: a row that opens
  `https://play.google.com/store/account/subscriptions?package=gr.monadlabs.netprophet` (C, small).
- Version: `1.0.0` on both stores (founder, 22 Oct 2026; `apps/app/app.json`). The version code and iOS build number stay with EAS (`appVersionSource: remote`).

## Steps

| # | Step | Owner |
|---|---|---|
| 1 | Merge this PR. Deploy the site (Vercel builds `apps/site` from `v2`) and open https://netprophetapp.com/delete-account and /en/delete-account. | F |
| 2 | Fix B1 (migration + pgTAP), merge, `scripts/v2-db-remote.sh push`. | C, then F |
| 3 | **Play products.** Retry the service-account writes on 23 Oct 11:00 (it gets 403 on monetization writes although the permissions are ticked; the grant can take up to 24 to 36 hours to reach the API). If it still fails, create the 3 Pro subscriptions by hand: Play Console › Monetize › Subscriptions. | C retries, F by hand |
| 3a | Subscriptions, ids exactly `pro_monthly`, `pro_yearly`, `pro_founding`. One auto-renewing base plan each (`monthly` P1M 8,99 €; `yearly` P1Y 69,99 €; for founding see 3c). Each with an offer «free trial» of 7 days, eligibility «new customer acquisition: never had this subscription» (or «never had any subscription» so one free week per person across plans; F decides). Set the EUR price; let Play convert the rest or limit countries (step 9). Activate base plans and offers. | F |
| 3b | 26 one-time products (cosmetics), ids and prices from `docs/v2/store-products.csv` (`cos_*`, 0,99 € or 1,99 €). Note #282 switched off `frame_founding` and `frame_friends`; they are earned, not sold, so the list is unchanged. | C (API) or F |
| 3c | Founding plan. The 17 Oct plan says 49,99 € the first year, then 69,99 €; the site says «49,99€ τον χρόνο». On Play the honest shape is: product `pro_founding`, base plan `yearly` at 69,99 €, an offer with two phases (7 days free, then one year at 49,99 €), ended on 31 Dec by deactivating the offer. If instead it stays 49,99 € every year, it is a plain 49,99 € base plan. F decides; the copy on the site and the Pro screen follows. | F |
| 4 | **RevenueCat, Play app.** Project › Apps › add Google Play app, package `gr.monadlabs.netprophet`. Upload the service account JSON (the same Google Cloud service account, with «View financial data» and «Manage orders and subscriptions» in Play Console › Users and permissions). | F |
| 4a | Import products from Play (RevenueCat › Products › Import). Attach the three subscriptions to the entitlement `netprophet_pro`. In the default offering, put each Play subscription next to its App Store and web twins in the matching package (monthly, annual, and the custom founding package). Cosmetics stay as products, not in an entitlement. | F |
| 4b | Real-time developer notifications: in RevenueCat's Play app settings, connect Google Real-Time Developer Notifications; it gives a Pub/Sub topic. Paste that topic in Play Console › Monetize › Monetization setup › Real-time developer notifications, then «Send test notification» and see it arrive in RevenueCat. | F |
| 4c | Check the webhook to `revenuecat-webhook` covers the Play app (it is per project, so it should) and that a test event arrives with `store: PLAY_STORE`. | F+C |
| 5 | **EAS env.** The app reads `EXPO_PUBLIC_RC_ANDROID_KEY` (`apps/app/src/lib/store.ts`; iOS is `EXPO_PUBLIC_RC_IOS_KEY`). Copy RevenueCat's Play public SDK key (`goog_…`) into EAS › Environment variables, environment `production`, visibility «plain text» (it is a public key). Without it the Pro screen says payments open soon. | F |
| 6 | **Push on Android.** `apps/app/google-services.json` is committed (project config, not a secret). Expo needs the FCM V1 service account key to send: Expo › Project › Credentials › Android › FCM V1 service account key. Founder to confirm it is uploaded; if not, make one in Firebase › Project settings › Service accounts and upload it there (never into the repo). Test: a push from admin /v2/notifications reaches an internal-testing phone. | F |
| 7 | **Restrict the Firebase Android API key.** Google Cloud › APIs and services › Credentials › the «Android key (auto created by Firebase)» › Application restrictions: Android apps, package `gr.monadlabs.netprophet` with two SHA-1 fingerprints: the app signing key (Play Console › Test and release › Setup › App signing › «App signing key certificate») and the upload key (same page, or `eas credentials -p android`). API restrictions: Firebase Installations API, FCM Registration API, Cloud Messaging. Check a push still arrives after. | F |
| 8 | **Submit config.** This PR commits `apps/app/eas.json` with `serviceAccountKeyPath: "$GOOGLE_SERVICE_ACCOUNT_KEY_PATH"` (EAS expands environment variables; nothing secret in the repo) and a `play-production` submit profile (track `production`, `releaseStatus: inProgress`, `rollout: 0.2`). On the Mac: `export GOOGLE_SERVICE_ACCOUNT_KEY_PATH=$HOME/.config/netprophet/play-eas-submit.json` (add it to `~/.zshrc`). Or upload the key once in EAS › Credentials › Android › Google Service Account Key for submissions and drop the path line. The iOS agent may touch `submit.production.ios` in the same file: merge carefully. | C (done), F (env) |
| 9 | **Countries and pricing.** Production › Countries/regions: all countries and regions (founder, 22 Oct 2026: no limit). Prices in EUR; check Play's converted prices once, since many countries are added. | F |
| 10 | **Store listing.** Paste `listing.md` (el-GR default, en-US), upload `icon-512.png`, `feature-graphic.png` (el) and `feature-graphic-en.png` (en), and the phone screenshots (see `listing.md`: they need a development build on the emulator, or the iOS frames without the iOS status bar, cropped to 2:1 or less). | F (C makes the screenshots once a build exists) |
| 11 | **App content.** Fill every form from `policy-forms.md` and `data-safety.md`: privacy policy, app access, **ads: Yes**, content rating, **target audience 13 to 15, 16 to 17, 18+ (never under 13)**, data safety (deletion URL `https://netprophetapp.com/delete-account`), government, financial, health, news, advertising ID. | F |
| 12 | Clear the demo matches and the demo sponsored rows in production (`tools/demo/clear_demo.sql`); real sponsor banners are added in admin. The answer to «Contains ads» is Yes either way. | F |
| 13 | **Build.** `cd apps/app && eas build -p android --profile production` (version code goes up by itself, `appVersionSource: remote`). It picks up `blockedPermissions` and the RevenueCat key. | F |
| 14 | **Internal test of the build** (submit with the `production` profile, track internal): sign in with Google and Apple and email, vote, a push, buy Pro monthly as a license tester (Play Console › Settings › License testing: add the testers' Google accounts), see the 7-day trial, see Pro arrive (`core.purchases` row applied, `core.entitlements` trial), cancel, buy one cosmetic, delete a test account. | F+C |
| 15 | **Release notes** (el-GR, en-US, 500 each): «Η πρώτη έκδοση του NetProphet: τα ματς των τουρνουά, τα αποτελέσματα, ο αντίπαλός σου και ένα παιχνίδι για κάθε μέρα.» / «The first NetProphet release: tournament matches, results, your opponent and a game for every day.» | F approves |
| 16 | **Production release.** `eas submit -p android --profile play-production --latest` (or promote the internal release in Play Console › Production › «Promote release»). Staged rollout 20%, then 50% after a day without crashes or payment problems, then 100%. Send for review: Publishing overview › «Send changes for review». Turn on managed publishing if the founder wants Android and iOS to appear on the same day: then «Publish» once both stores have approved. | F |
| 17 | **Review time.** A first production review usually takes a few days and can take up to 7 or longer for a new app. Submit Android at least a week before the launch date and hold it with managed publishing. | F |
| 18 | After going live: Play Console › Android vitals (crashes, ANRs), RevenueCat › Customers for the first Play purchases, and `core.purchases` notes (no «unknown product»). | C |
