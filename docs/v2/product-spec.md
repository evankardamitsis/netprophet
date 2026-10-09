# NetProphet product spec (from prototype V2.dc.html v121 and canvas.json decisions)

Scope: what is built in the prototype and what Evan decided. Everything marked **[proto]** is prototype-only (demo controls, invented data, simulated behaviour) and is not a product requirement. Language: Greek UI, «level» never «επίπεδο», no accents on capitals, no betting words, glyphs not icons (↑ ↓ = ✓ + ‹ ›). Sport is tennis now; padel, basketball and football come later (no sport chip for now; the data model must not block it).

Positioning: «Τα πάντα για το ερασιτεχνικό τένις». Tagline «Επιτέλους, έχεις κι εσύ κερκίδα.» Players want: who plays, info on an opponent they do not know, recent results. Core idea: levels are voted by the crowd, not calculated.

---

## 1. Screens and flows

Bottom nav, 4 tabs: Ψήφισε, Αποτελέσματα, Παίκτες, Κατάταξη (Κατάταξη is hidden for new players until unlocked, see unlock ladder). Header (all tabs): logo, σερί (lime number, label «σερί»), πόντοι (number, label «πόντοι»), avatar button opening Εγώ. Floating blue button «+ Ματς» on Ψήφισε and Αποτελέσματα.

### Ψήφισε (feed, ex Ταμπλό)
- One endless feed: the «Οι 6 της ημέρας» game card on top, then upcoming match cards to vote on (nearest circle first), result cards returning to the top, one subtle quest strip (text + 3 small segments, opens Αποστολές), one small link «Τα τουρνουά σου · N ›», and a labelled sponsored card (ad) every 4 cards.
- Match card: date/place/round line (e.g. «Σήμερα 18:00 · Open Γλυφάδας · Ημιτελικός»), two players (or two pairs in doubles with two avatars each). Surname is the bold main line, first name small and muted below, then «level N · περιοχή». Long surnames on doubles cards truncate with «…».
- One tap votes. Card shows the split percentages, then folds to one row (pick with ✓, other side, percentages) plus «Μαθαίνεις απόψε» (or «Μαθαίνεις αύριο», «Μαθαίνεις μετά το ματς»). Avatar on the card edge opens the profile; a small + follows the player.
- When a voted match ends, a result card returns to the top: success (✓, «Το 'πες!», surname big, first name small, «κέρδισε τον …», set scores, «+10 · σερί N») or fail («Όχι αυτή τη φορά», ↓, «κράτησες το σερί» only when a freeze saved it; nothing when the σερί broke). Several results queue and play one by one with «Επόμενο ›». On success the +10 and +1 σερί chips fly into the header (about 700 ms) and the numbers count up; on fail no flight (σερί drops to 0 with a soft fall, or a frost effect when a freeze is used).
- After the last result, once per day, a bridge line «Έπαιξες κι εσύ σήμερα; Γράψ' το ›» opens + Ματς.
- Pro hook on the feed: none (Pro is only shown at useful moments).

### Αποτελέσματα
- Scoreboard grouped by day and event («ΧΘΕΣ · OPEN ΓΛΥΦΑΔΑΣ · ΠΡΟΗΜΙΤΕΛΙΚΑ»). Each card: winner (big) and loser rows with surname pairs in doubles, the vote split line («Το 69% έλεγε Πράτσας»), set scores from the winner's side («6-4, 6-7, 7-5», no set total), «Ανατροπή» tag on upsets (dark card), «Το 'πες · +10» or «+30» pill if the user had called it.
- Reactions: 2 pill chips per result from a varied pool of text labels (no emoji), with counts, one pick per match. Tap = pop, count ticks up, small burst; the other chip animates out; tapping the chosen one undoes it. Compact, ink outline on white cards, lime outline on dark cards.
- When a friend is involved and kudos are unlocked, one small line «Πες κάτι στον Γιώργο ›» opens the kudos options (5 random of 35, gendered/plural), then a toast «Στάλθηκε στον …». Max one prompt per card.
- Filter (Όλα / Τουρνουά / Φιλικά). Sponsored card after the 8th result. Admins enter results at first.

### Παίκτες
- Search and a list (friends first, then players from today's matches). Row: initials avatar, name, «level N · περιοχή · φίλος», form dots (last 5: Ν/Η).
- Profile: full name (surname first line rule applies to cards, profiles show full names), level with direction (↑ Ανεβαίνει / = Σταθερός / ↓ Πέφτει), area, hand, record, form, last matches, next match, head-to-head, top traits («Πώς παίζει»: top 6 traits voted by people who played the player; viewer can vote and add a new trait, new traits go through admin approval).
- Actions: + Ακολούθησε / ✓ Στους φίλους σου (adds to circle, short toast), gift «Κέρασε … μια εβδομάδα Pro» (only for friends, once kudos/gifts unlocked), name tap reveals surname (auto-hides after 4 s) where names are abbreviated.

### Κατάταξη
- Monthly ladder: title, «Τέλος μήνα σε N μέρες · ανανεώνεται την 1η», scope tabs «Κατηγορία» (league of 20), «Όσοι ξέρεις» (friends first), «Όλη η Αττική» (unlocked late). Your row highlighted; «Για την επόμενη θέση: N πόντοι ακόμα».
- Leagues Χάλκινη, Ασημένια, Χρυσή (20 players each). Month close card «Έκλεισε ο μήνας» with promotion or relegation result and «Εντάξει».
- Motivational card pushes back to voting; point rules collapsed (list of what gives points).
- Footer «Ανανεώνεται την 1η του μήνα.» Top 3 get a frame and a badge.

### Εγώ (profile of the user)
- Hero with the 3D avatar (frame and background from the shop), name, area · hand · sport, «Δες τα στατιστικά ›» flips to stats. Header row of three tiles: level (with ↑/= /↓ direction word), σερί + personal record («ΠΡ: N»), «πόντοι μήνα».
- Rows: Αποστολές (N/3), Τα τουρνουά σου, Απολογισμός σεζόν (Pro), Εμφάνιση (shop entry), Badges shelf («Δες τα όλα ›»), «Αυτή τη βδομάδα» swipe cards (your results and news), friends, «Τα ματς σου» timeline, settings (collapsed: Pro row, notifications, change area and sport, hide my profile).
- Level for free users: direction only and a link «Πόσο απέχεις από το 5; Pro»; Pro sees numbers («Σου λείπουν 7 ψήφοι για το level 5»). Stats back side: record singles and doubles, correct calls, «Πώς σε βλέπουν» (trait votes; counts blurred for free), «Πού κερδίζεις, πού χάνεις» (Pro; blurred for free).
- New player Εγώ: no level yet («Δεν έχεις level ακόμα», appears after 3 matches or 10 votes), progress «ΜΑΤΣ · 1 ΑΠΟ 3», placeholders.

### + Ματς flow (log your own match)
- Title «Έχεις ματς;». Mode: Παίχτηκε / Έρχεται. Three rows that open one at a time and collapse to one line: Πότε (Σήμερα/Χθες/Άλλη μέρα with a date picker), Τουρνουά (admin-active suggestions, Φιλικό, Άλλο with typing), Μονό/Διπλό/Μικτό.
- Με ποιον: search plus most-played suggestions (with «ματς μαζί/απέναντι»); partner first in doubles; mixed rules (men and women do not play each other in singles; mixed only as doubles).
- Winner (Κερδίσαμε/Χάσαμε in doubles), score (2-0 or 2-1, then optional set scores), «Βάλ' το». Pro hook: «Δες τον αντίπαλο ›» (form, head-to-head, record; free users get the Pro sheet).
- After submit: «Πες μια καλή κουβέντα» (kudos, only once unlocked), then the match card (share to the opponent via share sheet, win-card link «Κάρτα νίκης» for Pro on a win, coffee 0,99, both 1,99, week of Pro as gift 1,99, win effect 1,99), «Στείλ' το απέναντι».
- Rule: a match with someone not on NetProphet shows at once but counts for levels only after they join and confirm. User logs only their own match; admins feed most matches at first.

### Opponent link and claim flow
- Link only for opponents not on NetProphet (members confirm in the feed). Link stays open at least 7 days; the logger can resend.
- Non-member sees the match (names, score), «Έτσι έγινε» / «Όχι ακριβώς» (fix score, «Δεν έπαιξα εγώ»), a good word back, then join and keep the match (claims the profile). Also «Κρύψε με από το NetProphet» (unclaimed roster players can hide themselves with one tap from any shared link; confirmation «Δεν φαίνεσαι πια στο NetProphet»).
- Entering from a link skips most onboarding: claim, Ποιους ξέρεις (needs at least 1), done.

### Onboarding
- Welcome («Μάθε τα πάντα για το ερασιτεχνικό τένις», three lines, tagline, «Πάμε» / «Άλλη φορά»), claim (search the roster by name; «Βαγγέλης Κ» sample), area (Βόρεια/Κέντρο/Νότια then places), Ποιους ξέρεις (scrolling list + search, pick 3 or more).
- New player path after claim: name + sport, hand + tournament experience, then «Το level σου θα το βγάλει το κοινό.»
- 3 explainer slides (ψηφίζεις, μαθαίνεις, σερί/πόντοι; logging is explained later through the bridge line), then «Ας ξεκινήσουμε» splash, then Ψήφισε.

### «Οι 6 της ημέρας» (daily mini quiz)
- Supporting mini game, not the main loop. Card on top of the feed («ΠΑΙΧΝΙΔΙ ΤΗΣ ΗΜΕΡΑΣ», «+30», progress segments, «Παίξε ›»). Stories-style: 6 cards a day (12 for Pro), tap an option, bars show the split, «‹ Πίσω» / «Επόμενη ›», no auto-advance.
- Card types: Σενάριο, Ματς που έρχεται, Αποτέλεσμα («Η ώρα της αλήθειας»), Ποιος είναι; / Ποια είναι; (one correct answer from 3 clues), Διάλεξε έναν, Άποψη (no right or wrong). Dynamic cards («Πριν το ματς», «Μετά το αποτέλεσμα», «Εβδομαδιαίο») carry a small «αυτή τη βδομάδα» marker.
- Every answer is a vote for the players in it and feeds levels. Finish: «Οι επόμενες έξι αύριο στις 9:00». Pro line after finishing: «Θες κι άλλες; Με το Pro παίζεις 12 ›».
- «Η ώρα της αλήθειας» result card: reveal of the real outcome versus your pick (success or fail animation, surname big, sets, σερί pill).

### Αποστολές sheet
- Bottom sheet opened from Εγώ (and the feed strip). Daily quests are the hero (max 3 rows, bars animate), weekly is ONE collapsed row «Της εβδομάδας · 1/2 ›» that expands with a spring, «Φέρε έναν φίλο · 0/1» also collapsed. Done items fold into «✓ 2 έγιναν». «Κλείσιμο».
- Each quest shows its reward chip (a frame or background not yet owned, else a badge bonus). Friend quest: «Κάλεσε έναν φίλο» → «Η πρόσκληση έφυγε» → «Έγινε ✓» (both get a frame when the friend joins and a match is played).
- Progress feedback: a slim bar slides up from the bottom (quest name, old to new value, about 700 ms, hides after about 2 s) on every counted step of a quest; for badges only when one step from completion («Ένα ακόμα για το badge …»). No popup for partial progress.

### Pro sheet and fake door
- Title «Pro», «8,99€ τον μήνα», six check rows: Τα τουρνουά σου, Ο αντίπαλος πριν το ματς, Πού κερδίζεις, πού χάνεις, Τα νούμερα του level σου, Κάρτες νίκης και απολογισμός σεζόν, 12 κάρτες την ημέρα. Buttons «Γίνε μέλος» / «Όχι τώρα».
- Fake door: «Γίνε μέλος» shows «Είσαι στη λίστα» and logs interest; no payment, no expiry, no renewal, no reminder states. Gift variants of the sheet say «Για μια εβδομάδα, δώρο από εσένα/από τον …».
- Pro is shown only at useful moments: draw out, before your own match, opening stats, and the single quiz line. Never on σερί milestones.

### Τα τουρνουά σου
- Reached from Εγώ and a small feed link. Header «Για το level N και τη <περιοχή>.» List «Ανοιχτές δηλώσεις»: tournament name, area · level range, entry deadline («Δηλώσεις έως Παρ 9/10»), chip «σε N μέρες» (lime when closest). **[proto]** 5 invented tournaments.
- Free: list plus a Pro teaser row. Pro: alert card «Βγήκε η κλήρωση, παίζεις Σάββατο 10:00» and «Το πρόγραμμά σου» (your scheduled matches, including conditional ones).
- Notification for the draw (push/in-app banner): see section 4.

### Εμφάνιση shop
- Entry from Εγώ; preview of the 3D avatar with the selected frame, background or kit; three tabs: Κορνίζες (frames), Φόντα (backgrounds), Ρούχα & ρακέτα (kits). Item grid with a status tag: «Δωρεάν», a price («0,99€», «1,99€»), «Το κερδίζεις από <πώς>», «Το κέρδισες», «Φοριέται».
- Actions: Βάλ' το (equip), Αγόρασε · price (buy flow: confirm sheet, then owned). Cosmetics are style only and never give points or level. **[proto]** payment is simulated (marks owned).

### Celebrations and unlock moments
- Full-screen celebration (confetti, the 3D avatar cheering) waits for «Συνέχεια». Types: σερί milestone (3, 5, 7, 10 with lines like «Τρία στη σειρά! Πάρε κι ένα πάγωμα για τις δύσκολες μέρες», «Πέντε στη σειρά!»), badge tier («Νέο badge» / «Νέα βαθμίδα» with dots), quest completion («Αποστολές ✓»), league result («Κατάταξη · <league>»), unlock moments (title + line), and the first Pro peak after σερί 5 opens the Pro sheet once.
- Popups and celebrations only for actually getting something (completion, reward, unlock). Several queued celebrations play one by one. Header and toasts: «Το κέρδισες: Frame …», «Πήρες δωρεάν πάγωμα», «Το πάγωμα έσωσε το σερί σου».

---

## 2. Domain entities and fields

Types are indicative; names in English, copy stays Greek.

- **User/profile**: id, auth identity (phone/email, TBD), displayName, firstName, surname, playerId (claimed roster entry), region (Βόρεια/Κέντρο/Νότια), areas[], sport (tennis now, list later), hand (R/L), gender (m/f, mixed rules), tournamentExperience, isNew, hidden (hide me), createdAt, timezone, locale el, notification prefs, settings.
- **Player (roster)**: id, first/last name, accusative first name (Greek grammar forms stored or generated), gender, area, sport, claimed (true/false), claimedByUserId, hidden, source (admin/import/user), level (current tier/number, may be null), levelDirection (up/same/down), form (last 5), record (singles W-L, doubles W-L), traits (counts per trait), minor flag (excluded from dynamic cards), importedNTRP (known players start with a level).
- **Circle/follows**: userId, playerId, relation (known, friend), createdAt; derived circle for the feed: played with, tapped as known, their opponents, area and level.
- **Match**: id, sport, type (singles/doubles/mixed), sides[] (1 or 2 players each), status (announced, scheduled, played, confirmed, disputed), startsAt, venue/area, tournamentId (nullable, friendly = null), round, score (sets total 2-0/2-1 plus optional set games per set, winner-first), winnerSide, source (admin, import, user-logged), loggedBy, confirmation {state, confirmedByPlayerId, confirmedAt, via (member in feed, link)}, link {token, expiresAt (min 7 days), resends}, announcedBeforePlayed (marked), countsForLevels (only after confirmation when a side is not a member).
- **Tournament**: id, name, area, level range, sport, entry deadline, start date, rounds, draw state (open/drawn), drawPublishedAt, source (admin), minorFlag, entries[], scheduled matches. Free sees the list; Pro gets draw alerts and the personal schedule.
- **Vote**: id, userId, source (feed match, quiz card, dynamic card), matchId or cardId, optionIndex, createdAt, resolved flag, outcome (correct/wrong/none), isUpsetCall (called an Ανατροπή), points awarded, dayIndex. Every answer is also a vote for the players in it (feeds level).
- **Result resolution**: on a confirmed or admin-entered result, resolve all votes for the match, compute outcome, update points ledger, σερί, quests, badges, trait/level inputs, enqueue a result card and notification; queue results per user (played one by one).
- **Points ledger**: entries (userId, delta, reason: correct +10, upset +30, chain +5 per correct in a row, daily quiz +30, ...), balance, month key (for monthly ladder). Money never adds points. Header shows total; Εγώ shows «πόντοι μήνα».
- **σερί and freezes**: current (consecutive correct votes), best (ΠΡ), bonusChain, freezes held (max 2: free and paid), freezeKind per freeze (free keeps number and chain; paid keeps number only, chain restarts), votesSinceFreeFreeze (free freeze every 15 votes), firstFreeAt3 flag, brokeAt.
- **Quests**: definitions (id, title, target, window daily/weekly, reward: cosmetic id or badge bonus), per-user progress (current, doneAt, rewardGranted), daily reset 00:00, weekly reset Monday. Friend-invite quest (inv state 0/1/2). Daily set: «Ψήφισε 3 κάρτες», «Δώσε ένα μπράβο», «Ψήφισε σε 2 ματς». Weekly set: «Πέρνα 2 αγώνες σου», «Ψήφισε 5 μέρες την εβδομάδα».
- **Badges and tiers**: badge definitions (id, name, unit, thresholds for 3 tiers, card flag), per-user counters and tier, tier-up events; third tier grants Frame Level. List: Πρώτο σερβίς (1/5/25 logged matches), Ωραίος ο παίχτης (1/5/20 confirmations), Ο ευγενικός (3/15/50 kudos given), Αγαπητός (3/15/50 kudos from different opponents), Μάντης του κλαμπ (5/25/100 correct votes), Ανατροπή (1/5/15), Στη σειρά (σερί 5/7/10), Ινφλουένσερ (1/3/10 friends who joined and played), Όλη η βδομάδα (1/4/12), Ο διπλίστας (1/5/15), Έχει ποικιλία (5/15/40 opponents), Σταθερός (4/12/26 weeks), Πολλά τα ψηφαλάκια (25/100/500 votes), Χουβαρντάς (1/5/15 treats), Βετεράνος σεζόν (1/2/4 seasons), Κορυφαίος του μήνα (1/3/10 months in top 3).
- **Levels**: per player: value (shown as tiers, not decimals), direction, source weights (confirmed match = strongest vote; quiz/feed votes; traits), pending until about 3 matches or 10 votes (new players), «Αρχικό level» set by admin, «Υποτιμημένος» label derived from an upset record (the gap between voted level and results), never reveal who voted. Level numbers visible to Pro only; free sees direction.
- **Leaderboard**: month key, scopes (league, known/friends, Αττική), points per user for the month, league tier (Χάλκινη/Ασημένια/Χρυσή), 20 players per league group, position, promotion/relegation at close, top 3 awards (frame + badge), monthly reset on the 1st.
- **Quiz cards**: static bank (id, family s/m/c/o/q/r, tag, question, options with optional sub-line, clue[] and rightIndex for «Ποιος είναι;», result data for Αποτέλεσμα: winner/loser/sets/pick), 57 cards now (12 originals + 45 reviewed); dynamic templates (18 families with trigger, slot template, option templates, guardrail, `when`: before match / after result / weekly); daily set builder (6 free / 12 Pro, mixed types, rotation by day, Monday weekly slot); per-user answers, correctness, day index, aggregate option split (percentages shown after answering).
- **Kudos and reactions**: kudos options pool (35, gendered/plural forms), given (fromUser, toPlayer, matchId, option, createdAt), shown with counts on profiles; reactions per result (2 chips from a varied pool, one pick per user per match, counts); the user never sees who voted.
- **Gifts**: coffee (0,99) and both (1,99), week of Pro (1,99), win effect (1,99): giver, receiver player, matchId, product, price, status (pending until accepted), accepted/delivered.
- **Cosmetics**: item (id, category frame/background/kit, key, name, kind: free/earned/buy/pack, price, earn rule text), ownership (userId, itemId, source earned/bought/gift, at), equipped per category, pack items (kits) and win effects (κομφετί, σπίθες, μπάλα).
- **Pro entitlement**: userId, status (none, active, waitlist for the fake door), plan (8,99€ per month), gift weeks, started/ends. Perks gate in the client: tournaments alerts and schedule, scout opponent, «Πού κερδίζεις, πού χάνεις», level numbers, win card, season recap, 12 quiz cards. No expiry reminders or renewal states.
- **Ads/sponsored cards**: sponsor, title, subtitle, placement (feed every 4th card, results after the 8th), rotation of the 4 existing creatives, area targeting, dates, impressions/clicks, label «Χορηγούμενο». No betting advertisers. **[proto]** 4 invented ads.
- **Unlock-ladder progress**: per user counters (votes cast, correct votes, active days, kudos given, matches logged/confirmed, best σερί, days with all daily quests) and unlocked flags with timestamps for the 13 steps; new vs existing players.
- **Notifications**: type, userId, payload, channel (push/in-app), scheduledAt, sentAt, readAt, preferences per type.

---

## 3. Game rules with exact numbers

- **Points**: correct vote +10; correct call of an Ανατροπή +30; +5 more per correct in a row (bonus chain); «Οι 6 της ημέρας» completed +30. Pro does not add points (the Pro 12-card +30 track was removed). Money never adds Κατάταξη points.
- **σερί**: number of correct votes in a row (one streak only; the day-based streak was deleted). A wrong vote sets σερί to 0 unless a freeze absorbs it. Milestones 3, 5, 7, 10 (20 was dropped). Rewards: σερί 7 earns Frame Επτά, σερί 10 earns Frame Δέκα and a free freeze path. Personal record «ΠΡ» kept. No unlock depends on σερί 10 or above.
- **Freezes**: max 2 held. Free freeze: the first at σερί 3, then one every 15 votes cast. Paid freeze 0,99€. Each absorbs one wrong vote. Free freeze keeps the σερί number and the +5 chain; paid freeze keeps the number only and restarts the chain from zero.
- **Quests**: daily 3 (reset 00:00), weekly 2 (reset Monday), plus the friend-invite quest. Reward per quest is cosmetic/badge only. Active day = 3 cards voted or a match logged.
- **Monthly ladder**: resets on the 1st of the month; leagues Χάλκινη, Ασημένια, Χρυσή, 20 players each; top 5 promote, positions 16 to 20 relegate (bottom 5, not below Χάλκινη, no penalties otherwise); top 3 get Frame «Κορυφαίος του μήνα» and the badge. Weekly quests stay weekly (Monday).
- **Unlock ladder (13 steps, action-based triggers; full experience in about 15 days casual, about 6 days engaged)**:
  1. Day 1: vote cards, results, σερί, points, «Οι 6 της ημέρας»; «+ Ματς» visible but quiet.
  2. Level bar: 3rd correct vote, from the 2nd open.
  3. First σερί 3: moment plus first free freeze.
  4. Αποστολές (3 daily): 10th vote and 2nd active day.
  5. Bridge line: first result after day 2.
  6. Κατάταξη with friends and «Φέρε έναν φίλο»: 20th vote and 3rd active day.
  7. Kudos and reactions: first confirmed + Ματς.
  8. Εγώ with 3D avatar, backgrounds and frames: 3rd full day of Αποστολές.
  9. Badges shelf: 10th correct vote.
  10. Pro shown for the first time and win effect: first σερί 5, or the 30th vote.
  11. Weekly quests (2): 6th active day.
  12. Gifts (coffee, a week of Pro): 3rd kudos given.
  13. Stats and Αττική: 45th vote.
  Every unlock has a backup trigger counted in votes. **[proto]** the default demo is fully unlocked; «Νέος παίκτης» and «Ξεκλείδωσε όλα» are demo controls; the exact counters in the prototype are an approximation (votes, correct votes, active-day count, kudos, matches).
- **Pro (8,99€ per month)**: Τα τουρνουά σου alerts and schedule, scout your own opponent, Πού κερδίζεις/πού χάνεις, level numbers, win cards, season recap, 12 daily quiz cards. Fake door for now.
- **Shop prices**: backgrounds 0,99€; frames 1,99€; kit sets 1,99€; coffee 0,99€ (both 1,99€); a week of Pro as a gift 1,99€; win effect 1,99€; freeze 0,99€. Earned items show «Το κερδίζεις από …». Free default kits: Πράσινο, Λευκό, Μαύρο.
- **Ads**: one sponsored card every 4 cards in the feed (rotating 4 creatives, never two in a row); one in Αποτελέσματα after the 8th result.
- **Progress bar rule**: slim bar for quest progress on every counted step; for badges only when one step from completion; popups/celebrations only for completion, reward or unlock.
- **Daily quiz**: 6 cards free, 12 Pro; new set at 9:00; day 0 set fixed, later days rotate a mixed set of types; dynamic cards mixed in (1 to 2 free, up to 6 Pro); weekly dynamic cards only on Monday.
- **Level rules**: new players have none until about 3 matches or 10 votes; shown as tiers; direction free, numbers Pro; Υποτιμημένος label from upset record; men and women do not play each other in singles; mixed only in doubles; score stays 2-0 or 2-1.
- **Moderation**: everything users add (traits, matches, names) goes through admin approval before it is live.

---

## 4. Notifications and triggers

- Result in for a match you voted on (card returns to the top; push optional): outcome, points, σερί change.
- Draw out (Pro): «Βγήκε η κλήρωση, παίζεις Σάββατο 10:00»; also entry deadline reminders for tournaments in your area/level.
- Opponent confirmation: when someone logs a match with you, confirm in the feed (member) or via link (non-member); notify the logger when confirmed or disputed; link expiry warning (valid at least 7 days, resend).
- A friend joined through your invite (friend quest, frame granted to both).
- Quests reset: daily 00:00, weekly Monday; optional nudge when a quest is one step away.
- New daily quiz at 9:00; weekly dynamic cards on Monday.
- Monthly ladder: close on the 1st (promotion/relegation result), «Τέλος μήνα σε N μέρες» countdown, top-3 awards.
- Kudos or reaction received (counts only, never who voted); gift received (coffee, Pro week).
- σερί: a freeze was used, free freeze earned.
- Unlock moments (in-app only). No Pro expiry or renewal reminders. Preferences: «Ειδοποιήσεις» setting.
- **[proto]** only a demo banner for the draw exists; all other notifications are in-app moments.

---

## 5. Admin needs implied by the prototype

- Results entry (admins feed most matches and results at first): match, score with set games, confirm, mark disputed; marking matches announced before being played.
- Moderation queue: user-added matches, names, new traits, tournament suggestions typed under «Άλλο».
- Roster management: import (known players with initial NTRP/level), create unclaimed players, set «Αρχικό level», claim handling, hidden profiles, merge duplicates, minors flag.
- Tournaments: create/edit, entry deadlines, draw publish (triggers notifications), finals marked confirmed from a tournament source, active-tournament suggestions for the + Ματς picker.
- Sponsored cards: creatives, targeting by area, schedule, rotation, reporting; labelled; guardrails (no betting).
- Quiz card bank: card CRUD with types, options, clues and right answers, review states; dynamic templates (18 families) with triggers, slot templates, guardrails and the data feeds (rematches, first meetings, finals, σερί of 3+ wins, upsets, comebacks, mixed matches, double days, super tie-breaks); weekly cards on Mondays; preview by day.
- Quests and rewards config (daily/weekly sets, reward items), badge thresholds, shop catalogue and prices, kudos pool (35 options with gendered/plural forms), reaction pools.
- Ladder: league assignment, month close job, promotion rules; unlock-ladder thresholds; Pro waitlist export (fake door signups).
- Content copy rules: no betting words, Greek first, no accents on capitals.

---

## 6. 3D avatar

- Current state: a three.js scene embedded in the prototype file: stylised low-poly player with pose, kit variants (base, white, black, grass, clay, night), racket colour, hand L/R, gender flag, frame and background layers, celebration animation (arms up, racket) and a preview in the shop. It renders on Εγώ, in the shop preview and in celebrations.
- Status: **direction undecided**. Evan is evaluating Rive as an alternative; no decision on three.js vs Rive vs 2D. The prototype avatar must not be treated as final art or as a technical commitment. The data model (kit, frame, background, hand, gender, equipped items) is independent of the renderer.
- Not to be edited further in the prototype until the decision.
