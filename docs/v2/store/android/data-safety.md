# Google Play Data safety form

Drafted 22 Oct 2026 from the code on `v2` and the production AAB of 21 Oct (version code 2). It replaces the Play part
of `docs/v2/store-privacy.md` (16 Oct), which said purchases were «once sold»: RevenueCat and Play Billing 8.3.0 are
in the build now. Keep it the same as the iOS privacy labels in the iOS package; where this file differs from the
16 Oct Apple table (location, purchases), the Apple answers should move too.

Where the facts come from:
- Accounts: Supabase Auth (email OTP via Resend, Google, Apple). `core.profiles`: name, area, sport, gender (from the
  name or the claimed player, for the right categories), claimed player, Baller name and look.
- Activity: votes, points, σερί, follows, reactions, kudos, logged matches, quiz answers, cosmetics (`supabase-v2`).
- Analytics: PostHog Cloud EU (`apps/app/src/lib/analytics.ts`), release builds only, `identify(userId)` with locale
  and platform, never the email; app lifecycle events and named product events; no session replay, no autocapture
  of text.
- Push: Expo push token through FCM (`src/lib/push.ts`), only after the person allows notifications.
- Purchases: RevenueCat (`react-native-purchases`, app user id = our user id) and Google Play Billing; the webhook
  writes `core.purchases` (product, store, price, expiry).
- Not in the build: ads SDK, advertising ID (`AD_ID` is not in the merged manifest), location permission, camera,
  microphone, contacts, photos or media permissions, crash reporting SDK. The win and Baller share cards are drawn on
  the phone (`react-native-view-shot`) and handed to the system share sheet; nothing is uploaded.

## Overview questions

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | Yes |
| Is all of the user data collected by your app encrypted in transit? | Yes (HTTPS to Supabase, PostHog EU, RevenueCat, Expo push) |
| Which of the following methods of account creation does your app support? | Username and other authentication (email one-time code), and OAuth (Sign in with Google, Sign in with Apple). No passwords. |
| Account deletion URL | https://netprophetapp.com/delete-account |
| Do you provide a way for users to request that some or all of their data is deleted without deleting their account? | Yes: by email to hello@monadlabs.gr (the privacy policy promises an answer within 30 days). Also in the app: unfollow, remove a reaction. Hiding a profile is by email (the app has no such setting). |
| Data shared with third parties? | No. Supabase, Vercel, Resend, PostHog, RevenueCat, Google (FCM, Play Billing) and Expo act for us as service providers, which Play does not count as sharing. Google and Apple sign-in send data to us, not from us. |

## Data types collected

Every row: collected, not shared, processed not only ephemerally. «Required» means the app does not work without it;
«Optional» means the person can say no.

| Category | Data type | Required? | Purposes | Notes |
|---|---|---|---|---|
| Location | Approximate location | Required | App functionality, Personalization | Not from the device: the person picks the area they play in («Πού παίζεις;»), which orders tournaments and players. See «Decide» below. |
| Personal info | Name | Required | App functionality, Account management | First name and surname at sign-up; shown to other users. |
| Personal info | Email address | Required | Account management, App functionality | Sign-in codes and account email. |
| Personal info | User IDs | Required | App functionality, Analytics, Account management | Our account id; the same id goes to PostHog and RevenueCat. |
| Personal info | Other info | Required | App functionality | Gender, for the right categories and match rules; the Baller name. |
| Financial info | Purchase history | Optional | App functionality, Account management | Only for people who buy Pro or a cosmetic. Card details stay with Google Play; we never see them. |
| App activity | App interactions | Required | Analytics, App functionality | Screens opened (by route, no ids) and named product events. |
| App activity | Other user-generated content | Required | App functionality | Votes, reactions, kudos, logged matches, quiz answers. Shown to other users where the app says so. |
| App activity | In-app search history | Not collected | | Player search runs on the server and is not stored. |
| Device or other IDs | Device or other IDs | Optional | App functionality, Analytics | The push token, only if notifications are allowed; PostHog's random install id. Not the advertising ID. |

Not collected: precise location, phone number, address, race or ethnicity, political or religious beliefs, sexual
orientation, financial details or credit score, health and fitness, emails or SMS or other messages, photos, videos,
audio, music, files and docs, calendar, contacts, web browsing history, installed apps, crash logs, diagnostics,
other app performance data.

## Decide (founder) before submitting

1. **Approximate location.** Play counts location a user types in, not only GPS. The safe answer is the row above
   (declared, from the chosen area). Apple's label then needs «Coarse location: App functionality, linked» too, where
   the 16 Oct draft said none. If PostHog's GeoIP is on in the project settings, PostHog also derives a city from the
   IP: either turn GeoIP off in PostHog (Project settings) or add «Analytics» to the location purposes.
2. **Deletion and PostHog.** Deleting an account (`api.delete_my_account`) removes the sign-in and everything that
   hangs off it in our database at once; purchase rows stay with the user id cleared (`on delete set null`). PostHog
   events stay under the old random id. The delete page promises to erase them on request by email, within 30 days,
   which matches the privacy policy. Automating that (a PostHog person delete when the account goes) is a small
   follow-up, not a blocker.
3. **Ads: Yes** (founder, 22 Oct 2026; see `policy-forms.md`). Nothing here changes: the sponsored banner is our own
   server sending a picture and a link, with no ad SDK, no advertising ID, no impression or click tracking and no
   data sent to the sponsor. So no extra data type is declared for ads, and «Data shared with third parties» stays
   «No».

## Privacy policy alignment

`https://netprophetapp.com/privacy` (`apps/site/src/legal.ts`) lists the account, profile, activity, purchases, push
key and PostHog usage data, the processors (RevenueCat added 22 Oct 2026, for managing purchases and subscriptions:
the account id goes out, the purchase status comes back), the sponsored banners (no ad SDK, no advertising ID, nothing
given to sponsors), 15 and over, and the rights. The terms of use are at `https://netprophetapp.com/terms`.
