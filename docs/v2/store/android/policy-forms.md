# Google Play policy forms (App content)

Drafted 22 Oct 2026 from the code on `v2`. Play Console › App content (Policy and programs › App content). Answers
the founder pastes or ticks; each says why, so a reviewer question can be answered from here.

## Privacy policy

https://netprophetapp.com/privacy (Greek; English at /en/privacy).

## App access

All or some functionality is restricted: **Yes**, everything sits behind sign-in.

There is no password login to hand over: sign-in is an email one-time code, Google or Apple. Instructions for the
reviewer (paste into «Add instructions», name «Sign-in»):

```
Sign in with "Continue with Google" using any Google account. A new account opens a short setup: type any first
name and surname, tick "15 or over", pick a sport; on "Are you already here?" tap "I cannot find myself, I am new";
pick any area; on the people step tap "Later". All features except NetProphet Pro are free and open after setup.
Pro (subscriptions with a 7-day free trial) is bought through Google Play Billing on the Pro screen (Me tab, or
any "Pro" line). License testers are not charged.
Questions: hello@monadlabs.gr
```

«I am new» sends a «Νέος παίκτης» request to admin moderation: reject the reviewer's request there after the
review. Keep this the same as the App Review notes in the iOS package (there it is «Sign in with Apple» with any Apple ID).
If the founder prefers a fixed reviewer account, it has to be a Google account the founder creates and gives here
(username and password in this form); we do not create accounts, and an email-code account would not work because
the reviewer cannot read the inbox.

## Ads

Does your app contain ads? **Founder decides; the code says the feed can show one.**

`SponsoredCard` (`apps/app/src/components/SponsoredCard.tsx`) shows one «Χορηγούμενο · {sponsor}» banner on Σήμερα
when `core.sponsored_cards` has an active row (staff add them in admin; the demo rows are seeded by
`core.seed_demo_sponsored` and cleared before launch). Play counts any third-party promotion as an ad, ad SDK or not.
- If any sponsor card will run in the first months: **Yes**. The listing then shows «Contains ads». Nothing else
  changes (no ad SDK, no advertising ID, no data to the sponsor).
- If not: **No** now, and switch it to Yes before the first real sponsor card goes live (Play checks this).
- Either way, make sure no demo sponsored row is active in production (`tools/demo/clear_demo.sql`).

## Content rating (IARC questionnaire)

Category: **All other app types** (not a game, not social networking or communication as the main purpose; Play may
suggest «Reference, news or educational»: pick the one that is not a game).

| Question | Answer | Why |
|---|---|---|
| Violence, blood, fear | No | |
| Sexuality, nudity | No | |
| Crude humour, profanity | No | Baller names pass `core.blocked_words`; reactions and kudos come from fixed lists. |
| Controlled substances (drugs, alcohol, tobacco) | No | A sponsor could be a café; the card is a picture and a line, no alcohol promotion. Keep it that way. |
| Gambling: real money | No | Nothing is staked or paid out. |
| Simulated gambling | No | Calling who wins gives points and a σερί; there are no odds, stakes, chips or coins. |
| Does the app let users interact or exchange content? | Yes | Names, points and the Ladder are visible; follows, reactions, kudos, logged matches with named opponents. No chat, no free text between users. |
| Does the app share the user's current location with other users? | No | The chosen area is not a location. |
| Does the app allow users to purchase digital goods? | Yes | Pro subscriptions and cosmetics through Google Play. |
| Is the app a web browser or search engine? | No | |
| Does the app contain news? | No | |
| Miscellaneous: unrestricted internet | No | Sponsor links open in the browser; there is no in-app browser of the open web. |

Expected rating: PEGI 3 / ESRB Everyone, with the interactive elements «Users interact» and «In-app purchases».
That matches Apple 12+ only loosely: Apple asks differently, so do not try to force the same number.

## Target audience and content

| Question | Answer | Why |
|---|---|---|
| Target age groups | 16 to 17, and 18 and over. Founder decides on 13 to 15 (see below). | Sign-up asks to tick «15 και πάνω» (`AgeCheck` in `apps/app/app/onboarding.tsx`; the privacy policy says 15 and over, the Greek age of digital consent). |
| Could the app unintentionally appeal to children? | No | Amateur tennis results; the Baller is a cartoon ball but the app is about adult tournaments. |
| Ads to children (only asked if under-13 groups are picked) | Not asked | No group under 13. |

13 to 15: a 15-year-old can sign up, so strictly the 13 to 15 group applies. Picking it adds Play's teen
expectations (no personalised ads, which we have none of, careful with UGC, which has report and block). Leaving it
out is common for apps with a 15+ gate, but then the store and the policy say different things. Recommendation: pick
13 to 15 as well; it costs nothing we do today. Players marked as minors in the roster are never shown
(`is_minor` / hidden on every public surface), which reviewers sometimes ask about for sports apps.

## User-generated content

Reviewed under the UGC policy because users see each other's names and activity:
- Report: «Αναφορά για αυτό το ματς» on matches and claims (`ClaimReportSheet`, moderation queue in admin).
- Block: «Μπλοκ» on a person: you no longer see the matches they log and they cannot leave you kudos; reaction
  pushes stop both ways.
- Hide the profile: in Ρυθμίσεις.
- Free text: only names (profile, Baller), checked against `core.blocked_words`, and staff can reset a Baller name.
- Terms of use: none published yet (see `checklist.md`). Play's UGC policy expects terms that forbid abuse; this is
  the one real gap here.

## Other declarations

| Form | Answer |
|---|---|
| Government app | No |
| Financial features | No (none of: banking, loans, crypto, payments to others, insurance) |
| Health apps | No health features (it records match results, not fitness or health data) |
| News app | No |
| COVID-19 contact tracing or status | No |
| Data safety | See `data-safety.md` |
| Advertising ID | No, the app does not use it (no `com.google.android.gms.permission.AD_ID` in the merged manifest; target SDK 36 means Play requires this answer) |
| Families policy | Not in the program (no under-13 target group) |
| Photo and video permissions | Not requested (no `READ_MEDIA_*`) |
| Full-screen intent, exact alarms, foreground services | None declared in the manifest |
| Account deletion | In the app: Εγώ › Ρυθμίσεις › «Διαγραφή λογαριασμού» (deletes at once). On the web: https://netprophetapp.com/delete-account |
| Subscriptions | Pro: monthly, yearly, founding; each with a 7-day free trial. The Pro screen states price, the trial end date and the price after it, and «Ακύρωσε πριν και δεν χρεώνεσαι» before buying. |
