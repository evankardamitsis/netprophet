# iOS 1.0 submission checklist

Prepared 22 Oct 2026. Nothing has been submitted and App Store Connect was not touched. «Who» says who does the
step: **F** = founder (needs the Apple, RevenueCat or Supabase accounts), **C** = Claude (code or docs, in a PR).

## 1. App Review blockers found in the code

| # | Guideline | Finding | State |
|---|---|---|---|
| B1 | 3.1.1 restore | No «Restore purchases» anywhere; Pro (auto-renewable) and the cosmetics (non-consumable) need one | **Fixed in this PR**: `restore()` in `apps/app/src/lib/store.ts` (RevenueCat `restorePurchases`), «Επαναφορά αγορών» on the Pro screen, outcome lines, tests in `pro.test.ts` |
| B2 | 3.1.2 subscription terms | The Pro screen showed price, period and the trial line, but no auto-renewal sentence outside the trial and no links to Terms of Use and the Privacy Policy | **Fixed**: «Όροι χρήσης · Απόρρητο» to our own netprophetapp.com/terms and /privacy came with #289; this PR adds the renewal and cancel sentence and «Επαναφορά αγορών» in the same row, tests |
| B3 | 2.1 completeness | Without `EXPO_PUBLIC_RC_IOS_KEY` in the production build, or without the products in a RevenueCat offering, «Ξεκίνα τη δωρεάν εβδομάδα» falls back to the waitlist line «Οι πληρωμές ανοίγουν σύντομα…». A reviewer who taps it rejects the app | **F**: see section 3 |
| B4 | 2.1 sign-in | The reviewer needs a way in. Email codes go to an inbox Apple cannot read | **F** decides; options in review-notes.md (recommended: Sign in with Apple, option C ready to build) |
| B5 | 2.1 / build | Without `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` the app runs on sample data with no sign-in at all (`apps/app/src/lib/supabase.ts`). The EAS production environment must carry both, and must not carry `EXPO_PUBLIC_DEV_GUEST` | **F** sets EAS env; **C** can verify a TestFlight build |
| B6 | 2.1 version | `apps/app/app.json` was 0.1.0 | **Resolved** in #289: 1.0.0. Name the ASC version 1.0.0 to match |

Small fix also in this PR (not a guideline item, but it showed in the screenshots): a match without a time showed
«Σήμερ / α» on two lines in Σήμερα's rows; the label now stays on one line (`VoteRow.tsx`, `HomeCards.tsx`).

Checked and fine:
- **Account deletion (5.1.1(v))**: in the app, Εγώ › Ρυθμίσεις › «Διαγραφή λογαριασμού», immediate
  (`api.delete_my_account`), plus the web page netprophetapp.com/delete-account (#285). Not a blocker.
- **Sign in with Apple (4.8)**: Apple's own button on the sign-in screen next to Google, iOS only.
- **Report and block (1.2)**: SafetySheet on results, cards and profiles; blocked list in Ρυθμίσεις; logged matches
  wait for staff approval.
- **Other platforms**: no Android, Google Play or "web version" text in the Greek or English copy the user sees
  (Google appears only as «Συνέχεια με Google» and the account-provider hint, which is fine).
- **"beta" or "test" wording**: none in shipped UI. «Δοκιμή onboarding», «Τα avatar (δοκιμή)», the dev guest
  «Άλλη φορά» and the new-player toggle are behind `__DEV__` (and `EXPO_PUBLIC_DEV_GUEST`), so a release build has
  none of them.
- **Placeholder text**: only real input hints («esy@email.gr», «Πώς λέγεται το τουρνουά;»).
- **Gambling (5.3)**: no stakes, odds, coins or cash-out; see metadata.md age rating notes.
- **Export compliance**: `ios.config.usesNonExemptEncryption: false` is in app.json, so the build uploads with
  "uses only exempt encryption" (HTTPS only) and ASC does not ask.

## 2. Risks to decide before submitting (not certain rejections)

| # | Risk | Suggestion | Who |
|---|---|---|---|
| R1 | **Sign in with Apple token revocation.** Apple asks apps that offer SIWA to revoke the user's Apple tokens (REST API `auth/revoke`) when the account is deleted. `delete_my_account` deletes our row only | An edge function that revokes with the Sign in with Apple key, called before the delete. Needs the founder's SIWA key (.p8) in Supabase secrets. Rarely enforced at review, but documented | F gives the key, C builds |
| R2 | **Founding plan wording** (PR #291 brings «49,99€ τον πρώτο χρόνο, μετά 69,99€»; then `pro_founding` must really renew at 69,99, i.e. an introductory offer on `pro_yearly`, not a separate product). The card says «49,99€ ο πρώτος χρόνος · μέχρι 31/12», which reads as a first-year price. In `docs/v2/store/products.csv` `pro_founding` is a separate yearly product, so it renews at 49,99 every year | Either say «49,99€ τον χρόνο · μόνο μέχρι 31/12» (it stays at that price), or make the founding price an introductory offer on `pro_yearly` that renews at 69,99. Apple reviews renewal disclosure under 3.1.2 | F decides, C changes copy |
| R3 | **Trial line vs StoreKit.** «Σήμερα 0€» comes from our database (`trial_available`), not from Apple's intro-offer eligibility. A sandbox Apple ID that used a trial would see a charge in Apple's sheet | Ask RevenueCat `checkTrialOrIntroductoryPriceEligibility` before showing the trial button | C, after 1.0 or before if the founder wants |
| R4 | **Restore across accounts.** `api.apply_store_event` handles RevenueCat `TRANSFER` (migration 20270221000000): Pro moves to the account that restored. Bought cosmetics stay on the old account, so a restore on another NetProphet account brings Pro back but not the cosmetics | Keep RevenueCat's "Restore behavior" on "Transfer to new App User ID"; decide whether cosmetics should follow (a small migration) | F decides |
| R5 | **Age.** The privacy policy says 15 and over; Apple's tiers are 4+, 9+, 13+, 16+, 18+ | Accept what ASC computes and align the policy, or raise to 16+ | F |
| R6 | **Empty Σήμερα during review.** A new reviewer account sees only real matches; on a day without tournaments the main screen is thin | Submit when a tournament is on, and keep the demo matches until approval (STATUS says clear them before launch) | F |
| R8 | **Our own terms of use.** | **Resolved** in #289: netprophetapp.com/terms, linked on the Pro screen and in Ρυθμίσεις. ASC's licence field can stay Apple's standard EULA | done |
| R7 | **Deletion downstream.** Deleting an account does not delete the PostHog person or the RevenueCat customer | Not a review item; for GDPR, a small edge function or a monthly staff task | C later |

## 3. App Store Connect, step by step

| Step | Where | Who | Notes |
|---|---|---|---|
| Paid Apps agreement **Active**, bank and tax forms done | ASC › Business | F | Without it IAPs stay "Missing Metadata" and cannot be reviewed |
| Pricing and availability | App › Pricing and Availability | F | Free app; countries: Greece at least (Cyprus if wanted). Check it is set |
| App Information | App › App Information | F | Name, subtitle, categories (Sports, Entertainment), content rights: "does not contain third-party content requiring rights" is **not** right, because match data comes from organisers' public sheets. Answer "Yes, contains third-party content" and confirm the right to use it (founder decision 9 Oct: ingestion approved) |
| Age rating questionnaire | App Information › Age Rating | F | Answers in metadata.md |
| App Privacy | App › App Privacy | F | Answers in privacy-labels.md; privacy policy URL https://netprophetapp.com/privacy |
| Subscription group "NetProphet Pro" | Monetization › Subscriptions | F | `pro_monthly` 8,99, `pro_yearly` 69,99, `pro_founding` 49,99 (see R2); each with a 1-week free introductory offer; display name and description in el and en; **a review screenshot** of the Pro screen (`screenshots/iap-review/pro-paywall-1320x2868.jpg`) |
| Cosmetics | Monetization › In-App Purchases | F | 26 non-consumables from `docs/v2/store/products.csv`, each with price, el/en name, description and a review screenshot (a wardrobe screenshot is fine: `screenshots/6.9/10-baller.jpg`) |
| Prices match the app | | F | The app shows prices from our database (`core.store_products` via `api.proOffer`), not from StoreKit. ASC prices must equal them (8,99 / 69,99 / 49,99 / 0,99 / 1,99) |
| App Store Connect API / In-App Purchase key uploaded to RevenueCat | ASC › Users and Access › Integrations; RevenueCat › App settings | F | So RevenueCat can validate receipts |
| App Store Server Notifications (v2) URL | App Information | F | The URL RevenueCat gives |
| RevenueCat: iOS app, products, entitlement `pro`, an offering with all Pro packages; webhook to `revenuecat-webhook` with the secret | RevenueCat | F | The function is deployed with `--no-verify-jwt` and `REVENUECAT_WEBHOOK_SECRET` set (see the file header) |
| EAS production env | expo.dev › Environment variables (production) | F | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_RC_IOS_KEY`; **not** `EXPO_PUBLIC_DEV_GUEST` (B3, B5) |
| Version string | `apps/app/app.json` | done (1.0.0, #289) | B6 |
| Build and upload | `eas build -p ios --profile production`, `eas submit -p ios` | F (or C if the founder runs it with his Expo login) | Then TestFlight: sign in, vote, open Pro, buy in sandbox, restore, delete a test account; check the Pro screen on the smallest device in TestFlight (the price, renewal sentence and links sit in a fixed footer) |
| Version 1.0 page | App › iOS App › 1.0 | F | Screenshots (6.9" and 6.5" from `screenshots/`), promotional text, description, keywords, support and marketing URLs (metadata.md), copyright «2026 Monad Labs», pick the build |
| Attach the IAPs to the version | 1.0 page › In-App Purchases and Subscriptions | F | First IAPs must go in with the version, or they are not reviewed |
| App Review Information | 1.0 page | F | Contact (founder), sign-in (B4), notes from review-notes.md |
| Release option | 1.0 page | F | "Manually release" recommended, so launch day is the founder's choice |
| Submit for Review | | F | Only after every row above |

## 4. What is in `docs/v2/store/`

- `metadata.md`: name, subtitle, promotional text, description, keywords, what's new, URLs, categories, age rating.
- `privacy-labels.md`: App Privacy answers with sources and the uncertain rows.
- `review-notes.md`: the sign-in decision and the reviewer notes to paste.
- `checklist.md`: this file.
- `android/`: the Google Play package (#285), separate; keep the two privacy answers the same.
- `screenshots/6.9/` 1320x2868 and `screenshots/6.5/` 1284x2778, ten each, JPEG without alpha (ASC refuses PNGs
  with an alpha channel). `screenshots/iap-review/` the Pro screen for the subscription review screenshot.

Screenshots were taken on an iPhone 17 Pro Max simulator (iOS 27) in Expo Go, with the development sample data and
no backend (no Supabase keys in the environment, so nothing touched a real account), the status bar set to 9:41.
For the shots only, the sample data's surnames were swapped for invented ones on the local copy (not committed),
because some sample names belong to real people. The 6.5" set is the 6.9" set scaled to 1284 wide with 6 px cut
from the top and bottom (Apple checks the pixel size, not the device). Order on the listing:

1. `01-simera` Σήμερα with «Οι δικοί σου» and the PRO tag in the header
2. `02-psifise` voting rows, one call made, the split showing
3. `03-seri` the σερί celebration
4. `04-tournoua` a tournament: Πρόγραμμα, «Τώρα / Μετά»
5. `05-poreia` holding a name: the player's path in the draw
6. `06-paiktis` a player card
7. `07-apotelesmata` results with «Το ’πες» in lime and an upset
8. `08-pro-antipalos` Pro: the opponent before the match
9. `09-katataxi` the Ladder with the podium
10. `10-baller` the Baller wardrobe on Κορνίζες, with the markers («Κέρδισέ το», ✓ owned, «Το κέρδισες») and
    «Μόνο στυλ. Δεν αλλάζει level, ψήφους ή Κατάταξη.»

**Before upload, the founder confirms no name in the ten shots is a real roster player** (the ones kept from the
sample data, e.g. Καρρά, Λαζάρου, Μάνου, Ντίρζου, Αλεξίου, Παπαδάκης, Χατζής, Λιάκας, Πετρίδης, Νικολής, could match
someone); if one does, say which and the shot is retaken.

The tournament screen has two tabs in the app today, Πρόγραμμα and Ταμπλό (no separate «Σήμερα» tab; today is a
day chip). No caption overlays: plain screens. If the founder wants captions, the 16 Oct lines in
`docs/v2/store-listing.md` fit shots 1, 7, 8, 9 and 10.
