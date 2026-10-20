# Registration audit (20 Oct 2026)

Every path from install to the first vote, checked in the code and against a local database. Fixes are in migration `20270301000000_registration_audit.sql` and the app; the database cases are in `supabase-v2/tests/100_registration_audit.test.sql` (test names below in quotes). The four claim follow-ups (rows marked «fixed, follow-up») are in `20270302000000_claim_followups.sql`, tested in `supabase-v2/tests/138_claim_followups.test.sql`.

Verdict: **ok** works as intended, **fixed** was wrong and is fixed in this PR, **open** needs a founder decision or a bigger change (recommendation given).

## 1. Finding yourself on the roster («Είσαι ήδη εδώ;»)

| Scenario | What happens now | Verdict | Evidence |
|---|---|---|---|
| Exact spelling | First in the list, picked by itself when it is the only one | ok | "search: exact spelling finds the player first" |
| No accents, capitals | Same player | ok | "search: capitals and no accents find the player" |
| Latin letters («Vaggelis Xenodochakis») | Same player (normalize_search folds Greeklish) | ok | "search: Latin letters find the Greek name" |
| Surname first in the search box | Was not found. Now found, ranked just under the right order | fixed | "search: surname first, then first name, finds the player" |
| One word (just the surname) in the search box | Found nobody (the app sent it as a first name with an empty surname). Now it is a surname search | fixed | "search: one word in the box is a surname" |
| Roster first name cut short by a sheet («Βαγ», «Γ.») and the user types «Βαγγέλης» | Was not found (similarity 0.33). Now found | fixed | "search: «Βαγγέλης» finds the sheet's «Βαγ»" |
| Short form vs full name («Γιάννης» / «Ιωάννης», «Κώστας» / «Κωνσταντίνος», «Βαγγέλης» / «Ευάγγελος», about 40 names) | Was not found. Now found both ways (core.first_name_key) | fixed | "search: «Γιάννης» finds «Ιωάννης»" |
| Feminine surname forms (-ος / -ου, -ης / -η, -ίδης / -ίδου) | Found by similarity (0.58 to 0.77, the bar is 0.55) | ok | "search: the -ος form finds the -ου surname" |
| Common surname, many people | The first name puts the right one first; 20 rows at most | ok | "search: among 26 with one surname…", "search: a surname alone lists 20 at most" |
| Same surname, other first name | Not offered (avoids picking a brother or sister) | ok | "search: another first name on the same surname is not offered" |
| Latin names with «nth» («Xanthi» vs «Ξανθή») | Not found: normalize_search turns «nt» into «d» before it sees «th» | open | Fix needs a change to normalize_search, which backs stored columns on every player; do it with a reindex in a quiet hour |
| Nicknames not in the list, or a typo in the first name | Not found if the first name is far off; the user can edit the search box, or press «Δεν με βρίσκω, είμαι καινούριος» and staff see «πιθανό ίδιο με …» | ok | `core.same_name_player`, admin «Αιτήματα παικτών» |

## 2. The name is already held by another account

| Scenario | What happens now | Verdict | Evidence |
|---|---|---|---|
| Searcher sees the row | Listed with «Έχει ήδη συνδεθεί με άλλο λογαριασμό», never who | ok | "claimed: listed and marked for someone else" |
| Same person, second email (forgot which account) | Tapping the row now also says how that account signs in, provider only: «Εκείνος ο λογαριασμός μπαίνει με Google. Αν είναι δικός σου, βγες και μπες με Google.» (Apple, or «με κωδικό σε άλλο email»). Under the blue «Είμαι εγώ» there is «Βγες και μπες αλλιώς», which signs out to the welcome screen | fixed | `api.claimed_sign_in`; "claimed: the hint is the provider", "claimed: never any part of the address"; `apps/app/app/onboarding.tsx:489` |
| Impostor holds it, the real person taps «Είμαι εγώ» | A report for staff («Ταυτότητα»), «Θα το ελέγξουμε και θα σου πούμε». Staff can dismiss (push «Το προφίλ μένει ως έχει», which ends «γράψε μας», now backed by «Γράψε μας» in Ρυθμίσεις), unlink, or give it to the reporter (push «Είσαι εσύ!») | ok | `admin_decide_identity` (20270228000000_identity_followups.sql) |
| The holder after «Αποσύνδεση» or «Δώσ' το στον αναφέροντα» | Was told nothing. Now one push from `api.admin_unclaim` (every unlink goes through it): «Το προφίλ αποσυνδέθηκε», «Αποσυνδέσαμε το {name} από τον λογαριασμό σου. Αν νομίζεις ότι έγινε λάθος, γράψε μας από τις Ρυθμίσεις.» (text `claim_released`, editable in admin /v2/notifications); a tap opens Εγώ. The profile goes back to «none». Deleting your own account sends nothing | fixed, follow-up | "released: exactly one push", "released: the holder got one push on give", "released: no push when you delete your own account" |
| A normal «Εγώ είμαι» on a held player | Refused by the server | ok | "claimed: a normal claim is refused" |
| Someone else gets the player between the list and the tap | Used to say «γράψε μας». Now the row turns into a held one with «Είμαι εγώ» and the line «Αυτό το προφίλ μόλις συνδέθηκε με άλλο λογαριασμό. Αν είσαι εσύ, πάτα «Είμαι εγώ».» | fixed | `onboarding.tsx:240` |
| The holder searches their own name | Their own player, not marked | ok | "claimed: the holder sees their own player unmarked" |

## 3. Not on the roster («Δεν με βρίσκω, είμαι καινούριος»)

| Scenario | What happens now | Verdict | Evidence |
|---|---|---|---|
| Tap it | A pending player from the onboarding name, a request for staff, «Θα φτιάξουμε το προφίλ σου…» on the next step | ok | 20270226000000_new_player_profile.sql, tests 9x |
| Had asked for a roster player in an earlier run, now taps it | The roster request stayed and the screen promised a new profile that nobody made. Now the latest choice wins: the roster request is cancelled and the new player is made | fixed | "new after request: the latest choice wins", "…the roster request is cancelled", "…the new player waits for staff" |
| Same name later arrives in an official sheet | The sheet links to the waiting new player (one, exact name, no active roster player with that name) instead of making another | ok | `core.new_player_by_name`, `core.ingest_person` |
| Same name already on the roster as an active player | Staff see «πιθανό ίδιο με …» and decide | ok | `admin_claim_queue.duplicate` |
| Staff reject | Player stays pending and hidden, push «Δεν φτιάξαμε το προφίλ» with «γράψε μας» | ok, copy fixed | «Γράψε μας» now exists in Εγώ › Ρυθμίσεις (opens an email to hello@monadlabs.gr) |
| Staff reject after a sheet already linked official matches to it | Matches stay on a hidden pending player | open | Admin should warn when the new player has matches («Έχει 2 ματς από φύλλο: σίγουρα απόρριψη;») or offer merge instead |
| A 15 to 17 year old (a minor on the roster, so not listed) taps it | The duplicate hint looks at every active player, a minor first. «Αιτήματα παικτών» shows «ανήλικος» and no «Έγκριση»; the server refuses approving ('duplicate_minor'). Staff reject (the usual push, which never mentions a minor); the new player stays pending and hidden. How 15 to 17 year olds play at all is still a product call | fixed, follow-up | "minor: the likely duplicate is the minor", "minor: approving is refused", "minor: neither the minor nor the new player is listed" |

## 4. Wrong player, changing your mind

| Scenario | What happens now | Verdict | Evidence |
|---|---|---|---|
| Pick A, then pick B before staff decide | A is cancelled, B waits | ok | "pick: the first request is cancelled" |
| Account already holds a player and asks for another | «Ο λογαριασμός σου έχει ήδη έναν παίκτη.» | ok | `claim_player` 'already_claimed_other' |
| Approved, and it was the wrong player | «Δεν είμαι εγώ» under your player in Εγώ and on your own profile: a report ('not_me_own', same limits) staff see in «Ταυτότητα» as «Λάθος παίκτης: ο χρήστης λέει ότι δεν είναι αυτός/αυτή», with «Αποσύνδεση» (the player is free, the profile back to «none») or «Απόρριψη» (push «Το προφίλ μένει ως έχει»). After sending: «Θα το ελέγξουμε. Μόλις το αποσυνδέσουμε, θα μπορείς να βρεις τον σωστό παίκτη.» | fixed, follow-up | "own report: filed on your own player", "own report: the player is free again", "own report: never given to the reporter" |
| Claim rejected, or skipped, later wants to try again | «Αυτός είμαι εγώ» / «Αυτή είμαι εγώ» (quiet link) on an unclaimed player's profile, for an account with no player and nothing waiting with staff. Same `claim_player` (staff approve, 5 a day, one player per account), same «Το αίτημά σου στάλθηκε…» | fixed, follow-up | "after onboarding: a skipped account asks for a player", "after a reject: they ask for a roster player"; `claimLater.ts` |
| 5 requests a day | Hit only by tapping back and forth a lot; the message is now «Για σήμερα φτάνει. Ξαναδοκίμασε αύριο.» instead of «Δεν έγινε» | fixed | `data.ts` claim() 'limited', `link.ts` linkClaimError |

## 5. Changing the name later

| Scenario | What happens now | Verdict | Evidence |
|---|---|---|---|
| In Ρυθμίσεις | There is no name field in Ρυθμίσεις. A waiting new player follows profile name changes (trigger), but the user cannot make one | open | Add a name row in Ρυθμίσεις only while there is no approved player (after approval the roster name rules); staff can fix spelling on approve |

## 6. Age and minors

| Scenario | What happens now | Verdict | Evidence |
|---|---|---|---|
| Under 15 | «Συνέχεια» stays off until «Είμαι 15 χρονών και πάνω» is ticked (self-declaration, also on the link path) | ok | `onboarding.ts` nameMissing |
| Minor rows in search | Never listed | ok | "search: a minor is never listed" |
| claim_player on a minor's id | Was accepted by the server (search hid it, the RPC did not). Now refused | fixed | "minor: claim_player refuses a minor" |

## 7. Accounts and sign-in methods

Our config uses Supabase's automatic identity linking (the default; manual linking is off). Checked against the Supabase identity linking guide.

| Scenario | What happens now | Verdict | Evidence |
|---|---|---|---|
| Google, then email code with the same address | One account (Google's email is verified, the code signs into that user) | ok | Supabase automatic linking |
| Email code, then Google with the same address | One account (Google links to the existing user) | ok | same |
| Different addresses | Two accounts. The second finds its player held, now with the provider hint and «Βγες και μπες αλλιώς» | ok, fixed hint | section 2 |
| Apple with «Hide my email» | A relay address, so a separate account from the Google or email one. The hint says «μπαίνει με Apple» | ok | |
| Holder signs in with Apple, person is on Android | Apple sign-in is iOS only in the app; they cannot use that account on Android | open | Enable Apple on Android/web (the web OAuth flow needs APPLE_CLIENT_SECRET) or tell staff to transfer |
| The half-made account after «Βγες και μπες αλλιώς» | Stays (a profile with a name, no player) | open | Harmless; later, a cleanup of accounts that never finished onboarding after 30 days |
| Email typed with capitals or spaces | Trimmed and lower-cased before sending | ok | `sign-in.tsx` cleanEmail |
| Code validity | Emails say «Ισχύει για μία ώρα», hosted is 3600s; local config said 600s | fixed | `supabase-v2/config.toml` |

## 8. Interruptions

| Scenario | What happens now | Verdict | Evidence |
|---|---|---|---|
| Close the app mid-onboarding, come back | Starts at step 1 with the saved name filled in; a waiting request stays and a second «Εγώ είμαι» on it is a replay | ok | `prefillName`, `request_claim` replay |
| Offline at launch for a brand-new account | The gate lets them into the app without onboarding (by design, so a network blip never locks anyone out); next online launch asks again | open | Keep, or show onboarding when the device has never seen this account done |
| Double tap on a button | Buttons are busy while a call runs; server calls are replays | ok | `run()` in onboarding, `request_claim` |
| Android back | Steps back one step; on step 1 it leaves the app (the screen's «‹ Πίσω» signs out to the welcome screen) | ok | `onboarding.tsx` BackHandler |
| A request fails | «Δεν έγινε. Ξαναδοκίμασε.» and the step stays | ok | |

## 9. Match link invite (/m/<token>)

| Scenario | What happens now | Verdict | Evidence |
|---|---|---|---|
| Open, sign in, two steps (player, who you know) | Pending player taken at once; a roster player is a request for staff | ok | `claim_via_link` |
| Refusals | Every refusal said «Αυτός ο παίκτης έχει ήδη προφίλ.» Now: held by someone else «Αυτό το προφίλ το έχει ήδη άλλος λογαριασμός.», this account has a player «Ο λογαριασμός σου έχει ήδη έναν παίκτη.», limit, or «Δεν έγινε» | fixed | `link.ts` linkClaimError, `m/[token].tsx`, link.test.ts |
| «Δεν είμαι εγώ» on the link step | Forgets the link, normal four steps | ok | `dropLink` |
| A minor | No link is made for a minor | ok | 20261116000000_m2_match_link.sql |

## 10. Delete account

| Scenario | What happens now | Verdict | Evidence |
|---|---|---|---|
| Holds a roster player | Player stays, unclaimed | ok | 99_delete_account "the roster player stays, unclaimed" |
| Waiting roster request | Removed with the account | ok | `claim_requests.user_id on delete cascade` |
| Waiting new player with no matches | Was left pending and visible in moderation «New players» with nobody behind it. Now hidden first | fixed | "delete: the asked-for new player is hidden" |
| Open identity reports they filed | Removed; reports about them stay for staff | ok | `identity_flags` FKs |

## 11. Copy

| Text | Change |
|---|---|
| `onboarding.claim.subtitle` | «Έχουμε {n} παίκτες από όλη την Αττική. Μήπως είσαι εσύ παρακάτω;» (founder) |
| `onboarding.claim.taken` | No more «γράψε μας»: points at «Είμαι εγώ» |
| `link.claimTaken` | «Αυτό το προφίλ το έχει ήδη άλλος λογαριασμός.» (it said «έχει ήδη προφίλ», which every roster player has) |
| «γράψε μας» in the claim_rejected, claim_report_rejected and new_player_rejected pushes and the delete error | Now true: «Γράψε μας» in Εγώ › Ρυθμίσεις. Texts left as they are (they live in admin /v2/notifications) |
| New: `claimedVia`, `claimedSwitch`, `limited`, `me.contact` | el and en |

## The {n} roster count

Founder rule (20 Oct): every shown player (active, not hidden, not a minor) except sheet abbreviations and duplicates. `core.roster_countable(p)` and `core.roster_count()`, used by `get_players_home.total_players` (the claim step and Παίκτες). No player row changes.
- Abbreviation: the first name is 3 letters or fewer after normalize_search, or ends with a dot. Real short names (Ζωή, Ίων, Ρέα, Λία) fall under this too and are not counted.
- Duplicate: another shown player with the same surname key whose first name key starts with this one's and is longer (the shorter is out), or exactly the same name key (counted once).

Read-only SQL for the live number (works before the migration):

```sql
with shown as (select * from core.players where status = 'active' and not hidden and not is_minor)
select count(*) as roster_n from shown p
 where length(p.first_name_norm) > 3 and btrim(p.first_name) !~ '\.$'
   and not exists (select 1 from shown q
                    where q.id <> p.id and q.surname_norm = p.surname_norm
                      and ((length(q.first_name_norm) > length(p.first_name_norm)
                            and left(q.first_name_norm, length(p.first_name_norm)) = p.first_name_norm)
                           or (q.first_name_norm = p.first_name_norm and q.id < p.id)));
```

Abbreviations with a likely full name (for staff to merge later):

```sql
with shown as (select * from core.players where status = 'active' and not hidden and not is_minor)
select p.first_name || ' ' || p.surname as short, q.first_name || ' ' || q.surname as full_name, p.id, q.id as full_id
  from shown p join shown q on q.id <> p.id and q.surname_norm = p.surname_norm
                          and length(q.first_name_norm) > 3 and btrim(q.first_name) !~ '\.$'
                          and left(q.first_name_norm, length(p.first_name_norm)) = p.first_name_norm
 where length(p.first_name_norm) <= 3 or btrim(p.first_name) ~ '\.$'
 order by p.surname, p.first_name;
```
