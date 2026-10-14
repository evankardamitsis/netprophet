-- The reveal rule (founder, 14 Oct 2026, UX audit: "we need to clear everything out and have progressive reveal").
-- The ladder opens game features over time and never hides the Pro door or your own match: the Pro sheet (and with it
-- «Ο αντίπαλος πριν το ματς», Pro on the quiz and Εγώ) opens on day 1; step 10 keeps only the win effect.
-- Full-screen moments drop from seven to three: your level, Κατάταξη and the first badge. The others open quietly, and
-- moments already queued for them are put away so they never sit unseen.
-- packages/core UNLOCK_STEPS and test-vectors/unlock-defs.json say the same (61_unlocks reads that file).

update core.unlock_defs set features = array_append(features, 'pro_sheet')
 where key = 'day1' and not ('pro_sheet' = any (features));
update core.unlock_defs set features = '{win_effect}' where key = 'pro_first_view';
update core.unlock_defs set celebrate = key in ('level_bar', 'ladder_friends', 'badges_shelf');

update core.feed_inbox set seen_at = now()
 where kind = 'celebration' and seen_at is null and payload ->> 'type' = 'unlock'
   and payload ->> 'key' not in ('level_bar', 'ladder_friends', 'badges_shelf');
