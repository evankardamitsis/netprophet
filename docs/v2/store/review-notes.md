# App Review notes (ASC › App Review Information)

Prepared 22 Oct 2026. The block under «Notes for the reviewer» is what goes into ASC (English, Apple's reviewers
read English). The rest is for the founder.

## Sign-in for review: the review account (founder, 26 Oct)

Apple and Google need a ready-made email and password ("we can't create new accounts"). Built in PR
`v2-review-login`:

- **App.** One address, `review@monadlabs.gr` (`REVIEW_EMAIL` in `apps/app/src/lib/reviewAccount.ts`, matched
  trimmed and in any case). When that address is typed on the email step, a password field and «Σύνδεση» replace
  «Στείλε μου κωδικό», and the app calls `supabase.auth.signInWithPassword`. A wrong password says «Λάθος κωδικός
  πρόσβασης». Every other email sees exactly the old flow (code by email, Apple, Google); no hint that passwords exist.
- **Server.** Supabase's Email provider serves both the code and passwords and must stay on for the code. Migration
  `20270322000000_review_password_only.sql` adds a guard on `auth.users`: no account other than `review@monadlabs.gr`
  can have a password (sign-up with a password, setting one later, the Admin API and the dashboard are all refused
  with `password_not_allowed`). With no password stored, password sign-in fails for every other account. Code,
  Google and Apple sign-ins never write a password and are untouched. pgTAP: `supabase-v2/tests/155_review_password_only.test.sql`.
- **No password is in the repo.** The founder sets it in the dashboard and types it into the store forms.

### Founder steps (once, after the migration is live)

1. Supabase dashboard (v2 project) › Authentication › Sign In / Providers › **Email**: leave it **on** (it already is,
   the code needs it). Leave «Allow new users to sign up» on (code sign-up needs it). Nothing else to toggle: the
   password rule is enforced by the database guard, not a dashboard switch.
2. Authentication › Users › **Add user › Create new user**: email `review@monadlabs.gr`, a strong password (16+
   characters, kept in your password manager), tick **Auto Confirm User**. The database guard allows this one address.
3. On a phone with the store build: «Πάμε», type `review@monadlabs.gr`, type the password, «Σύνδεση». Finish
   onboarding: any name (e.g. "App Review"), 15+, tennis; on «Είσαι ήδη εδώ;» tap «Δεν με βρίσκω, είμαι καινούριος» and then
   reject that «Νέος παίκτης» request in admin (do not claim a real player); any area; «Αργότερα» on people. Vote on a
   couple of matches so the screens have something in them.
4. Put the email and password in ASC › App Review Information › Sign-in required, and in Play Console › App content ›
   App access (see `android/policy-forms.md`).
5. After both reviews: change the password (or delete the user) in Authentication › Users. The next review needs a
   new one typed into the forms again.

Not done, noted: the review account is a normal player, so once it votes it can show in «Όλοι» and its monthly
Κατηγορία of the Ladder, and its votes count in the splits. There is no flag that the Ladder filters on today
(`core.profiles.hidden` exists but `api.get_ladder` does not read it). It never appears in anyone's «Οι δικοί σου»,
because that list comes from claimed players and the review account claims none. If this matters, a follow-up can
make `get_ladder` skip hidden profiles and set `hidden` for the review account.

## Notes for the reviewer (paste into ASC)

```
NetProphet is a free game around amateur tennis tournaments in Greece. Players see today's tournament matches,
call who will win, and learn the result the same day. A right call earns points and keeps a streak; a monthly
Ladder ranks players by points. It is NOT gambling: no money or anything of value is ever staked or won, there
are no odds, points cannot be bought or cashed out, and purchases are cosmetic or the Pro subscription
(information and notifications), never points or ranking.

SIGN IN
Use the demo account: on the first screen tap "Πάμε", type the email below, then the password, and tap
"Σύνδεση" (Sign in). The password field appears only for this address; real users sign in with a 6-digit code by
email, Sign in with Apple or Google.
  Email: review@monadlabs.gr
  Password: <the founder types it here in ASC, never in the repo>
The account has finished onboarding and opens on the first tab. Sign in with Apple also works and creates a new
account in one tap (onboarding then has four short steps).

WHAT TO TRY
1. The first tab (Τουρνουά) opens on Σήμερα (Today): tap a player's name on a match to call the winner. The
   split between players appears.
2. Hold a name for half a second on any match to see that player's path in the tournament draw.
3. Further down the same screen, «Τουρνουά σήμερα»: open a tournament for its schedule (Πρόγραμμα) and draw
   (Ταμπλό).
4. Αποτελέσματα (Results): results by day; a lime "Το 'πες" tag marks the calls you got right.
5. Κατάταξη (Ladder): the month's ranking.
6. Εγώ (Me): your Baller (avatar) and its wardrobe; Settings at the bottom of the screen.

IN-APP PURCHASES
- NetProphet Pro, auto-renewable subscription (monthly, yearly; a founding yearly plan until 31 Dec 2026), with a
  7-day free trial. Open it from Εγώ (Me) › Pro, or from any "Pro" card. The Pro screen shows the price, the
  period, the auto-renewal terms, Terms of Use, Privacy Policy and "Επαναφορά αγορών" (Restore purchases).
- Cosmetic items for the Baller (backgrounds, frames, kits, gear, win effects), one-time non-consumable purchases
  at 0,99 or 1,99 EUR, in Εγώ (Me) › Εμφάνιση (Appearance). They change looks only.
- Restore purchases: Pro screen, bottom row, "Επαναφορά αγορών".

ACCOUNT DELETION
Εγώ (Me) › Ρυθμίσεις (Settings, tap to open, at the bottom) › "Διαγραφή λογαριασμού" › confirm. The account and
its data are deleted immediately.

USER CONTENT, REPORT AND BLOCK
Users can log their own matches; a logged match waits for staff approval before it shows. To report: hold a result
in Αποτελέσματα, or open a player's profile and tap "Αναφορά" (Report). To block: "Μπλοκ" on a player's profile;
blocked users are listed and can be unblocked in Settings. Reactions and kudos are chosen from fixed lists; there
is no free-text chat.

MINORS
The app is for 15 and over (privacy policy). Players under 18 who appear in tournament data are hidden from
the app, from search and from suggestions.

The app's language is Greek. Contact: hello@monadlabs.gr
```

## For the founder: facts behind the notes, with sources

- Account deletion: `apps/app/app/(tabs)/me.tsx` `DeleteAccount` inside the collapsible «Ρυθμίσεις» card;
  `api.delete_my_account()` (`supabase-v2/migrations/20270301000000_registration_audit.sql`) deletes `auth.users`
  at once. **Not a blocker.**
- Restore purchases: **added in this PR** (`restore()` in `apps/app/src/lib/store.ts`, button on `app/pro.tsx`).
- Report/block: `SafetySheet` from `app/(tabs)/results.tsx` (hold a result), `app/(tabs)/index.tsx` (hold a card),
  `app/(tabs)/player/[id].tsx` (visible «Αναφορά» / «Μπλοκ»); the block list and «Ξεμπλόκαρε» in Ρυθμίσεις.
  Holding a result is not discoverable, which is why the notes point to the profile's visible button.
- Logged matches wait for admin approval (founder decision 18 Oct, M2).
- Minors: hidden from roster views, `suggest_players`, `follow_players` (migration `20270219000000_follow_no_minors.sql`),
  pushes and win cards. There is no age question at sign-up; the 15+ line is in the privacy policy only. If ASC's
  age rating comes out under 16+, see metadata.md.
- Pro trial: the free week is the store's introductory offer (founder 18 Oct). The «Σήμερα 0€» line comes from our
  database's `trial_available`, not from StoreKit; a sandbox Apple ID that already used a trial would see a charge
  in Apple's sheet. See checklist.md, risk R3.
- «Συνέχεια με Google» is offered with Sign in with Apple above it (Apple's own button), so 4.8 is met.
