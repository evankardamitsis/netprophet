# App Review notes (ASC › App Review Information)

Prepared 22 Oct 2026. The block under «Notes for the reviewer» is what goes into ASC (English, Apple's reviewers
read English). The rest is for the founder.

## Sign-in for review: the decision the founder has to make

The app signs in with a 6-digit code by email, Sign in with Apple, or Google. Sign-up is open and free; a new account
goes through four onboarding steps and can vote at once. Nothing in the app or the backend gives a fixed code for a
review address today (checked: `apps/app/src/lib/auth.tsx` uses `signInWithOtp` / `verifyOtp`; `supabase-v2/config.toml`
has no test OTP; Supabase's built-in test OTP exists for phone sign-in only, not email).

Options, smallest first:

| | Option | Work | Risk |
|---|---|---|---|
| A | **Reviewer uses Sign in with Apple** (one tap, creates an account) and the notes say so. Apple accepts this when sign-up is open and free and nothing needs pre-loaded data. | None | The reviewer's account is new: no claimed player, no history. Σήμερα must have matches on review days (see «Before you press Submit»). If Apple insists on credentials anyway, fall back to C. |
| B | A review inbox the founder controls (e.g. `review@monadlabs.gr` in Zoho) and the founder reads codes to Apple when asked | None in code | Weak: the reviewer cannot get the code alone; usually ends in a rejection under 2.1 |
| C | **One allow-listed review email with a fixed secret code**, server-side: the founder creates `appreview@…` in Supabase with a password (Auth › Users › Add user, auto-confirm), and the app, after a failed code for any email, tries `signInWithPassword(email, code)` once. Only accounts that have a password can match; normal users have none. | ~20 lines in `auth.tsx` + a unit test; no migration, no secret in the repo | The code box takes 6 digits, so the secret is a 6-digit number: guessable in theory (GoTrue rate limits sign-ins per IP). The account is a normal user with no staff rights, so the worst case is someone using the demo account. Remove the password after approval. |
| D | An edge function `review-login` that checks an allow-listed email and a secret from Supabase secrets and mints a session with `auth.admin.generateLink` | Larger: new function, client special case, and no Deno tests in CI | Same as C plus more surface |

**Recommendation: A, with C ready.** Not built in this PR: the task said build only if small and safe, and the
choice of a password on a production account is the founder's. Say "build C" and it is a 30-minute PR. Whatever is
picked, Claude never creates the account; the founder does, in the Supabase dashboard, and types the code into ASC.

## Notes for the reviewer (paste into ASC)

```
NetProphet is a free game around amateur tennis tournaments in Greece. Players see today's tournament matches,
call who will win, and learn the result the same day. A right call earns points and keeps a streak; a monthly
Ladder ranks players by points. It is NOT gambling: no money or anything of value is ever staked or won, there
are no odds, points cannot be bought or cashed out, and purchases are cosmetic or the Pro subscription
(information and notifications), never points or ranking.

SIGN IN
Use "Sign in with Apple" on the first screen; it creates an account in one tap. (Email sign-in sends a 6-digit
code; Google is also offered.) Onboarding has four short steps: your name, "Are you already here?" (pick any
player or tap "I can't find myself, I'm new"), your area, and the people you know (optional, "Later" skips it).
[If option C is used, replace the paragraph above with:]
[Email: <review email>  Code: <6-digit code>. Type the email, tap Continue, then type the code. Ignore the email
that arrives; the code above always works for this account.]

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
