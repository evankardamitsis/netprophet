# Founding pricing: 49,99€ the first year, then 69,99€

Founder decision, 22 Oct 2026: Pro «Ιδρυτικό μέλος» costs **49,99€ for the first year** and **renews at 69,99€ a
year** after it. It is sold only until **31/12/2026** (23:59 Athens). Every plan starts with the store's **7-day free
trial** (with a card, charged on day 8 unless cancelled).

This page is the plan: what each store can do, what we recommend, the exact store steps (for the orchestrator, after
the founder approves), and what changed in the repo (PR `v2-founding-pricing`).

## Where we start (22 Oct)

- App Store Connect, app 6824998331, subscription group «Pro» (22500106): `pro_founding` is an annual subscription at
  49,99€ with an introductory offer «free trial, 1 week» in 175 territories. READY_TO_SUBMIT, not live.
  `pro_yearly` 69,99€ and `pro_monthly` 8,99€, each with the same 1-week trial.
- RevenueCat: entitlement `netprophet_pro`; default offering packages `founding` → `pro_founding`,
  `$rc_annual` → `pro_yearly`, `$rc_monthly` → `pro_monthly`.
- Google Play: no products yet (the service account gets 403 on monetization writes).
- Server: `api.pro_offer` shows `pro_founding` instead of `pro_yearly` until 31/12 Athens, then `pro_yearly`.
  «Πρώτη γενιά» (PR #283) goes to whoever first took `pro_founding` by 31/12 Athens, given on the first paid event.

## What each store can do

### App Store

| Option | Trial | 49,99 then 69,99 | Verdict |
|---|---|---|---|
| A. `pro_founding` at 69,99€ with an introductory offer «pay up front, 1 year, 49,99€» | **No.** Apple allows one introductory offer per subscription, and a person redeems one per subscription group. An offer is one type (free trial, pay as you go, pay up front), never a free trial followed by a discount. | Yes, natively | Breaks «every plan has 7 days free» |
| B. `pro_founding` stays 49,99€ with the 1-week trial; a price change to 69,99€ for existing subscribers starts 1/1/2027 | Yes | Yes, see below | **Recommended** |
| C. Free trial as the intro offer, then a promotional offer (server-signed through RevenueCat) for the first paid year | Yes | Only if the player redeems the promo inside the app during the trial week; a promo on a running subscription starts at the next renewal | Fragile, needs a second purchase step |
| D. Offer codes that stack with the intro offer | Yes | Only through code redemption | Not a paywall flow |

Why B works (Apple, «Manage pricing for auto-renewable subscriptions» and «price increase thresholds»):

- **No consent in Greece.** Consent is required only when the increase is more than 50% **and** more than the
  threshold (annual: 50€ in Greece and the other eurozone storefronts), or the subscriber had an increase in the last
  12 months, or the storefront always requires consent. 49,99 → 69,99 is +20€ and +40%: Apple only notifies (email 27
  days before the renewal, an in-app message, a push 7 days before). The subscriber renews at 69,99€ unless they
  cancel.
- **Always consent:** Austria, Germany, Poland, Republic of Korea. There Apple asks for consent from 60 days before
  the renewal; without it the subscription ends at the end of the 49,99€ year. Few founding members will be there.
- **The trial and the first year are safe.** «Subscribers on introductory or promotional prices, including free
  trials, renew for at least one more period at the price shown when they subscribed.» A trial started on 31/12 that
  converts on 7/1 is charged 49,99€ for its first year, then 69,99€.
- **Timing.** Everyone who buys founding buys by 31/12/2026, so their first renewal is from late October 2027 on, long
  after a 1/1/2027 start, with Apple's notice window (30 days minimum) easily met.
- **Irreversible once in effect.** A scheduled change can be deleted before its start date; after it, not.
- Apple's purchase sheet shows «49,99€/year» after the trial. That is true for the first year; our Pro screen and the
  product description say what follows.

### Google Play

| Option | Verdict |
|---|---|
| C. Product `pro_founding`, base plan `yearly` at 69,99€, an offer with two phases: 7 days free, then one year at 49,99€ (one recurrence of P1Y). Eligibility «new customer acquisition, never had this subscription». Deactivated on 1/1/2027 | **Recommended.** Play-native, no notice, no consent, no in-app price-change screen |
| Base plan at 49,99€ and a price increase later | Play's opt-out increases need our own in-app notice 30 days before, are limited per country, and leave a legacy price cohort to end. Worse in every way |

Play facts: an offer has one or two phases; a phase is free or priced (absolute price, absolute or relative discount)
with a duration and a recurrence count; an inactive offer takes no new purchases and existing subscriptions go on. Play
has no scheduled end date, so the offer is switched off by hand (or by the API) on 1/1/2027.

Play judges offer eligibility per subscription (`thisSubscription`), not per group as Apple does. Someone who already
had the monthly trial can still get the founding trial on Play. That is in the player's favour and we accept it; the
other choice (`anySubscriptionInApp`) would make them pay 69,99€ from day one on «Ιδρυτικό μέλος», which is wrong.

### RevenueCat

- On Android `purchasePackage` buys the product's default subscription option: Play returns only the offers the
  person is eligible for, and RevenueCat picks the longest free trial, then the cheapest first phase. The founding
  offer is chosen without app code. Do not tag it `rc-ignore-offer`.
- RevenueCat sends Play subscriptions as `<subscription>:<base plan>` (`pro_founding:yearly`). Our server matched the
  whole id, so every Play event would have been «unknown product» (no Pro, no frame). Fixed by PR #288
  (`core.store_product_id`, migration `20270318000000_play_product_ids.sql`), which this PR builds on.
- The INTRO phase (the 49,99€ year on Play) arrives as `RENEWAL` with `period_type: INTRO`. It counts as paid Pro and
  gives «Πρώτη γενιά». The trial (`TRIAL`) alone still does not.

## Recommendation

**App Store: keep `pro_founding` at 49,99€ with its 1-week trial and schedule a price change to 69,99€, start
1/1/2027, applied to existing subscribers. Google Play: `pro_founding` base plan at 69,99€ with a two-phase offer (7
days free, then a year at 49,99€), switched off on 1/1/2027.** The product id stays `pro_founding` on both stores, so
RevenueCat's packages, the server's founding window and the «Πρώτη γενιά» rule keep working unchanged.

Trade-offs, in plain words:

- Apple sends every founding member a «your price goes up» message before their second year. Our copy says it from
  day one, so it is no surprise, but it is a moment some will cancel.
- In Austria, Germany, Poland and Korea the second year needs a tap of consent; without it the subscription ends.
- Play and Apple reach the same result by different means. If one day we want founding members to keep 49,99€, Apple
  is easy (delete the scheduled change before 1/1) and Play is not (the base plan is 69,99€).
- The scheduled Apple change cannot be undone after 1/1/2027.

## Store steps (do not run before the founder approves)

### App Store Connect (API scripts in the scratchpad `asc/`, `lib.mjs` signs the token)

1. `pro_founding` localisations (display name and description, max 55 characters):
   - el: «Ιδρυτικό μέλος» / «49,99€ τον πρώτο χρόνο, μετά 69,99€/χρόνο»
   - en-US and en-GB: «Founding member» / «€49.99 the first year, then €69.99/year»
   `PATCH /v1/subscriptionLocalizations/{id}`.
2. Keep the price (49,99€ base, Greece) and the introductory offer (free trial, 1 week, all territories). Submit with
   the first build as planned.
3. Schedule the price change once the subscription is approved (not checked whether App Store Connect takes a planned change while it is READY_TO_SUBMIT). 1/1/2027 is the clean start date; any start before September 2027 still gives the 30-day notice before the first founding renewal (late October 2027):
   - For each territory, read `pro_yearly`'s current price
     (`GET /v1/subscriptions/{pro_yearly}/prices?include=subscriptionPricePoint,territory`).
   - Find `pro_founding`'s price point with the same customer price in that territory
     (`GET /v1/subscriptions/{pro_founding}/pricePoints?filter[territory]=XXX`).
   - `POST /v1/subscriptionPrices` with `startDate: "2027-01-01"`, `preserveCurrentPrice: false`, and the
     subscription, price point and territory relationships. One per territory (175).
   - In App Store Connect › Subscription Prices the change shows per storefront as «notify» or «consent required»
     (consent: AT, DE, PL, KR). Check that list before the last call.
   - To cancel before 1/1/2027: delete the scheduled `subscriptionPrices` rows.
4. Do **not** remove `pro_founding` from sale. It must keep renewing; the server and RevenueCat stop selling it.

### Google Play (Monetize › Subscriptions, or `monetization.subscriptions` in the Android Publisher API)

1. Subscription `pro_founding`, base plan `yearly`: auto-renewing, billing period P1Y, 69,99 EUR in Greece; other
   regions at the same prices as `pro_yearly`'s base plan. Activate.
2. Offer `founding-2026` on `pro_founding` / `yearly`:
   - Eligibility: new customer acquisition, «never had this subscription» (`acquisitionRule.scope.thisSubscription`).
   - Phase 1: free, duration `P1W`, recurrenceCount 1.
   - Phase 2: duration `P1Y`, recurrenceCount 1, price 49,99 EUR in Greece and the eurozone; other regions
     `relativeDiscount` 0.2858 (49,99 / 69,99), `otherRegionsConfig` the same.
   - Activate.
3. `pro_monthly` / `monthly` (P1M 8,99€) and `pro_yearly` / `yearly` (P1Y 69,99€), each with an offer `free-week`
   (one free phase `P1W`), as in `docs/v2/store/android/checklist.md` step 3a.
4. On 1/1/2027 (morning, Athens): deactivate `founding-2026` (`offers.deactivate`). Existing subscriptions go on.

### RevenueCat

1. Import the Play products. Attach `pro_founding:yearly`, `pro_yearly:yearly`, `pro_monthly:monthly` to
   `netprophet_pro`. In the default offering put each next to its App Store twin: `founding` ← `pro_founding:yearly`,
   `$rc_annual` ← `pro_yearly:yearly`, `$rc_monthly` ← `pro_monthly:monthly`.
2. Nothing changes for the App Store products, the entitlement or the webhook.
3. On 1/1/2027: remove the `founding` package from the default offering (the app finds packages by product id, so a
   stale screen gets «unavailable» instead of buying a plan that is over).

### After 31/12/2026, in order

| When | What | Who |
|---|---|---|
| 1/1 00:00 Athens | `api.pro_offer` shows `pro_yearly` instead of `pro_founding` (already in the database) | automatic |
| 1/1 | Apple's price change starts (scheduled in step 3, after approval) | automatic |
| 1/1 morning | Play: deactivate `founding-2026`. RevenueCat: remove the `founding` package | orchestrator |
| Oct 2027 on | Apple notifies founding members; Play moves them from the 49,99€ phase to 69,99€ | stores |

## What changed in the repo

- Paywall (`apps/app/app/pro.tsx`, `src/lib/pro.ts`, copy in `packages/copy`): the founding card reads «49,99€ τον
  πρώτο χρόνο, μετά 69,99€/χρόνο» and «4,17€ τον μήνα · μόνο μέχρι 31/12». Under the button, with the free week:
  «Σήμερα 0€. Από 4/11, 49,99€ τον πρώτο χρόνο, μετά 69,99€/χρόνο. Ακύρωσε πριν και δεν χρεώνεσαι.» Without it:
  «49,99€ τον πρώτο χρόνο, μετά 69,99€/χρόνο.» The one renewal sentence under it is `pro.renewal` from PR #292, next
  to the terms and privacy links (PR #289) and «Επαναφορά αγορών».
- Site (`apps/site/src/content.ts`): «49,99€ τον πρώτο χρόνο, μετά 69,99€/χρόνο» in the Pro block and the FAQ (it said
  «49,99€ τον χρόνο»). Help page (`legal.ts`, «Pro και αγορές»): prices, the founding plan, the free week, automatic
  renewal and where to cancel.
- Server (migration `20270319000000_founding_pricing.sql`, pgTAP 152):
  - `core.store_products.renews_eur` (69,99 for `pro_founding`); `api.pro_offer` returns `renews` per plan.
  - Nothing else: Play ids are read by PR #288, and the frame rule (PR #283) is unchanged. Test 152 checks the Play
    founding phases (TRIAL, INTRO 49,99, NORMAL 69,99) give Pro and the frame once, after the free week.
- Store docs: `docs/v2/store/checklist.md` R2, `docs/v2/store/products.csv` (`pro_founding` 49.99 the first year,
  then 69.99), `docs/v2/store/android/checklist.md` 3c, `listing.md`, `policy-forms.md`.

## Still open

- Founder: include AT, DE, PL, KR in the price change (consent asked, may lapse) or leave them at 49,99€ for good.
  Default in the steps above: include them.
