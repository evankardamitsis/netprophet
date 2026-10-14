# NetProphet v2: UX audit (14 Oct 2026)

Founder, 14 Oct: "the app is going in a nice direction but still feels overwhelming. its not clear what one can do, it
does not guide him on the next things". Hold on the next phase until this is decided. Readable version with screenshots:
https://claude.ai/artifact/3YfJDqbS75vGavbH8vuYoG

## The four jobs (founder)
1. Who plays today. Today: the feed's title answers it, then tomorrow's matches, «Για σένα» (quiz, confirmations),
   a sponsor, postponed cards and a closing line dilute it. Verdict: answered but crowded.
2. What happened in other tournaments. Today: its own tab, cleaned (#119), dot for new results. Verdict: fine.
3. Who is my opponent. Today: only «Ο αντίπαλος πριν το ματς» on the 13th section of Εγώ; home never says you play
   today. Verdict: hidden.
4. Pro high up (my tournaments, draws, match notifications). Today: the unlock ladder hides every Pro door until step
   10 (σερί 5 or 30 votes); a new player sees no Pro. Verdict: hidden by design.

## Overload, counted
- Home: six kinds of card on one scroll, plus «+ Ματς» and the quest bar floating; today and tomorrow in one list.
- Εγώ: about fifteen sections; σερί and points shown three times (header, hero, Το σκορ σου).
- Κατάταξη: the lime «Ψήφισε τώρα» block is a second action on the screen.
- First weeks: seven full-screen unlock moments.
- The sample account opens every feature at once, so it looks busier than a real day 1.

## Proposal
Bottom bar, one job per tab: **Σήμερα · Αποτελέσματα · Τουρνουά · Κατάταξη** (Τουρνουά: founder's idea, it also
holds «+ Ματς»). Εγώ stays on the account button.
- Σήμερα: your match today first (time, place, opponent, «Ο αντίπαλος ›» Pro), then today's votes, «Οι 6 της
  ημέρας» as one row, «Αύριο» folded. «Για σένα» rises full screen on the first open of the day after a short beat
  when it has something; closed, it stays folded on the feed as now (founder, 14 Oct).
- Αποτελέσματα: as now.
- Τουρνουά («Τα τουρνουά μου»): the Pro notifications card on top, your next matches and draws, your tournaments,
  player search (Παίκτες stops being a tab), «+ Ματς».
- Κατάταξη: as now, after the first week, without the second action.
- Εγώ: hero, level, a Pro row near the top, then Τα στατιστικά σου, Εμφάνιση, Ρυθμίσεις.

Reveal rule: the ladder opens game features over time and never hides the Pro door or your own match. Day 1: vote,
results, your match and opponent, Τουρνουά with Pro. First week: level bar, Αποστολές, free freeze. Later: Κατάταξη,
badges, Εμφάνιση and avatar, full stats, kudos. Full-screen moments drop from seven to three (first level, Κατάταξη,
first badge).

## Plan (one PR each, after the founder's yes)
1. Ladder: never hide Pro or your match; seven moments to three (packages/core rule + vectors + migration).
2. Bottom bar: Σήμερα, Αποτελέσματα, Τουρνουά, Κατάταξη; search and «+ Ματς» into Τουρνουά.
3. Σήμερα: your match card first, today only, tomorrow folded, quiz as one row. 3b. «Για σένα» full screen once a day.
4. Τουρνουά screen with the Pro notifications card.
5. Pro match reminders (the evening before and two hours before, with the opponent): database + push.
6. Εγώ down to hero, level, Pro row and three rows.
7. Avatars in use (defaults where initials show today, then the picker), after a yes on the drawn style.

## Done the same day
- Pro list leads with notifications (#122); «Δεν αγοράζει πόντους, θέση ή level» removed from the sheet.

## Seen on the way
- Pressing the open tab again does not scroll to the top.
