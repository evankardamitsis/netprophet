# App Privacy answers (ASC › App Privacy)

Prepared 22 Oct 2026 from the code on `v2`, not from the old draft. Replaces the Apple half of
`docs/v2/store-privacy.md` (the Google Play half there is still the reference for Play). Every row names where the
data comes from in the code so the founder can check it. **Uncertain** rows are marked; decide them before
publishing the labels.

## Where the data goes (processors)

| Service | What it gets | Code |
|---|---|---|
| Supabase (EU project) | account (email, Apple/Google identity), profile, votes, follows, reactions, kudos, logged matches, cosmetics, push tokens, entitlements | `apps/app/src/lib/supabase.ts`, `supabase-v2/migrations` |
| PostHog Cloud EU | events from `@netprophet/core` `AnalyticsEvents`, screen names without ids, app lifecycle events, device model / OS / app version / locale / timezone; identified by our user id, never the email | `apps/app/src/lib/analytics.ts` |
| RevenueCat | our user id as App User ID, the App Store receipts, purchase and subscription history | `apps/app/src/lib/store.ts`, `supabase-v2/functions/revenuecat-webhook` |
| Expo push service | the Expo push token and the notification text | `apps/app/src/lib/push.ts`, `core.send_push` |
| Resend | the email address, for the sign-in code email | Supabase SMTP |
| Apple / Google sign-in | name and email they share at sign-in | `apps/app/src/lib/auth.tsx` |

Checked for tracking:
- **No IDFA.** No `NSUserTrackingUsageDescription`, no AdSupport, no ATT prompt. `posthog-react-native` 4.x reads
  only app name/version/build (`expo-application`), device model/OS (`expo-device`) and locale/timezone; it does not
  read the IDFA or the IDFV (checked `node_modules/posthog-react-native/dist/native-deps.js`). Its `distinct_id` is a
  random id until `identify(userId)`.
- RevenueCat's `collectDeviceIdentifiers()` (IDFA/IDFV) is **not** called anywhere.
- No ads SDK, no data broker, no data combined with third-party data for advertising.
- The «Χορηγούμενο» card on Σήμερα is staff-made content from our own database (`apps/app/src/mock/sponsored.ts`,
  `fromSponsored`), with no ad network and no tracking of who sees it beyond our own PostHog events.

## Answers

**Do you or your third-party partners collect data from this app?** Yes.

**Tracking (as Apple defines it):** **No** for every data type. Nothing is linked with third-party data for
advertising or shared with data brokers.

| Apple data type | Collected | Linked to identity | Used for tracking | Purposes | Source |
|---|---|---|---|---|---|
| Contact Info › Email Address | Yes | Yes | No | App Functionality | Sign-in by code, Apple, Google |
| Contact Info › Name | Yes | Yes | No | App Functionality | Onboarding name; Apple/Google first sign-in; shown to others on the Ladder and profiles |
| User Content › Other User Content | Yes | Yes | No | App Functionality | Logged matches (`+ Ματς`), reactions, kudos, Baller name, reports |
| Identifiers › User ID | Yes | Yes | No | App Functionality, Analytics | Supabase user id; PostHog `identify`; RevenueCat App User ID |
| Usage Data › Product Interaction | Yes | Yes | No | Analytics | PostHog events and screens, by user id |
| Purchases › Purchase History | Yes | Yes | No | App Functionality | RevenueCat + `core.entitlements` / owned cosmetics |
| Other Data › Other Data Types | Yes | Yes | No | App Functionality | Gender (categories and match rules), playing hand, tournament experience, the claimed roster player |
| Location › Coarse Location | Yes (see 1) | Yes | No | App Functionality | The area the user picks («Πού παίζεις;»), not read from the device; also PostHog's GeoIP city if it is on |
| Identifiers › Device ID | Yes (see 2) | Yes | No | App Functionality, Analytics | Expo push token (only if notifications are allowed) and PostHog's random install id |
| Diagnostics › Crash Data | No | | | | No crash SDK in `apps/app/package.json` |
| Diagnostics › Performance Data | No | | | | |
| Diagnostics › Other Diagnostic Data | **Uncertain**, see 3 | Yes | No | Analytics | PostHog device model, OS version, app version |

Not collected: Health & Fitness, Financial Info (payment details stay with Apple), precise Location, Sensitive Info,
Contacts, Emails or Text Messages, Photos or Videos (no image picker in the app), Audio, Gameplay Content, Customer
Support (support is by email outside the app), Browsing History, Search History (the player search runs on our
server and is not stored), Advertising Data.

### Uncertain, for the founder

1. **Area as Coarse Location.** Apple defines coarse location as a user's or device's approximate location. The app
   never reads GPS; the user picks an area from a list. Many apps declare a user-chosen city as "Other Data". The
   conservative answer is to declare Coarse Location (linked, App Functionality); it costs nothing on the listing.
   Recommendation: declare it, as the Play form does (`docs/v2/store/android/data-safety.md`). PostHog Cloud
   also adds a GeoIP city from the IP address unless «Discard client IP data» is on in the PostHog project; either
   turn that on or add Analytics as a purpose here.
2. **Push token as Device ID.** Apple's examples for Device ID are the advertising identifier and similar
   device-level ids. A push token is not usually declared, but the Play form declares it with PostHog's install id,
   and the two stores should say the same. Recommendation: declare it (linked, App Functionality and Analytics,
   no tracking).
3. **Device model and OS in PostHog.** Apple lists "other data collected for measuring technical diagnostics".
   PostHog sends model, OS and app version with each event for product analytics, not diagnostics. Recommendation:
   do not declare as Diagnostics; it is covered by Product Interaction. Declare it if the founder prefers the
   cautious reading.
4. **Name visible to others.** Names, the claimed player, points and Ladder place are visible to other users. That is
   not "sharing" in Apple's sense (it is the product), but the privacy policy says it plainly, which is what Apple
   checks.

## Account deletion and data

`api.delete_my_account()` (Εγώ › Ρυθμίσεις › «Διαγραφή λογαριασμού») deletes the `auth.users` row at once; every row
tied to it goes with it, a claimed roster player goes back to unclaimed, and matches the user logged stay without
the link. The privacy policy says data is erased within 30 days, which is consistent (it is immediate in practice).
PostHog events and RevenueCat records are not deleted by that call: see checklist.md, item "Deletion downstream".

## Changes made in this PR so the policy matches the labels

`apps/site/src/legal.ts`: Expo (sending notifications) is added to the processors (RevenueCat and the sponsored
banners came with #289), and the line «Μπορείς να κρύψεις το προφίλ σου από τις Ρυθμίσεις» became «γράψε μας και
κρύβουμε το προφίλ σου», because the app has no such setting (only the shared match link page `app/m/[token].tsx`
lets a player without an account hide). The Play form (`android/data-safety.md`) is corrected the same way. Both texts
are drafts for the founder.
