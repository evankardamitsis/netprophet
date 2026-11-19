-- English for the server's words (app 1.0.1, parts 3 to 5 of the English plan): the quiz bank, the dynamic quiz, the
-- rule cards, kudos lines, earn rules, reaction labels, the sponsored label, the area of an upcoming tournament and the
-- opponent on a Pro result screen.
--
-- How it works:
-- - Builds on 20270501000000_i18n_pushes: core.user_locale(uid) ('en' only when that profile says 'en'; no profile, no
--   account or anything else is 'el') and core.opponents_plain come from there.
-- - Catalogue rows get English columns next to the Greek ones: quiz_templates.text_en, kudos_options.forms_en,
--   cosmetic_items.earn_rule_text_en (reaction_pool.label_en and areas.name_en were already there).
-- - A quiz set is built once a day and kept, so a card keeps both languages: quiz_set_cards.content is the Greek card as
--   before, quiz_set_cards.content_en the English words over it (tag, q, options, clues, reveal). get_quiz and
--   answer_card read the English for an English profile; the players, the right answer and the split are shared.
-- - English card text uses only {pN} and {pN.first}: English has no articles or cases, names stay as written.
-- - Missing English falls back to the Greek, key by key. Greek output is unchanged: every function below is copied from
--   its latest definition and only gains English branches, marked «i18n».
-- Pushes are 20270501000000_i18n_pushes and email is a later part; no function of theirs is redefined here.

-- ---------------------------------------------------------------------------
-- English columns
-- ---------------------------------------------------------------------------
-- {"tag", "q", "options": [...], "reveal"}: the English words of a template; options in the Greek order
alter table core.quiz_templates add column if not exists text_en jsonb;
-- the English words over quiz_set_cards.content
alter table core.quiz_set_cards add column if not exists content_en jsonb;
-- {"m", "f", "plural"} like forms
alter table core.kudos_options add column if not exists forms_en jsonb;
alter table core.cosmetic_items add column if not exists earn_rule_text_en text;

-- ---------------------------------------------------------------------------
-- The quiz bank: matched on the Greek question (template ids differ from database to database)
-- ---------------------------------------------------------------------------
create temp table i18n_bank (q_el text primary key, tag text not null, q text not null, options jsonb not null, reveal text);
insert into i18n_bank (q_el, tag, q, options, reveal) values
-- Κανόνες
('No-ad, 40-40. Ποιος διαλέγει από ποια πλευρά θα γίνει το σερβίς;', 'Rules', 'No-ad, 40-40. Who picks the side the serve goes to?',
 '["The receiver", "The server"]', 'The receiver picks.'),
('Super tie-break, 10-9. Τελείωσε;', 'Rules', 'Super tie-break, 10-9. Is it over?',
 '["No, you need two clear", "Yes"]', 'A super tie-break needs a two-point lead.'),
('Άνοιξες το tie-break με σερβίς. Τι κάνεις στο πρώτο γκέιμ του επόμενου σετ;', 'Rules', 'You served first in the tie-break. What do you do in the first game of the next set?',
 '["You receive", "You serve"]', 'Whoever served first in the tie-break receives in the next game.'),
('Γύρισες το σερβίς στον αέρα, πριν σκάσει.', 'Rules', 'You returned the serve in the air, before it bounced.',
 '["Play on", "You lose the point"]', 'The serve has to bounce first.'),
('Δεν είχες ετοιμαστεί, αλλά πήγες να γυρίσεις το σερβίς και το έβγαλες άουτ.', 'Rules', 'You were not ready, but you went for the return and hit it out.',
 '["Serve again", "You lose the point"]', 'Go for the return and you count as ready.'),
('Η λόμπα σου χτύπησε το ταβάνι πριν σκάσει και μετά έπεσε μέσα.', 'Rules', 'Your lob hit the ceiling before it bounced, then landed in.',
 '["Replay the point", "You lose the point"]', 'If it hits the ceiling before it bounces, you lose the point.'),
('Η μπάλα πήγαινε σίγουρα άουτ και την έπιασες στον αέρα.', 'Rules', 'The ball was going well out and you caught it in the air.',
 '["You win the point", "You lose the point"]', 'If you do not let it bounce, the point goes to your opponent.'),
('Η ρακέτα σου άγγιξε το φιλέ μέσα στον πόντο.', 'Rules', 'Your racket touched the net during the point.',
 '["Play on", "You lose the point"]', 'Touch the net during the point and you lose it.'),
('Κέρδισες το toss. Μπορείς να αφήσεις τον αντίπαλο να διαλέξει;', 'Rules', 'You won the toss. Can you let your opponent choose?',
 '["No, you choose", "Yes"]', 'Yes, it is one of your three options.'),
('Μέσα στον πόντο σε ενόχλησε μπαλάκι που ήταν στη μεριά σου από την αρχή.', 'Rules', 'During the point, a ball that had been on your side from the start got in your way.',
 '["Play on", "Replay the point"]', 'It was there from the start, so there is no replay.'),
('Μέσα στον πόντο, η μπάλα σου πέρασε δίπλα από τον στύλο, πιο χαμηλά από το φιλέ, κι έσκασε μέσα.', 'Rules', 'During the point, your shot went around the net post, lower than the net, and landed in.',
 '["You lose the point", "It counts"]', 'Around the post, it can pass at any height.'),
('Μπήκε μπαλάκι από το διπλανό γήπεδο μέσα στον πόντο.', 'Rules', 'A ball rolled in from the next court during the point.',
 '["Play on", "Replay the point"]', 'The point stops and you play it again.'),
('Πέταξες τη ρακέτα, βρήκες τη μπάλα και μπήκε.', 'Rules', 'You threw your racket, it hit the ball and the ball went in.',
 '["You lose the point", "It counts"]', 'The racket has to be in your hand when it hits the ball.'),
('Παίξατε έναν πόντο με σερβίς από τη λάθος πλευρά και το καταλάβατε μετά.', 'Rules', 'You played a point serving from the wrong side and noticed afterwards.',
 '["The point stands", "Replay it"]', 'What was played stands. From then on, serve from the right side.'),
('Σταμάτησες τον πόντο γιατί νόμισες ότι ο αντίπαλος ενοχλήθηκε.', 'Rules', 'You stopped the point because you thought your opponent was hindered.',
 '["You lose the point", "Replay the point"]', 'Stop the point for your opponent and you lose it.'),
('Στο tie-break, κάθε πότε αλλάζετε πλευρές;', 'Rules', 'In a tie-break, how often do you change ends?',
 '["Every 4 points", "Every 6 points"]', 'Every 6 points, with no break.'),
('Στο tie-break, μετά τον πρώτο πόντο, πόσα σερβίς κάνει ο καθένας;', 'Rules', 'In a tie-break, after the first point, how many points in a row does each player serve?',
 '["One", "Two"]', 'Two each, to the end of the tie-break.'),
('Στο διπλό, η μπάλα χτύπησε τον συμπαίκτη σου.', 'Rules', 'In doubles, the ball hit your partner.',
 '["You lose the point", "Replay the point"]', 'If the ball hits you or your partner, you lose the point.'),
('Φώναξες επίτηδες την ώρα που ο αντίπαλος πήγαινε να χτυπήσει.', 'Rules', 'You shouted on purpose just as your opponent was about to hit.',
 '["Replay the point", "You lose the point"]', 'On purpose, the point goes to your opponent. By accident, you replay it.'),
('Χτύπησες τη μπάλα από τη μεριά σου και στο τελείωμα η ρακέτα πέρασε πάνω από το φιλέ.', 'Rules', 'You hit the ball on your side and your follow-through went over the net.',
 '["It counts", "You lose the point"]', 'It counts, as long as you do not touch the net.'),
-- Διάλεξε έναν
('Tie-break στο 6-6. Ποιον δεν θες απέναντι;', 'Pick one', 'Tie-break at 6-6. Who do you not want across the net?', '["{p1}", "{p2}", "{p3}", "{p4}"]', null),
('Διπλό, 5-5 στο τρίτο. Ποιον θες δίπλα σου;', 'Pick one', 'Doubles, 5-5 in the third. Who do you want next to you?', '["{p1}", "{p2}", "{p3}", "{p4}"]', null),
('Ποια δεν χάνει ποτέ την ψυχραιμία της;', 'Pick one', 'Who never loses her cool?', '["{p1}", "{p2}", "{p3}", "{p4}"]', null),
('Ποια θες συμπαίκτρια στο μικτό;', 'Pick one', 'Who do you want as your mixed doubles partner?', '["{p1}", "{p2}", "{p3}", "{p4}"]', null),
('Ποια τρέχει σε όλες τις μπάλες;', 'Pick one', 'Who chases down every ball?', '["{p1}", "{p2}", "{p3}", "{p4}"]', null),
('Ποιος έχει το πιο δυνατό σερβίς;', 'Pick one', 'Who has the biggest serve?', '["{p1}", "{p2}", "{p3}", "{p4}"]', null),
('Ποιος δεν τα παρατάει ποτέ;', 'Pick one', 'Who never gives up?', '["{p1}", "{p2}", "{p3}", "{p4}"]', null),
('Ποιος παίζει καλύτερα στο φιλέ;', 'Pick one', 'Who is best at the net?', '["{p1}", "{p2}", "{p3}", "{p4}"]', null),
('Σερβίρεις για το ματς. Ποιον δεν θες απέναντι;', 'Pick one', 'You are serving for the match. Who do you not want across the net?', '["{p1}", "{p2}", "{p3}", "{p4}"]', null),
('Τρίωρο ματς με 38 βαθμούς. Ποιος αντέχει;', 'Pick one', 'A three-hour match at 38 degrees. Who lasts?', '["{p1}", "{p2}", "{p3}", "{p4}"]', null),
-- Η ζωή στο γήπεδο, Άποψη
('Έχασες 6-0 6-1. Τι λες στην παρέα;', 'Life on court', 'You lost 6-0 6-1. What do you tell your friends?',
 '["\"My arm was sore\"", "\"They were better\"", "I tell no one"]', null),
('Δεύτερο σερβίς στο 30-40. Τι κάνεις;', 'Life on court', 'Second serve at 30-40. What do you do?',
 '["Go for it", "Just get it in", "Say a little prayer"]', null),
('Η αγαπημένη σου δικαιολογία;', 'Life on court', 'Your favourite excuse?', '["The sun", "The wind", "The strings", "My back"]', null),
('Καινούργια ρακέτα ή μαθήματα;', 'Life on court', 'New racket or lessons?', '["Racket, it is the racket", "Lessons, I know it is me"]', null),
('Ματς Κυριακή στις 8 το πρωί;', 'Life on court', 'A match at 8 on a Sunday morning?', '["Yes, gladly", "Only with coffee", "No way"]', null),
('Μετά το ματς;', 'Life on court', 'After the match?', '["Beer", "Protein", "Both"]', null),
('Μια καλή λόμπα κερδίζει ένα καλό smash.', 'Your take', 'A good lob beats a good smash.', '["Agree", "No way"]', null),
('Μιλάς στον εαυτό σου μέσα στο ματς;', 'Life on court', 'Do you talk to yourself during a match?', '["Only in my head", "The whole club hears me"]', null),
('Ξέχασες το σκορ. Τι κάνεις;', 'Life on court', 'You forgot the score. What do you do?', '["I ask", "I go with the one that suits me", "We start the game again"]', null),
('Ο αντίπαλος είπε άουτ, αλλά ήταν μέσα. Τι κάνεις;', 'Life on court', 'Your opponent called it out, but it was in. What do you do?',
 '["I say so", "I let it go, but I remember"]', null),
('Ο αντίπαλος παίζει μόνο λόμπες. Πώς το παίρνεις;', 'Life on court', 'Your opponent plays nothing but lobs. How do you take it?',
 '["Respect", "I am bored", "I want to go home"]', null),
('Ο συμπαίκτης σου έκανε τρίτο διπλό λάθος στο γκέιμ.', 'Life on court', 'Your partner just hit a third double fault in the game.',
 '["\"Never mind\"", "I give them a look", "I crack a joke"]', null),
('Πέντε λεπτά ζέσταμα φτάνουν πριν από ένα ματς.', 'Your take', 'Five minutes of warm-up is enough before a match.', '["Enough", "No way"]', null),
('Παίζεις το ματς της χρονιάς σου. Σε ποια επιφάνεια;', 'Your take', 'You are playing the match of your year. On what surface?', '["Clay", "Hard court"]', null),
('Πας στο φιλέ με την πρώτη ευκαιρία ή μένεις πίσω;', 'Your take', 'Do you rush the net at the first chance or stay back?', '["To the net", "I stay back"]', null),
('Ποιος κρατάει το σκορ στο ματς σου;', 'Life on court', 'Who keeps the score in your matches?', '["Me", "My opponent", "Nobody, for sure"]', null),
('Πόσες ρακέτες έχεις σπάσει;', 'Life on court', 'How many rackets have you broken?', '["None", "One, by accident", "Do not ask"]', null),
('Πόσο παλιές είναι οι χορδές σου;', 'Life on court', 'How old are your strings?', '["Fresh", "Better not to ask", "There are strings?"]', null),
('Στο διπλό, η καλή συνεννόηση κερδίζει το καλό βολέ.', 'Your take', 'In doubles, good teamwork beats a good volley.', '["Agree", "No way"]', null),
('Στο διπλό, το ματς το κρίνει ο πιο αδύναμος της τετράδας.', 'Your take', 'In doubles, the weakest of the four decides the match.', '["True", "No, the best one does"]', null),
('Στο μονό κερδίζει ο πιο σταθερός, όχι ο πιο ταλαντούχος.', 'Your take', 'In singles, the steadiest player wins, not the most talented.', '["Agree", "Talent wins"]', null),
('Τι σου χαλάει πιο πολύ το ματς;', 'Life on court', 'What ruins your match the most?', '["The wind", "The sun on my serve", "An opponent who will not talk"]', null),
('Το let στο σερβίς πρέπει να παίζεται.', 'Your take', 'A let on serve should be played.', '["Yes, play it", "No, serve again"]', null),
('Το super tie-break στα 10 είναι πιο δίκαιο από τρίτο σετ.', 'Your take', 'A super tie-break to 10 is fairer than a third set.', '["Yes, quick and fair", "No, I want a third set"]', null),
('Το ζέσταμά σου πριν το ματς;', 'Life on court', 'Your warm-up before a match?', '["A proper one", "Two or three balls", "The first set"]', null),
('Το λάθος στο διπλό ήταν…', 'Life on court', 'The mistake in doubles was…', '["Mine, I say so", "Both of ours", "My partner''s, I just think it"]', null),
('Τρίτο σετ, μετά από δυόμισι ώρες. Τι σκέφτεσαι;', 'Life on court', 'Third set, two and a half hours in. What are you thinking?',
 '["\"This one is mine\"", "Please, no more", "The souvlaki after"]', null),
('Χάνεις το πρώτο σετ. Τι κάνεις;', 'Your take', 'You lose the first set. What do you do?', '["Change tactics", "Keep going, it will turn"]', null),
-- Σενάριο
('Tie-break στο 6-6. Ποιος θα μείνει ψύχραιμος, {p1.o} ή {p2.o};', 'Scenario', 'Tie-break at 6-6. Who keeps cool, {p1} or {p2}?', '["{p1}", "{p2}"]', null),
('{p1.o} προηγείται 5-2 στο τρίτο σετ. Μπορεί {p2.o} να το γυρίσει;', 'Scenario', '{p1} leads 5-2 in the third set. Can {p2} turn it round?',
 '["Yes, turns it round", "No, it is over"]', null),
('{p1.o} σερβίρει για το ματς στο 5-4 απέναντι {p2.ston}. Το κλείνει;', 'Scenario', '{p1} serves for the match at 5-4 against {p2}. Does she close it out?',
 '["She closes it out", "{p2.first} breaks back"]', null),
('Δεύτερο σετ, 3-0 μπροστά {p1.o}. Μπορεί {p2.o} να γυρίσει το ματς;', 'Scenario', 'Second set, {p1} is up 3-0. Can {p2} turn the match round?',
 '["Yes, it can happen", "No, {p1.first} has it"]', null),
('Διπλό γυναικών. Ποιο ζευγάρι δένει καλύτερα, {p1} και {p2} ή {p3} και {p4};', 'Scenario · doubles',
 'Women''s doubles. Which pair clicks better, {p1} and {p2} or {p3} and {p4}?', '["{p1.first} & {p2.first}", "{p3.first} & {p4.first}"]', null),
('Διπλό. Ποιο ζευγάρι δένει καλύτερα, {p1} και {p2} ή {p3} και {p4};', 'Scenario · doubles',
 'Doubles. Which pair clicks better, {p1} and {p2} or {p3} and {p4}?', '["{p1.first} & {p2.first}", "{p3.first} & {p4.first}"]', null),
('Σκληρό γήπεδο. Ποιος είναι πιο επικίνδυνος, {p1.o} ή {p2.o};', 'Scenario', 'Hard court. Who is more dangerous, {p1} or {p2}?', '["{p1}", "{p2}"]', null),
('Τρίτο σετ στο τέλος. Ποια κρατάει την ψυχραιμία της, {p1.o} ή {p2.o};', 'Scenario', 'End of the third set. Who keeps her cool, {p1} or {p2}?', '["{p1}", "{p2}"]', null),
('Τρίτο σετ, 4-4, και φυσάει. Ποιος το κλείνει;', 'Scenario', 'Third set, 4-4, and the wind is up. Who closes it out?', '["{p1}", "{p2}"]', null),
('Χώμα. Ποια είναι πιο δύσκολη, {p1.o} ή {p2.o};', 'Scenario', 'Clay. Who is tougher to beat, {p1} or {p2}?', '["{p1}", "{p2}"]', null),
('Χώμα. Ποιος κερδίζει, {p1.o} ή {p2.o};', 'Scenario', 'Clay. Who wins, {p1} or {p2}?', '["{p1}", "{p2}"]', null);

update core.quiz_templates q
   set text_en = jsonb_strip_nulls(jsonb_build_object('tag', b.tag, 'q', b.q, 'options', b.options, 'reveal', b.reveal))
  from i18n_bank b
 where q.trigger in ('static', 'rule') and q.slot_template ->> 'q' = b.q_el
   and jsonb_array_length(q.option_templates) = jsonb_array_length(b.options);
drop table i18n_bank;

-- «Ποιος είναι;»: the question and the clues are built from the facts; only the tag is the template's
update core.quiz_templates
   set text_en = jsonb_build_object('tag', case when guardrails ->> 'gender' = 'f' then 'Who is she?' else 'Who is he?' end)
 where trigger = 'static' and family = 'q';

-- the dynamic cards: the generators write the words, the template gives the tag
update core.quiz_templates
   set text_en = jsonb_build_object('tag', case trigger when 'pre' then 'Before the match'
                                                        when 'post' then 'After the result'
                                                        when 'weekly' then 'Weekly'
                                                        when 'month' then 'The month'
                                                        when 'tour' then case when slot_template ->> 'kind' = 'recall' then 'Remember?' else 'Tournament' end
                                                        else case slot_template ->> 'kind' when 'score' then 'Guess the score'
                                                                                          when 'comeback' then 'Turned it round?'
                                                                                          when 'busy' then 'The busiest'
                                                                                          when 'h2h' then 'Head to head' end end)
 where trigger in ('pre', 'post', 'weekly', 'month', 'tour', 'real')
   and (trigger <> 'real' or slot_template ->> 'kind' in ('score', 'comeback', 'busy', 'h2h'));

-- ---------------------------------------------------------------------------
-- Kudos lines («Πες μια καλή κουβέντα»): English needs no gender; plural for doubles
-- ---------------------------------------------------------------------------
update core.kudos_options o
   set forms_en = jsonb_build_object('m', x.one, 'f', x.one, 'plural', coalesce(x.many, x.one))
  from (values
    ('strong_serve', 'Big serve', null),
    ('tough_second', 'Tricky second serve', null),
    ('steady_serve', 'Steady serve', null),
    ('great_returns', 'Great returns', null),
    ('steady_forehand', 'Steady forehand', null),
    ('great_backhand', 'Killer backhand', null),
    ('deep_balls', 'Deep balls', null),
    ('nice_slice', 'Lovely slice', null),
    ('heavy_topspin', 'Heavy topspin', null),
    ('nice_angles', 'Sharp angles', null),
    ('steady_baseline', 'Solid from the baseline', null),
    ('great_net', 'Great at the net', null),
    ('nice_volleys', 'Lovely volleys', null),
    ('cannon_smash', 'A cannon of a smash', null),
    ('nice_lobs', 'Lovely lobs', null),
    ('nice_drops', 'Lovely drop shots', null),
    ('passing_shots', 'Passing shots nobody could reach', null),
    ('quick_feet', 'Quick feet', null),
    ('got_everything', 'Got everything back', null),
    ('stamina', 'Endless stamina', null),
    ('read_the_game', 'Read the game', null),
    ('changed_pace', 'Mixed up the pace', null),
    ('calm_clutch', 'Cool on the big points', null),
    ('never_quit', 'Never gave up', null),
    ('turned_it', 'Turned the match round', null),
    ('fair_calls', 'Fair on the close calls', null),
    ('good_vibes', 'Good vibes', null),
    ('courtesy', 'Polite on court', null),
    ('applauded', 'Clapped the good shots', null),
    ('no_moaning', 'No moaning', null),
    ('on_time', 'Showed up on time', null),
    ('chemistry', 'Great chemistry', null),
    ('covered_court', 'Covered the whole court', null),
    ('strong_duo', 'Strong duo', null),
    ('rematch', 'Up for a rematch', null)
  ) as x(key, one, many)
 where o.key = x.key;

-- ---------------------------------------------------------------------------
-- How you earn an item (Η εμφάνισή σου)
-- ---------------------------------------------------------------------------
update core.cosmetic_items c
   set earn_rule_text_en = x.rule
  from (values
    ('bg_clay', 'Earn it with a quest'),
    ('bg_grass', 'Earn it with the weekly quest'),
    ('bg_night', 'Earn it with a quest'),
    ('frame_founding', 'For Pro founding members who joined by 31 March'),
    ('frame_friends', 'Earn it when you follow 10 players'),
    ('frame_hundred', 'Earn it with 100 days in a row'),
    ('frame_level', 'Earn it by taking a badge to gold'),
    ('frame_month', 'Earn it with 30 days in a row'),
    ('frame_month_top', 'Earn it with a top 3 finish on the Ladder'),
    ('frame_week', 'Earn it with the weekly quest'),
    ('gear_crown', 'Earn it by finishing a month first in your Ladder'),
    ('gear_headband', 'Earn it with 5 correct votes in a row'),
    ('kit_night', 'Earn it with the Club oracle badge')
  ) as x(key, rule)
 where c.key = x.key and c.earn_rule_text is not null;
-- Seven and Ten follow the σερί: days in a row once the daily σερί is on, correct votes in a row before
update core.cosmetic_items
   set earn_rule_text_en = case when earn_rule_text like '%μέρες%' then 'Earn it with ' || case key when 'frame_seven' then '7' else '10' end || ' days in a row'
                                else 'Earn it with ' || case key when 'frame_seven' then '7' else '10' end || ' correct votes in a row' end
 where key in ('frame_seven', 'frame_ten') and earn_rule_text is not null;

-- ---------------------------------------------------------------------------
-- Small helpers for the English cards
-- ---------------------------------------------------------------------------
-- core.quiz_when in English: «today», «tomorrow», «on Monday»
create or replace function core.quiz_when_en(p_at timestamptz, p_from date)
returns text
language sql immutable set search_path = core, pg_temp
as $$
  select case
           when core.athens_day(p_at) = p_from then 'today'
           when core.athens_day(p_at) = p_from + 1 then 'tomorrow'
           else case extract(isodow from core.athens_day(p_at))::int
                  when 1 then 'on Monday' when 2 then 'on Tuesday' when 3 then 'on Wednesday' when 4 then 'on Thursday'
                  when 5 then 'on Friday' when 6 then 'on Saturday' else 'on Sunday' end
         end
$$;
revoke all on function core.quiz_when_en(timestamptz, date) from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- core.quiz_facts_en: core.quiz_facts (20270209000000_moderate_player_matches.sql) in English, the same facts in the same order
-- ---------------------------------------------------------------------------
create or replace function core.quiz_facts_en(p_player uuid, p_sport text, p_day date)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_from  timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  v_last  record;
  v_month int;
  v_wins  int;
  v_tour  text;
  v_hand  text;
  v_g     text;
  v_clues jsonb := '[]'::jsonb;
begin
  select gender into v_g from core.players where id = p_player;
  -- the last match with a result
  select r.winner_side = mp.side as won, r.sets, jsonb_array_length(coalesce(r.sets, '[]'::jsonb)) as n
    into v_last
    from core.match_participants mp
    join core.matches mx on mx.id = mp.match_id and mx.sport_id = p_sport and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
    join core.match_results r on r.match_id = mx.id and not r.walkover
   where mp.player_id = p_player and mx.starts_at < v_from
   order by mx.starts_at desc limit 1;
  if v_last.won is not null then
    v_clues := v_clues || to_jsonb(
      case when v_last.won and v_last.n = 3 then 'Won ' || case when v_g = 'f' then 'her' else 'his' end || ' last match in the third set'
           when v_last.won then 'Won ' || case when v_g = 'f' then 'her' else 'his' end || ' last match ' || core.quiz_score(v_last.sets)
           when v_last.n = 3 then 'Lost ' || case when v_g = 'f' then 'her' else 'his' end || ' last match in the third set'
           else 'Lost ' || case when v_g = 'f' then 'her' else 'his' end || ' last match' end);
  end if;
  -- this month
  select count(*), count(*) filter (where r.winner_side = mp.side)
    into v_month, v_wins
    from core.match_participants mp
    join core.matches mx on mx.id = mp.match_id and mx.sport_id = p_sport and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
    join core.match_results r on r.match_id = mx.id
   where mp.player_id = p_player and mx.starts_at >= date_trunc('month', v_from) and mx.starts_at < v_from;
  if v_month > 0 then
    v_clues := v_clues || to_jsonb(v_wins || case when v_wins = 1 then ' win in ' else ' wins in ' end
                                   || v_month || case when v_month = 1 then ' match' else ' matches' end || ' this month');
  end if;
  -- the tournament they play in lately
  select t.name into v_tour
    from core.match_participants mp
    join core.matches mx on mx.id = mp.match_id and mx.sport_id = p_sport and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
    join core.tournaments t on t.id = mx.tournament_id and not t.is_minor_event
   where mp.player_id = p_player and mx.starts_at > v_from - interval '60 days'
   order by mx.starts_at desc limit 1;
  if v_tour is not null then
    v_clues := v_clues || to_jsonb('Plays at ' || v_tour);
  end if;
  select hand into v_hand from core.player_sports where player_id = p_player and sport_id = p_sport;
  if v_hand = 'L' then
    v_clues := v_clues || to_jsonb('Left-handed'::text);
  end if;
  return v_clues;
end;
$$;
revoke all on function core.quiz_facts_en(uuid, text, date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- core.quiz_who: copied from 20270124000000_quiz_quality.sql; adds q_en and clues_en
-- ---------------------------------------------------------------------------
create or replace function core.quiz_who(p_user uuid, p_sport text, p_gender text, p_seed text, p_used uuid[])
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_day   date := core.athens_day();
  v_right uuid;
  v_clues jsonb;
  v_opts  jsonb;
  v_ids   uuid[];
  x       record;
begin
  for x in select q.player_id from core.quiz_pool(p_user, p_sport, p_gender, p_seed) q where q.player_id <> all (p_used) limit 12 loop
    v_clues := core.quiz_facts(x.player_id, p_sport, v_day);
    if jsonb_array_length(v_clues) >= 2 then
      v_right := x.player_id;
      exit;
    end if;
  end loop;
  if v_right is null then return null; end if;

  v_ids := array(select q.player_id from core.quiz_pool(p_user, p_sport, p_gender, p_seed || 'd') q
                  where q.player_id <> all (p_used) and q.player_id <> v_right
                    and core.quiz_facts(q.player_id, p_sport, v_day) is distinct from v_clues
                  limit 2);
  if coalesce(array_length(v_ids, 1), 0) < 2 then return null; end if;

  v_ids := array(select u from unnest(v_ids || v_right) u order by md5(p_seed || 'o' || u::text));
  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_opts from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'q', (case jsonb_array_length(v_clues) when 2 then 'Δύο στοιχεία, ' when 3 then 'Τρία στοιχεία, ' else 'Τέσσερα στοιχεία, ' end)
         || case when p_gender = 'f' then 'μία παίκτρια. Ποια είναι;' else 'ένας παίκτης. Ποιος είναι;' end,
    'clues', v_clues,
    'players', v_opts,
    'options', (select jsonb_agg(jsonb_build_object('label', '{p' || i || '}')) from generate_series(1, 3) i),
    'right', array_position(v_ids, v_right) - 1,
    'ids', to_jsonb(v_ids),
    -- i18n: the same card in English
    'q_en', (case jsonb_array_length(v_clues) when 2 then 'Two clues, ' when 3 then 'Three clues, ' else 'Four clues, ' end)
            || case when p_gender = 'f' then 'one player. Who is she?' else 'one player. Who is he?' end,
    'clues_en', core.quiz_facts_en(v_right, p_sport, v_day));
end;
$$;

-- ---------------------------------------------------------------------------
-- core.quiz_dynamic: copied from 20270413000000_quiz_variety.sql; adds content_en
-- ---------------------------------------------------------------------------
create or replace function core.quiz_dynamic(p_user uuid, p_sport text, p_kind text, p_day date, p_seed text,
                                             p_used_players uuid[], p_used_templates uuid[], p_wide boolean default false)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_match  uuid;
  v_from   timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  m        record;
  t        core.quiz_templates;
  v_kind   text;
  v_q      text;
  v_opts   jsonb;
  v_ids    uuid[];
  v_pl     jsonb;
  v_prev   int;
  v_tag    text;
  v_right  int;
  v_reveal text;
  v_upset  boolean;
  -- i18n: the English words of the card
  v_q_en      text;
  v_opts_en   jsonb;
  v_tag_en    text;
  v_reveal_en text;
begin
  create temp table if not exists qd_pool (player_id uuid primary key, rk int) on commit drop;
  truncate qd_pool;
  insert into qd_pool
  select x.player_id, x.n from core.quiz_pool(p_user, p_sport, null, p_seed)
         with ordinality as x(player_id, first_name, surname, gender, area_id, level_tier, level_direction, hand, form, n);

  if p_kind = 'weekly' then
    select * into t from core.quiz_templates where active and trigger = 'weekly' and id <> all (p_used_templates) limit 1;
    if t.id is null then return null; end if;
    v_ids := array(
      select w.player_id from (
        select mp.player_id, count(*) as wins, min(qp.rk) as rk
          from core.matches mx
          join core.match_results r on r.match_id = mx.id
          join core.match_participants mp on mp.match_id = mx.id and mp.side = r.winner_side
          join qd_pool qp on qp.player_id = mp.player_id
         where mx.sport_id = p_sport and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void' and not r.walkover
           and mx.starts_at >= v_from - interval '7 days' and mx.starts_at < v_from
           and mp.player_id <> all (p_used_players)
         group by mp.player_id) w
       order by w.wins desc, w.rk limit 3);
    if coalesce(array_length(v_ids, 1), 0) < 3 then return null; end if;
    v_q := 'Ποιος ήταν ο παίκτης της βδομάδας στην παρέα σου;';
    v_q_en := 'Who was the player of the week in your crew?';
    v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}, {"label": "{p3}"}]';
    v_tag := t.slot_template ->> 'tag';
    v_tag_en := coalesce(t.text_en ->> 'tag', v_tag);
  else
    select mx.id, mx.starts_at, r.sets, r.winner_side, mx.tournament_id as t_id,
           a.player_id as a_id, b.player_id as b_id,
           pa.gender as a_g, pb.gender as b_g, la.level_tier as a_lvl, lb.level_tier as b_lvl
      into m
      from core.matches mx
      join core.match_participants a on a.match_id = mx.id and a.side = 1
      join core.match_participants b on b.match_id = mx.id and b.side = 2
      left join qd_pool qa on qa.player_id = a.player_id
      left join qd_pool qb on qb.player_id = b.player_id
      join core.players pa on pa.id = a.player_id
      join core.players pb on pb.id = b.player_id
      left join core.player_sports la on la.player_id = a.player_id and la.sport_id = p_sport
      left join core.player_sports lb on lb.player_id = b.player_id and lb.sport_id = p_sport
      left join core.match_results r on r.match_id = mx.id
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
       and case when p_wide then mx.tournament_id is not null and not pa.hidden and not pa.is_minor and not pb.hidden and not pb.is_minor
                      and not exists (select 1 from core.tournaments tx where tx.id = mx.tournament_id and tx.is_minor_event)
                -- one of the two is someone I can know, the other one too or at least on the same court
                else qa.player_id is not null or qb.player_id is not null end
       and not pa.hidden and not pa.is_minor and not pb.hidden and not pb.is_minor
       and a.player_id <> all (p_used_players) and b.player_id <> all (p_used_players)
       and (select count(*) from core.match_participants c where c.match_id = mx.id) = 2
       and mx.id not in (select match_id from core.quiz_recent_matches(p_user))
       and case when p_kind = 'pre'
                then r.match_id is null and core.match_is_open(mx) and mx.starts_at < v_from + interval '7 days'
                else r.match_id is not null and not r.walkover and jsonb_array_length(coalesce(r.sets, '[]'::jsonb)) > 0
                     and mx.starts_at >= v_from - interval '7 days' and mx.starts_at < v_from end
     -- fresh faces first: fewer people asked about lately, then people I know, then by chance
     order by (a.player_id in (select player_id from core.quiz_recent_players(p_user)))::int
              + (b.player_id in (select player_id from core.quiz_recent_players(p_user)))::int,
              (qa.player_id is not null and qb.player_id is not null) desc, least(qa.rk, qb.rk) nulls last, md5(p_seed || mx.id::text)
     limit 1;
    if m.id is null then return null; end if;
    v_match := m.id;

    if p_kind = 'pre' then
      select count(*) into v_prev
        from core.match_participants x join core.match_participants y on y.match_id = x.match_id and y.side <> x.side
        join core.match_results rr on rr.match_id = x.match_id
       where x.player_id = m.a_id and y.player_id = m.b_id;
      v_kind := case when v_prev > 0 then 'rematch'
                     when m.a_lvl is not null and m.b_lvl is not null and abs(m.a_lvl - m.b_lvl) >= 1 then 'upset'
                     else 'first' end;
      select * into t from core.quiz_templates
       where active and trigger = 'pre' and slot_template ->> 'kind' = v_kind and id <> all (p_used_templates) limit 1;
      if t.id is null then return null; end if;
      v_tag := t.slot_template ->> 'tag';
      v_tag_en := coalesce(t.text_en ->> 'tag', v_tag);
      v_ids := case when v_kind = 'upset' and m.b_lvl < m.a_lvl then array[m.b_id, m.a_id] else array[m.a_id, m.b_id] end;
      if v_kind = 'rematch' then
        v_q := '{p1.o} και {p2.o} ξαναβρίσκονται ' || core.quiz_when(m.starts_at, p_day) || '. Ποιος το παίρνει τώρα;';
        v_q_en := '{p1} and {p2} meet again ' || core.quiz_when_en(m.starts_at, p_day) || '. Who takes it this time?';
        v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
      elsif v_kind = 'first' then
        v_q := '{p1.o} με {p2.ton}, πρώτη φορά απέναντι ' || core.quiz_when(m.starts_at, p_day) || '. Ποιος το παίρνει;';
        v_q_en := '{p1} plays {p2} ' || core.quiz_when_en(m.starts_at, p_day) || ', their first meeting. Who takes it?';
        v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
      else
        v_q := '{p1.o} παίζει ' || core.quiz_when(m.starts_at, p_day) || ' με {p2.ton}, που ξεκινά φαβορί. Γίνεται ανατροπή;';
        v_opts := '[{"label": "Ναι, γίνεται"}, {"label": "Όχι, δεν γίνεται"}]';
        v_q_en := '{p1} plays {p2} ' || core.quiz_when_en(m.starts_at, p_day) || ', and {p2} is the favourite. Upset?';
        v_opts_en := '[{"label": "Yes, upset"}, {"label": "No, not this time"}]';
      end if;
    else
      -- the result stays hidden in the question; who won, or whether it went the distance, then the answer
      select * into t from core.quiz_templates
       where active and trigger = 'post' and id <> all (p_used_templates)
         and case p_kind when 'post_third' then slot_template ->> 'kind' = 'close'
                         when 'post_who' then slot_template ->> 'kind' is distinct from 'close'
                         else true end
       order by md5(p_seed || id::text) limit 1;
      if t.id is null then return null; end if;
      v_upset := m.a_lvl is not null and m.b_lvl is not null
                 and (case m.winner_side when 1 then m.a_lvl - m.b_lvl else m.b_lvl - m.a_lvl end) <= -0.5;
      v_ids := case when md5(p_seed || m.id::text) < md5(m.id::text || p_seed) then array[m.a_id, m.b_id] else array[m.b_id, m.a_id] end;
      v_q := '{p1.o} με {p2.ton} ' || core.quiz_when(m.starts_at, p_day);
      v_q_en := '{p1} played {p2} ' || core.quiz_when_en(m.starts_at, p_day);
      -- one of the three result templates asks about the third set, so it comes at most once a day
      if t.slot_template ->> 'kind' = 'close' then
        v_tag := 'Τρίτο σετ;';
        v_q := v_q || '. Πήγε σε τρίτο σετ;';
        v_opts := '[{"label": "Ναι, τρία σετ"}, {"label": "Όχι, σε δύο"}]';
        v_tag_en := 'Third set?';
        v_q_en := v_q_en || '. Did it go to a third set?';
        v_opts_en := '[{"label": "Yes, three sets"}, {"label": "No, in two"}]';
        v_right := case when jsonb_array_length(m.sets) >= 3 then 0 else 1 end;
      else
        v_tag := 'Ποιος κέρδισε;';
        v_q := v_q || '. Ποιος κέρδισε;';
        v_tag_en := 'Who won?';
        v_q_en := v_q_en || '. Who won?';
        v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
        v_right := case when (m.winner_side = 1) = (v_ids[1] = m.a_id) then 0 else 1 end;
      end if;
      v_reveal := case when v_upset then 'Ανατροπή! ' else '' end
                  || '{p' || (case when (m.winner_side = 1) = (v_ids[1] = m.a_id) then 1 else 2 end) || '.o} κέρδισε '
                  || core.quiz_score(m.sets) || '.';
      v_reveal_en := case when v_upset then 'Upset! ' else '' end
                     || '{p' || (case when (m.winner_side = 1) = (v_ids[1] = m.a_id) then 1 else 2 end) || '} won '
                     || core.quiz_score(m.sets) || '.';
    end if;
  end if;

  -- a tournament match names its tournament first: «ΑΟΚ Tennis Open: …»
  if p_kind <> 'weekly' then
    if m.t_id is not null then
      v_q := (select core.quiz_short_name(name) from core.tournaments where id = m.t_id) || ': ' || v_q;
      v_q_en := (select core.quiz_short_name(name) from core.tournaments where id = m.t_id) || ': ' || v_q_en;
    end if;
  end if;

  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_pl from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'template_id', t.id,
    'ids', to_jsonb(v_ids),
    'content', jsonb_build_object('tag', v_tag, 'q', v_q, 'options', v_opts, 'players', v_pl,
                                  'week', p_kind = 'weekly', 'match_id', v_match)
               || case when v_right is not null then jsonb_build_object('right', v_right, 'reveal', v_reveal) else '{}'::jsonb end,
    -- i18n: the English words over the card
    'content_en', jsonb_strip_nulls(jsonb_build_object('tag', v_tag_en, 'q', v_q_en, 'options', coalesce(v_opts_en, v_opts),
                                                       'reveal', v_reveal_en)));
end;
$$;

-- ---------------------------------------------------------------------------
-- core.quiz_real: copied from 20270413000000_quiz_variety.sql; adds content_en
-- ---------------------------------------------------------------------------
create or replace function core.quiz_real(p_user uuid, p_sport text, p_kind text, p_day date, p_seed text,
                                          p_used_players uuid[], p_used_templates uuid[])
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_from   timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  t        core.quiz_templates;
  m        record;
  v_ids    uuid[];
  v_q      text;
  v_opts   jsonb;
  v_right  int;
  v_reveal text;
  v_match  uuid;
  v_score  text;
  v_wrong  text[];
  v_top    uuid;
  v_n      int;
  v_pl     jsonb;
  -- i18n: the English words of the card
  v_q_en      text;
  v_opts_en   jsonb;
  v_reveal_en text;
begin
  select * into t from core.quiz_templates
   where active and trigger = 'real' and slot_template ->> 'kind' = p_kind and id <> all (p_used_templates) limit 1;
  if t.id is null then return null; end if;

  create temp table if not exists qr_pool (player_id uuid primary key) on commit drop;
  truncate qr_pool;
  insert into qr_pool select x.player_id from core.quiz_pool(p_user, p_sport, null, p_seed) x;

  if p_kind in ('score', 'comeback') then
    -- a finished singles match of the last two weeks; the sets are stored winner first
    select mx.id, r.sets, r.winner_side, a.player_id as a_id, b.player_id as b_id,
           jsonb_array_length(r.sets) as n, (r.sets -> 0 ->> 'w')::int < (r.sets -> 0 ->> 'l')::int as turned
      into m
      from core.matches mx
      join core.match_results r on r.match_id = mx.id and not r.walkover and not r.retired
      join core.match_participants a on a.match_id = mx.id and a.side = 1
      join core.match_participants b on b.match_id = mx.id and b.side = 2
      join core.players pa on pa.id = a.player_id and pa.status = 'active' and not pa.hidden and not pa.is_minor
      join core.players pb on pb.id = b.player_id and pb.status = 'active' and not pb.hidden and not pb.is_minor
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
       and mx.starts_at >= v_from - interval '14 days' and mx.starts_at < v_from
       and jsonb_array_length(coalesce(r.sets, '[]'::jsonb)) >= 2
       and (a.player_id in (select player_id from qr_pool) or b.player_id in (select player_id from qr_pool))
       and a.player_id <> all (p_used_players) and b.player_id <> all (p_used_players)
       and mx.id not in (select match_id from core.quiz_recent_matches(p_user))
       -- the two answers of «Το γύρισε;» have to cover what happened: turned round, or over in two
       and (p_kind = 'score' or jsonb_array_length(r.sets) = 2 or (r.sets -> 0 ->> 'w')::int < (r.sets -> 0 ->> 'l')::int)
     order by (a.player_id in (select player_id from core.quiz_recent_players(p_user)))::int
              + (b.player_id in (select player_id from core.quiz_recent_players(p_user)))::int, md5(p_seed || mx.id::text)
     limit 1;
    if m.id is null then return null; end if;
    v_match := m.id;
    v_score := core.quiz_score(m.sets);
    if p_kind = 'score' then
      -- p1 won; the true score among two that could have been
      v_ids := case when m.winner_side = 1 then array[m.a_id, m.b_id] else array[m.b_id, m.a_id] end;
      v_wrong := array(select s from unnest(array['6-3, 6-4', '6-4, 6-2', '7-5, 6-3', '6-2, 6-1', '7-6, 6-4', '6-4, 3-6, 10-7', '4-6, 6-3, 6-4']) s
                        where s <> v_score order by md5(p_seed || s) limit 2);
      v_right := abs(('x' || substr(md5(p_seed || 'r'), 1, 6))::bit(24)::int) % 3;
      v_opts := (select jsonb_agg(jsonb_build_object('label', l) order by o)
                   from (select v_score as l, v_right as o
                         union all select v_wrong[1], case when v_right = 0 then 1 else 0 end
                         union all select v_wrong[2], case when v_right = 2 then 1 else 2 end) x);
      v_q := '{p1.o} κέρδισε {p2.ton}. Με τι σκορ;';
      v_reveal := '{p1.o} κέρδισε ' || v_score || '.';
      v_q_en := '{p1} beat {p2}. What was the score?';
      v_reveal_en := '{p1} won ' || v_score || '.';
    else
      -- p1 lost the first set: the winner when it turned round, else the loser
      v_ids := case when m.turned = (m.winner_side = 1) then array[m.a_id, m.b_id] else array[m.b_id, m.a_id] end;
      v_q := '{p1.o} έχασε το πρώτο σετ από {p2.ton}. Τι έγινε μετά;';
      v_q_en := '{p1} lost the first set to {p2}. What happened next?';
      v_opts_en := '[{"label": "Turned it round"}, {"label": "Over in two"}]';
      v_opts := '[{"label": "Το γύρισε"}, {"label": "Τέλειωσε σε δύο"}]';
      v_right := case when m.turned then 0 else 1 end;
      v_reveal := '{p' || case when m.turned then 1 else 2 end || '.o} κέρδισε ' || v_score || '.';
      v_reveal_en := '{p' || case when m.turned then 1 else 2 end || '} won ' || v_score || '.';
    end if;

  elsif p_kind = 'h2h' then
    -- two people with two or more results between them
    select least(a.player_id, b.player_id) as lo, greatest(a.player_id, b.player_id) as hi,
           count(*) filter (where (r.winner_side = a.side) = (a.player_id < b.player_id))::int as lo_wins,
           count(*)::int as played
      into m
      from core.matches mx
      join core.match_results r on r.match_id = mx.id and not r.walkover
      join core.match_participants a on a.match_id = mx.id and a.side = 1
      join core.match_participants b on b.match_id = mx.id and b.side = 2
      join core.players pa on pa.id = a.player_id and pa.status = 'active' and not pa.hidden and not pa.is_minor
      join core.players pb on pb.id = b.player_id and pb.status = 'active' and not pb.hidden and not pb.is_minor
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
       and (a.player_id in (select player_id from qr_pool) or b.player_id in (select player_id from qr_pool))
       and a.player_id <> all (p_used_players) and b.player_id <> all (p_used_players)
     group by 1, 2
    having count(*) >= 2
     order by md5(p_seed || least(a.player_id, b.player_id)::text || greatest(a.player_id, b.player_id)::text)
     limit 1;
    if m.lo is null then return null; end if;
    v_ids := case when md5(p_seed || m.lo::text) < md5(p_seed || m.hi::text) then array[m.lo, m.hi] else array[m.hi, m.lo] end;
    v_q := '{p1.o} και {p2.o} έχουν ξαναπαίξει. Ποιος προηγείται;';
    v_q_en := '{p1} and {p2} have played before. Who leads?';
    v_opts_en := '[{"label": "{p1}"}, {"label": "{p2}"}, {"label": "All square"}]';
    v_opts := jsonb_build_array(jsonb_build_object('label', '{p1}'), jsonb_build_object('label', '{p2}'),
      jsonb_build_object('label', case when (select bool_and(p.gender = 'f') from core.players p where p.id = any (v_ids))
                                       then 'Είναι ισόπαλες' else 'Είναι ισόπαλοι' end));
    if m.lo_wins * 2 = m.played then
      v_right := 2;
      v_reveal := 'Είναι ' || m.lo_wins || '-' || m.lo_wins || '.';
      v_reveal_en := 'All square at ' || m.lo_wins || '-' || m.lo_wins || '.';
    else
      v_right := case when (m.lo_wins * 2 > m.played) = (v_ids[1] = m.lo) then 0 else 1 end;
      v_reveal := '{p' || (v_right + 1) || '.o} προηγείται ' || greatest(m.lo_wins, m.played - m.lo_wins) || '-' || least(m.lo_wins, m.played - m.lo_wins) || '.';
      v_reveal_en := '{p' || (v_right + 1) || '} leads ' || greatest(m.lo_wins, m.played - m.lo_wins) || '-' || least(m.lo_wins, m.played - m.lo_wins) || '.';
    end if;

  else -- busy: the most matches this month, a clear first and two with fewer
    with played as (
      select mp.player_id, count(*)::int as n
        from core.matches mx
        join core.match_results r on r.match_id = mx.id and not r.walkover
        join core.match_participants mp on mp.match_id = mx.id
        join qr_pool q on q.player_id = mp.player_id
       where mx.sport_id = p_sport and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
         and mx.starts_at >= date_trunc('month', v_from) and mx.starts_at < v_from
         and mp.player_id <> all (p_used_players)
       group by 1
    ), leader as (select player_id, n from played order by n desc, md5(p_seed || player_id::text) limit 1),
    others as (select player_id from played where n < (select n from leader) order by md5(p_seed || player_id::text) limit 2)
    select (select player_id from leader), (select n from leader), array(select player_id from others) into v_top, v_n, v_ids;
    if v_top is null or v_n < 2 or coalesce(array_length(v_ids, 1), 0) < 2 then return null; end if;
    v_ids := array(select u from unnest(v_ids || v_top) u order by md5(p_seed || 'b' || u::text));
    v_q := 'Ποιος έπαιξε τα περισσότερα ματς αυτόν τον μήνα;';
    v_q_en := 'Who played the most matches this month?';
    v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}, {"label": "{p3}"}]';
    v_right := array_position(v_ids, v_top) - 1;
    v_reveal := '{p' || (v_right + 1) || '.o}, με ' || v_n || ' ματς.';
    v_reveal_en := '{p' || (v_right + 1) || '}, with ' || v_n || ' matches.';
  end if;

  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_pl from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'template_id', t.id,
    'ids', to_jsonb(v_ids),
    'content', jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', v_q, 'options', v_opts, 'players', v_pl,
                                  'match_id', v_match, 'right', v_right, 'reveal', v_reveal),
    -- i18n: the English words over the card
    'content_en', jsonb_strip_nulls(jsonb_build_object('tag', coalesce(t.text_en ->> 'tag', t.slot_template ->> 'tag'), 'q', v_q_en,
                                                       'options', coalesce(v_opts_en, v_opts), 'reveal', v_reveal_en)));
end;
$$;

-- ---------------------------------------------------------------------------
-- core.quiz_month: copied from 20270413000000_quiz_variety.sql; adds content_en
-- ---------------------------------------------------------------------------
create or replace function core.quiz_month(p_user uuid, p_sport text, p_day date, p_seed text,
                                           p_used_players uuid[], p_used_templates uuid[])
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_from timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  t      core.quiz_templates;
  v_ids  uuid[];
  v_top  uuid;
  v_wins int;
  v_pl   jsonb;
begin
  select * into t from core.quiz_templates where active and trigger = 'month' and id <> all (p_used_templates) limit 1;
  if t.id is null then return null; end if;
  -- people I can know; the leader and two with fewer wins
  with wins as (
    select mp.player_id, count(*) filter (where mp.side = r.winner_side) as w,
           min(case when q.player_id is not null then 0 else 1 end) as far
      from core.matches mx
      join core.match_results r on r.match_id = mx.id and not r.walkover
      join core.match_participants mp on mp.match_id = mx.id
      join core.players p on p.id = mp.player_id and p.status = 'active' and not p.hidden and not p.is_minor
      left join core.quiz_pool(p_user, p_sport, null, p_seed) q on q.player_id = mp.player_id
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
       and mx.starts_at >= date_trunc('month', v_from) and mx.starts_at < v_from
       and q.player_id is not null
       and mp.player_id <> all (p_used_players)
     group by mp.player_id
  ),
  scope as (select * from wins where far = (select min(far) from wins) and w > 0),
  leader as (select player_id, w from scope order by w desc, md5(p_seed || player_id::text) limit 1),
  others as (select player_id from scope where w < (select w from leader)
              order by player_id in (select player_id from core.quiz_recent_players(p_user)), md5(p_seed || player_id::text) limit 2)
  select (select player_id from leader), (select w from leader), array(select player_id from others)
    into v_top, v_wins, v_ids;
  if v_top is null or v_wins < 2 or coalesce(array_length(v_ids, 1), 0) < 2 then return null; end if;
  -- the same leader every day is no question: skip it while they were asked about lately
  if v_top in (select player_id from core.quiz_recent_players(p_user)) then return null; end if;

  v_ids := array(select u from unnest(v_ids || v_top) u order by md5(p_seed || 'm' || u::text));
  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_pl from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'template_id', t.id,
    'ids', to_jsonb(v_ids),
    'content', jsonb_build_object(
      'tag', t.slot_template ->> 'tag',
      'q', 'Ποιος έχει τις περισσότερες νίκες αυτόν τον μήνα;',
      'options', '[{"label": "{p1}"}, {"label": "{p2}"}, {"label": "{p3}"}]'::jsonb,
      'players', v_pl,
      'right', array_position(v_ids, v_top) - 1,
      'reveal', '{p' || array_position(v_ids, v_top) || '.o}, με ' || v_wins || ' νίκες.'),
    -- i18n: the English words over the card
    'content_en', jsonb_build_object(
      'tag', coalesce(t.text_en ->> 'tag', t.slot_template ->> 'tag'),
      'q', 'Who has the most wins this month?',
      'reveal', '{p' || array_position(v_ids, v_top) || '}, with ' || v_wins || ' wins.'));
end;
$$;

-- ---------------------------------------------------------------------------
-- core.quiz_tournament: copied from 20270413000000_quiz_variety.sql; adds content_en
-- ---------------------------------------------------------------------------
create or replace function core.quiz_tournament(p_user uuid, p_sport text, p_kind text, p_day date, p_seed text,
                                                p_used_players uuid[], p_used_templates uuid[])
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  t      core.quiz_templates;
  v_from timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  e      record;
  m      record;
  v_ids  uuid[];
  v_q    text;
  v_opts jsonb;
  v_pl   jsonb;
  v_right int;
  v_match uuid;
  v_q_en text;   -- i18n
begin
  select * into t from core.quiz_templates
   where active and trigger = 'tour' and slot_template ->> 'kind' = p_kind and id <> all (p_used_templates) limit 1;
  if t.id is null then return null; end if;

  if p_kind = 'cup' then
    -- a singles category of a tournament that is on, with three players still unbeaten in it
    for e in
      select ev.id, ev.name as ev, tt.name as tn
        from core.tournament_events ev
        join core.tournaments tt on tt.id = ev.tournament_id
       where tt.sport_id = p_sport and not tt.is_minor_event and core.tournament_state(tt) = 'ongoing'
         and exists (select 1 from core.matches mx
                       join core.match_participants mk on mk.match_id = mx.id
                       join core.quiz_pool(p_user, p_sport, null, p_seed) qk on qk.player_id = mk.player_id
                      where mx.event_id = ev.id and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void')
       order by md5(p_seed || ev.id::text)
       limit 20
    loop
      v_ids := array(
        select w.player_id from (
          select mp.player_id, bool_and(mp.side = r.winner_side) as unbeaten, count(*) as played
            from core.matches mx
            join core.match_results r on r.match_id = mx.id
            join core.match_participants mp on mp.match_id = mx.id
           where mx.event_id = e.id and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
           group by mp.player_id) w
          join core.players p on p.id = w.player_id
          left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = p_sport
         where w.unbeaten and p.status = 'active' and not p.hidden and not p.is_minor and p.id <> all (p_used_players)
         order by p.id in (select player_id from core.quiz_recent_players(p_user)), w.played desc, md5(p_seed || p.id::text)
         limit 3);
      if coalesce(array_length(v_ids, 1), 0) = 3 then
        v_q := case when core.quiz_clean_category(e.ev)
                    then 'Ποιος θα σηκώσει το ' || e.ev || ' στο ' || core.quiz_short_name(e.tn) || ';'
                    else 'Ποιος θα το σηκώσει στο ' || core.quiz_short_name(e.tn) || ';' end;
        v_q_en := case when core.quiz_clean_category(e.ev)
                       then 'Who wins the ' || e.ev || ' at ' || core.quiz_short_name(e.tn) || '?'
                       else 'Who wins it at ' || core.quiz_short_name(e.tn) || '?' end;
        v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}, {"label": "{p3}"}]';
        exit;
      end if;
      v_ids := null;
    end loop;
    if v_ids is null then return null; end if;
  else
    -- a tournament singles match from the last week; the options in a fixed but shuffled order, the right one marked
    select mx.id, mx.starts_at, r.winner_side, tt.name as tn, ev.name as ev, a.player_id as a_id, b.player_id as b_id
      into m
      from core.matches mx
      join core.tournaments tt on tt.id = mx.tournament_id
      left join core.tournament_events ev on ev.id = mx.event_id
      join core.match_results r on r.match_id = mx.id
      join core.match_participants a on a.match_id = mx.id and a.side = 1
      join core.match_participants b on b.match_id = mx.id and b.side = 2
      join core.players pa on pa.id = a.player_id
      join core.players pb on pb.id = b.player_id
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void' and not r.walkover
       and not tt.is_minor_event and not pa.hidden and not pa.is_minor and not pb.hidden and not pb.is_minor
       and pa.status = 'active' and pb.status = 'active'
       and a.player_id <> all (p_used_players) and b.player_id <> all (p_used_players)
       and mx.starts_at >= v_from - interval '7 days' and mx.starts_at < v_from
       and mx.id not in (select match_id from core.quiz_recent_matches(p_user))
     order by (a.player_id in (select player_id from core.quiz_recent_players(p_user)))::int
              + (b.player_id in (select player_id from core.quiz_recent_players(p_user)))::int, md5(p_seed || mx.id::text)
     limit 1;
    if m.id is null then return null; end if;
    v_match := m.id;
    v_ids := case when md5(p_seed || m.id::text) < md5(m.id::text || p_seed) then array[m.a_id, m.b_id] else array[m.b_id, m.a_id] end;
    v_right := case when (m.winner_side = 1) = (v_ids[1] = m.a_id) then 0 else 1 end;
    v_q := m.tn || coalesce(', ' || m.ev, '') || ': {p1.o} με {p2.ton} ' || core.quiz_when(m.starts_at, p_day)
           || '. Ποιος κέρδισε;';
    v_q_en := m.tn || coalesce(', ' || m.ev, '') || ': {p1} played {p2} ' || core.quiz_when_en(m.starts_at, p_day) || '. Who won?';
    v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
  end if;

  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_pl from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'template_id', t.id,
    'ids', to_jsonb(v_ids),
    'content', jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', v_q, 'options', v_opts, 'players', v_pl,
                                  'match_id', v_match)
               || case when p_kind = 'recall' then jsonb_build_object('right', v_right) else '{}'::jsonb end,
    -- i18n: the English words over the card
    'content_en', jsonb_strip_nulls(jsonb_build_object('tag', coalesce(t.text_en ->> 'tag', t.slot_template ->> 'tag'), 'q', v_q_en,
                                                       'options', v_opts)));
end;
$$;

-- ---------------------------------------------------------------------------
-- core.quiz_build_set: copied from 20270415000000_quiz_pro_one_rule.sql; keeps the English words of each card (content_en)
-- ---------------------------------------------------------------------------
create or replace function core.quiz_build_set(p_user uuid, p_day date, p_pro boolean default null)
returns uuid
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_set     uuid;
  v_sport   text;
  v_pro     boolean := coalesce(p_pro, core.is_pro(p_user));
  v_want    int;
  v_real    int;
  v_people  int;
  v_rules   int;
  v_base    text := p_user::text || p_day::text;
  v_cards   jsonb := '[]'::jsonb;
  v_used_t  uuid[] := '{}';
  v_used_p  uuid[] := '{}';
  v_got     int := 0;
  v_kind    text;
  v_kinds   text[] := array['pre', 'post_who', 'post_third', 'score', 'comeback', 'h2h', 'busy', 'month', 'cup', 'who'];
  v_seed    text;
  v_dyn     jsonb;
  v_who     jsonb;
  v_ids     uuid[];
  v_n       int;
  v_players jsonb;
  v_content jsonb;
  v_content_en jsonb;   -- i18n
  v_step    text;
  t         record;
begin
  select id into v_set from core.quiz_sets where user_id = p_user and quiz_day = p_day;
  if v_set is not null then return v_set; end if;
  select primary_sport into v_sport from core.profiles where user_id = p_user;
  v_sport := coalesce(v_sport, 'tennis');
  v_want := case when v_pro then 12 else 6 end;
  v_real := case when v_pro then 6 else 3 end;
  v_people := case when v_pro then 2 else 1 end;
  v_rules := 1;

  insert into core.quiz_sets (user_id, quiz_day, sport_id, pro) values (p_user, p_day, v_sport, v_pro)
  on conflict (user_id, quiz_day) do nothing returning id into v_set;
  if v_set is null then
    select id into v_set from core.quiz_sets where user_id = p_user and quiz_day = p_day;
    return v_set;
  end if;

  if extract(isodow from p_day) = 1 then v_kinds := array_append(v_kinds, 'weekly'); end if;

  -- from the real matches: one of a kind, in a different order each day
  foreach v_kind in array array(select k from unnest(v_kinds) k order by md5(v_base || k)) loop
    exit when jsonb_array_length(v_cards) >= v_real;
    v_seed := v_base || v_kind;
    v_dyn := case
      when v_kind in ('score', 'comeback', 'h2h', 'busy') then core.quiz_real(p_user, v_sport, v_kind, p_day, v_seed, v_used_p, v_used_t)
      when v_kind = 'month' then core.quiz_month(p_user, v_sport, p_day, v_seed, v_used_p, v_used_t)
      when v_kind = 'cup' then core.quiz_tournament(p_user, v_sport, 'cup', p_day, v_seed, v_used_p, v_used_t)
      when v_kind = 'who' then null
      else core.quiz_dynamic(p_user, v_sport, v_kind, p_day, v_seed, v_used_p, v_used_t) end;
    if v_kind = 'who' then
      for t in select * from core.quiz_templates where active and trigger = 'static' and family = 'q' order by md5(v_seed || id::text) loop
        v_who := core.quiz_who(p_user, v_sport, t.guardrails ->> 'gender', v_seed, v_used_p);
        continue when v_who is null;
        v_dyn := jsonb_build_object('template_id', t.id, 'family', 'q', 'ids', v_who -> 'ids',
          'content', jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', v_who ->> 'q', 'clues', v_who -> 'clues',
                                        'options', v_who -> 'options', 'right', (v_who ->> 'right')::int, 'players', v_who -> 'players'),
          -- i18n
          'content_en', jsonb_strip_nulls(jsonb_build_object('tag', coalesce(t.text_en ->> 'tag', t.slot_template ->> 'tag'),
                                                             'q', v_who ->> 'q_en', 'clues', v_who -> 'clues_en')));
        exit;
      end loop;
    end if;
    continue when v_dyn is null;
    v_cards := v_cards || jsonb_build_object('t', v_dyn -> 'template_id', 'f', coalesce(v_dyn ->> 'family', 'd'), 'c', v_dyn -> 'content', 'i', v_dyn -> 'ids',
                                             'e', v_dyn -> 'content_en');   -- i18n
    v_used_t := v_used_t || (v_dyn ->> 'template_id')::uuid;
    v_used_p := v_used_p || array(select jsonb_array_elements_text(v_dyn -> 'ids')::uuid);
  end loop;

  -- then the people you know, the rules, and life on court up to the full set; what you were asked lately waits
  foreach v_step in array array['people', 'rule', 'fill'] loop
    v_got := 0;
    for t in
      select q.* from core.quiz_templates q
       where q.active and q.id <> all (v_used_t)
         and case v_step when 'people' then q.trigger = 'static' and q.family in ('s', 'c')
                         when 'rule' then q.trigger = 'rule'
                         else q.trigger = 'static' and q.family = 'o' end
       order by exists (select 1 from core.quiz_set_cards c join core.quiz_sets s on s.id = c.set_id
                         where s.user_id = p_user and s.quiz_day > p_day - 30 and c.template_id = q.id),
                md5(v_base || v_step || q.id::text)
    loop
      exit when jsonb_array_length(v_cards) >= v_want;
      exit when v_step = 'people' and v_got >= v_people;
      exit when v_step = 'rule' and v_got >= v_rules;
      v_n := coalesce((t.slot_template ->> 'players')::int, 0);
      v_ids := '{}';
      v_players := '[]'::jsonb;
      if v_n > 0 then
        v_ids := array(select x.player_id from core.quiz_pool(p_user, v_sport, t.guardrails ->> 'gender', v_base || t.id::text) x
                        where x.player_id <> all (v_used_p) limit v_n);
        continue when coalesce(array_length(v_ids, 1), 0) < v_n;
        select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                                  order by array_position(v_ids, p.id)), '[]'::jsonb)
          into v_players from core.players p where p.id = any (v_ids);
      end if;
      v_content := jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', t.slot_template ->> 'q',
                                      'options', (select jsonb_agg(jsonb_build_object('label', o)) from jsonb_array_elements_text(t.option_templates) o),
                                      'players', v_players);
      if t.trigger = 'rule' then
        v_content := v_content || jsonb_build_object('right', (t.slot_template ->> 'right')::int, 'reveal', t.slot_template ->> 'reveal');
      end if;
      -- i18n: the template's English words, when it has them
      v_content_en := case when t.text_en ? 'q' then jsonb_strip_nulls(jsonb_build_object(
                        'tag', t.text_en ->> 'tag', 'q', t.text_en ->> 'q',
                        'options', (select jsonb_agg(jsonb_build_object('label', o)) from jsonb_array_elements_text(t.text_en -> 'options') o),
                        'reveal', case when t.trigger = 'rule' then t.text_en ->> 'reveal' end)) end;
      v_cards := v_cards || jsonb_build_object('t', t.id, 'f', t.family, 'c', v_content, 'i', to_jsonb(v_ids), 'e', v_content_en);
      v_used_t := v_used_t || t.id;
      v_used_p := v_used_p || v_ids;
      v_got := v_got + 1;
    end loop;
  end loop;

  -- no fixed order
  insert into core.quiz_set_cards (set_id, position, template_id, family, content, player_ids, content_en)
  select v_set, row_number() over (order by md5(v_base || 'o' || (c ->> 't'))), (c ->> 't')::uuid, c ->> 'f', c -> 'c',
         array(select jsonb_array_elements_text(c -> 'i')::uuid),
         nullif(nullif(c -> 'e', 'null'::jsonb), '{}'::jsonb)   -- i18n
    from jsonb_array_elements(v_cards) c;
  return v_set;
end;
$$;

-- ---------------------------------------------------------------------------
-- api.get_quiz: copied from 20270204000000_security_pass.sql; English cards for an English profile
-- ---------------------------------------------------------------------------
create or replace function api.get_quiz()
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_day  date := core.quiz_day_key(now());
  v_set  uuid;
  s      core.quiz_sets;
  v_en   boolean := core.user_locale(auth.uid()) = 'en';   -- i18n
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  v_set := core.quiz_build_set(v_uid, v_day);
  select * into s from core.quiz_sets where id = v_set;
  return jsonb_build_object(
    'quiz_day', v_day,
    'required', 6,
    'pro', s.pro,
    'awarded', s.awarded_at is not null,
    'next_at', ((v_day + 1)::timestamp + interval '9 hours') at time zone 'Europe/Athens',
    'answered', (select count(*) from core.votes v join core.quiz_set_cards c on c.id = v.subject_id
                  where v.user_id = v_uid and v.subject_type = 'card' and c.set_id = v_set),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'position', c.position, 'family', c.family, 'content', case when v.option is null
                                                                 -- i18n: an English profile reads the English words over the card
                                                                 then (case when v_en and c.content_en is not null then c.content || c.content_en else c.content end) - 'right' - 'reveal'
                                                                 else (case when v_en and c.content_en is not null then c.content || c.content_en else c.content end) end,
               'my_option', v.option,
               'split', case when v.option is not null then core.quiz_split(c.id) end) order by c.position)
        from core.quiz_set_cards c
        left join core.votes v on v.user_id = v_uid and v.subject_type = 'card' and v.subject_id = c.id
       where c.set_id = v_set), '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- api.answer_card: copied from 20270204000000_security_pass.sql; the English reveal for an English profile
-- ---------------------------------------------------------------------------
create or replace function api.answer_card(p_card uuid, p_option int, p_client_event_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_today    date := core.athens_day();
  c          core.quiz_set_cards;
  s          core.quiz_sets;
  v_today_n  int;
  v_answered int;
  v_parts    jsonb;
  v_awarded  int := 0;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into c from core.quiz_set_cards where id = p_card;
  select * into s from core.quiz_sets where id = c.set_id;
  if c.id is null or s.user_id <> v_uid then raise exception 'not_found' using errcode = 'P0002'; end if;
  if s.quiz_day <> core.quiz_day_key(now()) then raise exception 'card_expired' using errcode = '55000'; end if;
  if p_option is null or p_option < 1 or p_option > jsonb_array_length(c.content -> 'options') then
    raise exception 'invalid_option' using errcode = '22023';
  end if;
  if exists (select 1 from core.votes where user_id = v_uid and subject_type = 'card' and subject_id = p_card) then
    raise exception 'already_answered' using errcode = '23505';
  end if;

  insert into core.votes (user_id, subject_type, subject_id, option, client_event_id, day_key)
  values (v_uid, 'card', p_card, p_option::smallint, p_client_event_id, v_today);

  -- a card counts like a vote for the counters (never for σερί or freezes: no record_vote_cast)
  perform core.ensure_game_state(v_uid);
  select count(*) into v_today_n from core.votes where user_id = v_uid and day_key = v_today;
  update core.user_game_state
     set votes_cast = votes_cast + 1,
         active_days = active_days + case when v_today_n = 3 then 1 else 0 end,
         last_active_day = case when v_today_n >= 3 then v_today else last_active_day end,
         version = version + 1, updated_at = now()
   where user_id = v_uid;

  select count(*) into v_answered from core.votes v join core.quiz_set_cards x on x.id = v.subject_id
   where v.user_id = v_uid and v.subject_type = 'card' and x.set_id = s.id;
  v_parts := core.quiz_completion_points(v_answered, 6, s.awarded_at is not null, core.sport_rules(s.sport_id));
  if jsonb_array_length(v_parts) > 0 then
    v_awarded := core.award_points(v_uid, (v_parts -> 0 ->> 'delta')::int, 'daily_quiz', 'quiz_day', s.id,
                                   'quiz:' || v_uid || ':' || s.quiz_day);
    update core.quiz_sets set awarded_at = now() where id = s.id;
  end if;

  return jsonb_build_object('option', p_option, 'right', c.content -> 'right', /* i18n */ 'reveal', case when core.user_locale(v_uid) = 'en' and c.content_en ? 'reveal' then c.content_en -> 'reveal' else c.content -> 'reveal' end, 'split', core.quiz_split(p_card),
                            'answered', v_answered, 'awarded', v_awarded);
end;
$$;

-- ---------------------------------------------------------------------------
-- core.reactions_json: copied from 20261117000000_m2_kudos.sql; the English label for an English profile
-- ---------------------------------------------------------------------------
create or replace function core.reactions_json(p_match uuid, p_uid uuid)
returns jsonb
language sql stable set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'options', (select jsonb_agg(jsonb_build_object('key', rp.key, /* i18n */ 'label', case when core.user_locale(p_uid) = 'en' and nullif(btrim(rp.label_en), '') is not null then rp.label_en else rp.label_el end)
                                 order by array_position(core.reaction_pair(p_match), rp.key))
                  from core.reaction_pool rp where rp.key = any (core.reaction_pair(p_match))),
    'counts', coalesce((select jsonb_object_agg(x.reaction_key, x.n)
                          from (select reaction_key, count(*)::int as n from core.reactions
                                 where match_id = p_match group by reaction_key) x), '{}'::jsonb),
    'mine', (select reaction_key from core.reactions where match_id = p_match and user_id = p_uid))
$$;

-- ---------------------------------------------------------------------------
-- api.kudos_options: copied from 20261117000000_m2_kudos.sql; English lines for an English profile
-- ---------------------------------------------------------------------------
create or replace function api.kudos_options(p_match_id uuid, p_to_player uuid default null)
returns jsonb
language plpgsql volatile security definer set search_path = core, extensions, pg_temp
as $$
declare v_doubles boolean;
        v_en boolean := core.user_locale(auth.uid()) = 'en';   -- i18n
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select format <> 'singles' into v_doubles from core.matches where id = p_match_id;
  if v_doubles is null then raise exception 'match_not_found' using errcode = 'P0002'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('key', o.key, /* i18n */ 'forms', case when v_en and o.forms_en is not null then o.forms_en else o.forms end))
      from (select key, forms, forms_en from core.kudos_options
             where active and key is not null and (not doubles_only or (v_doubles and p_to_player is null))
             order by random() limit 5) o), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- api.get_my_kudos: copied from 20261119000000_m2_report_block.sql; English lines for an English profile
-- ---------------------------------------------------------------------------
create or replace function api.get_my_kudos()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me  uuid;
  v_en  boolean := core.user_locale(v_uid) = 'en';   -- i18n
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select claimed_player_id into v_me from core.profiles where user_id = v_uid;
  if v_me is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('key', x.key, 'forms', case when v_en and x.forms_en is not null then x.forms_en else x.forms end,   -- i18n
                                        'doubles_only', x.doubles_only, 'n', x.n)
                     order by x.n desc, x.sort)
      from (select o.key, o.forms, o.forms_en, o.doubles_only, o.sort, count(*)::int as n
              from core.kudos k join core.kudos_options o on o.id = k.option_id
             where k.to_player_id = v_me and o.key is not null and not core.is_blocked(v_uid, k.from_user_id)
             group by o.key, o.forms, o.forms_en, o.doubles_only, o.sort) x), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- api.get_look: copied from 20270110000000_gear.sql; the English earn rule for an English profile
-- ---------------------------------------------------------------------------
create or replace function api.get_look()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_en  boolean := core.user_locale(auth.uid()) = 'en';   -- i18n
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'key', c.key, 'category', c.category, 'name_el', c.name_el, 'name_en', c.name_en, 'kind', c.kind,
               'price_eur', c.price_eur, 'earn_rule', case when v_en and nullif(btrim(c.earn_rule_text_en), '') is not null then c.earn_rule_text_en else c.earn_rule_text end,   -- i18n
               
               'owned', c.kind = 'free' or uc.item_id is not null, 'source', uc.source,
               'equipped', e.item_id is not null)
             order by case c.category when 'frame' then 1 when 'background' then 2 when 'kit' then 3 when 'gear' then 4 else 5 end,
                      case c.kind when 'free' then 1 when 'earned' then 2 else 3 end, c.price_eur nulls first, c.key)
        from core.cosmetic_items c
        left join core.user_cosmetics uc on uc.user_id = v_uid and uc.item_id = c.id
        left join core.user_equipped e on e.user_id = v_uid and e.item_id = c.id
       where c.active and c.category in ('frame', 'background', 'kit', 'gear', 'win_effect')), '[]'::jsonb),
    'equipped', jsonb_build_object(
      'frame',      (select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id where e.user_id = v_uid and e.category = 'frame'),
      'background', (select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id where e.user_id = v_uid and e.category = 'background'),
      'kit',        coalesce((select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id where e.user_id = v_uid and e.category = 'kit'), 'kit_green'),
      'gear',       (select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id where e.user_id = v_uid and e.category = 'gear'),
      'win_effect', (select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id where e.user_id = v_uid and e.category = 'win_effect')));
end;
$$;

-- ---------------------------------------------------------------------------
-- api.get_feed: copied from 20270313000000_week_window_finished.sql; the sponsored label in English for an English profile
-- ---------------------------------------------------------------------------
create or replace function api.get_feed(p_limit int default 20)
returns jsonb
language plpgsql security definer stable set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_sport   text;
  v_area    text;
  v_areas   text[];
  v_claimed uuid;
  v_level   numeric;
  v_limit   int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_content jsonb;
  v_ads     jsonb;
  v_ad_n    int;
  v_out     jsonb;
  v_offset  int := extract(doy from core.athens_day())::int;
  v_en      boolean := core.user_locale(auth.uid()) = 'en';   -- i18n
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select primary_sport, area_id, claimed_player_id, array_remove(array[area_id] || area_ids, null)
    into v_sport, v_area, v_claimed, v_areas
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  select ps.level_value into v_level from core.player_sports ps where ps.player_id = v_claimed and ps.sport_id = v_sport;

  v_content := coalesce((
    select jsonb_agg(jsonb_build_object('kind', 'result', 'id', i.id, 'created_at', i.created_at, 'payload', i.payload)
                     order by i.created_at)
      from (select * from core.feed_inbox
             where user_id = v_uid and kind = 'result' and seen_at is null
               -- not the ones results_day_end closes (their close day is over), even before it runs
               and core.feed_day(now()) <= core.result_close_day(created_at)
             order by created_at limit v_limit) i), '[]'::jsonb);

  v_content := v_content || coalesce((
    with w as (select * from core.feed_weights()),
    -- where your claimed player plays
    mine as (
      select distinct m2.tournament_id, m2.club_id
        from core.match_participants mp2
        join core.matches m2 on m2.id = mp2.match_id
       where mp2.player_id = v_claimed and m2.status <> 'void'),
    -- your latest votes: what you choose to call
    hist as (
      select m3.id, m3.tournament_id, m3.club_id, e3.name as event
        from core.votes v3
        join core.matches m3 on m3.id = v3.subject_id
        left join core.tournament_events e3 on e3.id = m3.event_id
       where v3.user_id = v_uid and v3.subject_type = 'match'
       order by v3.created_at desc
       limit (select aff_history from w)),
    hist_players as (
      select mp4.player_id, count(*)::int as n
        from hist h join core.match_participants mp4 on mp4.match_id = h.id
       group by mp4.player_id),
    q as (
      select q0.*, row_number() over (partition by q0.today order by q0.closed, q0.voted, q0.not_circle, q0.score desc, q0.starts_at nulls last, q0.id) as rn
        from (
        select m.id, m.starts_at,
               -- the feed's day (from 23:00 Athens it is already tomorrow, as on the app's Σήμερα)
               coalesce((m.starts_at at time zone 'Europe/Athens')::date
                          <= ((now() + interval '1 hour') at time zone 'Europe/Athens')::date, false) as today, (mv.id is not null) as voted, not c.in_circle as not_circle,
               not g.is_open as closed,
               s.total, s.s1, s.s2,
               (  w.area * coalesce(coalesce(m.area_id, cl.area_id, t.area_id) = any (v_areas), false)::int
                + w.level * coalesce(greatest(0, 1 - abs(p.lvl - v_level) / w.level_span), 0)
                + w.my_tournament * (m.tournament_id is not null
                                     and exists (select 1 from mine where mine.tournament_id = m.tournament_id))::int
                + w.my_club * (m.club_id is not null
                               and exists (select 1 from mine where mine.club_id = m.club_id))::int
                + w.hot_volume * least(s.total, w.hot_votes)::numeric / w.hot_votes
                + case when s.total >= w.close_min_votes
                       then w.hot_close * greatest(0, 1 - abs(s.s1 - s.s2)::numeric / s.total / 0.4) else 0 end
                + w.rematch * p.rematch::int
                + w.upset * coalesce(abs(p.lvl1 - p.lvl2) >= w.upset_gap, false)::int
                + w.aff_tournament * least((select count(*) from hist h where h.tournament_id = m.tournament_id), w.aff_cap)
                + w.aff_player * least(p.aff_players, w.aff_cap)
                + w.aff_club * least((select count(*) from hist h where h.club_id = m.club_id), w.aff_cap)
                + w.aff_event * least((select count(*) from hist h where h.event = e.name), w.aff_cap)
                + w.soon * coalesce(greatest(0, least(1, 1 - extract(epoch from (m.starts_at - now())) / 3600 / w.soon_hours)), 0)
               ) as score,
               -- sides and split are added once the cards are picked
               jsonb_build_object(
                 'kind', 'match', 'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
                 -- when voting closes (core.match_lock_at): the start, or for a start with no time that day's lock time
                 'lock_at', g.lock_at,
                 'venue', m.venue, 'round', m.round, 'status', m.status,
                 'level', e.name, 'discipline', m.provenance ->> 'discipline',
                 'tournament', case when t.id is not null then jsonb_build_object('id', t.id, 'name', t.name, 'logo', t.logo_path) end,
                 'in_circle', c.in_circle,
                 'my_vote', mv.option,
                 -- started, no result yet: the card stays, without votes
                 'closed', not g.is_open,
                 'moved_from', case when (m.provenance ->> 'moved_at')::timestamptz > now() - interval '3 days' then m.provenance -> 'moved_from_at' end,
                 'club', cl.name, 'club_logo', cl.logo_path, 'surface', coalesce(cl.surface, t.surface)) as card
          from core.matches m
          -- the two gates, once per match (offset 0 keeps the planner from copying the calls into every use)
          cross join lateral (select core.match_is_open(m) as is_open, core.match_vote_closed(m) as vote_closed,
                                    core.match_lock_at(m) as lock_at offset 0) g
          cross join w
          left join core.votes mv on mv.user_id = v_uid and mv.subject_type = 'match' and mv.subject_id = m.id
          left join core.tournaments t on t.id = m.tournament_id
          left join core.clubs cl on cl.id = m.club_id
          left join core.tournament_events e on e.id = m.event_id
          cross join lateral (
            select exists (select 1 from core.match_participants mp
                             join core.follows f on f.player_id = mp.player_id and f.user_id = v_uid
                            where mp.match_id = m.id) as in_circle) c
          -- the crowd so far
          cross join lateral (
            select count(*)::int as total,
                   count(*) filter (where vv.option = 1)::int as s1,
                   count(*) filter (where vv.option = 2)::int as s2
              from core.votes vv
             where vv.subject_type = 'match' and vv.subject_id = m.id) s
          -- the players: hidden levels per side, how often you voted on them, whether these sides met before
          cross join lateral (
            select avg(ps.level_value) as lvl,
                   avg(ps.level_value) filter (where mp.side = 1) as lvl1,
                   avg(ps.level_value) filter (where mp.side = 2) as lvl2,
                   coalesce(sum(hp.n), 0)::int as aff_players,
                   exists (select 1
                             from core.match_participants a1
                             join core.match_participants a2 on a2.match_id = m.id and a2.side = 2
                             join core.match_participants o1 on o1.player_id = a1.player_id and o1.match_id <> m.id
                             join core.match_participants o2 on o2.match_id = o1.match_id and o2.player_id = a2.player_id
                                                             and o2.side <> o1.side
                             join core.matches pm on pm.id = o1.match_id and pm.status <> 'void'
                            where a1.match_id = m.id and a1.side = 1) as rematch
              from core.match_participants mp
              left join core.player_sports ps on ps.player_id = mp.player_id and ps.sport_id = m.sport_id
              left join hist_players hp on hp.player_id = mp.player_id
             where mp.match_id = m.id) p
         where m.sport_id = v_sport and m.approved
           -- what both gates ask anyway, written so matches_open_idx can narrow the scan
           and m.status in ('announced', 'scheduled') and m.postponed_at is null
           and not exists (select 1 from core.match_results r where r.match_id = m.id)
           and (g.is_open or g.vote_closed)
           -- never a match of a minors' event
           and not coalesce(t.is_minor_event, false)
           -- and never one of a tournament staff marked finished
           and not coalesce(t.finished, false)
           and not exists (select 1 from core.match_participants mp
                             join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and (p.hidden or p.is_minor or mp.player_id = v_claimed))
           -- core.is_blocked, inline
           and not exists (select 1 from core.blocks b where b.user_id = v_uid and b.blocked_user_id = m.logged_by)
        ) q0),
    -- every match of the day comes, whoever plays (founder, 19 Oct: «Όσο κατεβαίνεις, βλέπεις ματς από παίκτες που
    -- ίσως δεν ξέρεις»); the limit only trims the later days, most relevant first, as many as p_limit
    picked as (select * from q where q.today or q.rn <= v_limit),
    sd as (select * from core.match_sides_for(array(select id from picked)))
    select jsonb_agg(
             q.card || jsonb_build_object(
               'sides', coalesce(sd.sides, '[]'::jsonb),
               -- as core.vote_split, from the same counts
               'split', case when q.voted or q.closed then jsonb_build_object(
                          'total', q.total, 'side1', q.s1, 'side2', q.s2,
                          'pct1', case when q.total = 0 then 0 else round(100.0 * q.s1 / q.total)::int end,
                          'pct2', case when q.total = 0 then 0 else 100 - round(100.0 * q.s1 / q.total)::int end) end)
             order by q.closed, q.voted, q.not_circle, q.score desc, q.starts_at nulls last, q.id)
      from picked q
      left join sd on sd.match_id = q.id), '[]'::jsonb);

  v_content := v_content || coalesce((
    with pp as (
      select m.id, m.format, m.starts_at, t.id as t_id, t.name as t_name, t.logo_path as t_logo, mv.option
        from core.matches m
        left join core.tournaments t on t.id = m.tournament_id
        left join core.votes mv on mv.user_id = v_uid and mv.subject_type = 'match' and mv.subject_id = m.id
       where m.sport_id = v_sport and m.postponed_at is not null and m.postponed_at > now() - interval '2 days'
         and m.status in ('announced', 'scheduled')
         and not coalesce(t.is_minor_event, false)
         and not coalesce(t.finished, false)
         and (mv.id is not null or exists (select 1 from core.match_participants mp
                                            join core.follows f on f.player_id = mp.player_id and f.user_id = v_uid
                                           where mp.match_id = m.id))
         and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                          where mp.match_id = m.id and (p.hidden or p.is_minor))),
    sd as (select * from core.match_sides_for(array(select id from pp)))
    select jsonb_agg(jsonb_build_object(
             'kind', 'postponed', 'match_id', pp.id, 'format', pp.format, 'starts_at', pp.starts_at,
             'tournament', case when pp.t_id is not null then jsonb_build_object('id', pp.t_id, 'name', pp.t_name, 'logo', pp.t_logo) end,
             'sides', coalesce(sd.sides, '[]'::jsonb), 'my_vote', pp.option) order by pp.starts_at)
      from pp left join sd on sd.match_id = pp.id), '[]'::jsonb);

  select coalesce(jsonb_agg(jsonb_build_object('kind', 'sponsored', 'id', s.id, 'label', case when v_en then 'Sponsored' else 'Χορηγούμενο' end,   -- i18n
                                               
                                               'sponsor', s.sponsor, 'title', s.title, 'subtitle', s.subtitle,
                                               'cta_url', s.cta_url,
                                               'image_url', s.image_url, 'art', s.art) order by s.weight desc, s.id), '[]'::jsonb)
    into v_ads
    from core.sponsored_cards s
   where s.status = 'active' and s.placement = 'feed'
     and (s.starts_at is null or s.starts_at <= now()) and (s.ends_at is null or s.ends_at > now())
     and (cardinality(s.area_ids) = 0 or v_area = any (s.area_ids));
  v_ad_n := jsonb_array_length(v_ads);

  -- a sponsored card after every 4th item, rotating by the day of the year
  v_out := coalesce((
    select jsonb_agg(x.el order by x.i, x.ad)
      from (
        select e.el, e.i, 0 as ad from jsonb_array_elements(v_content) with ordinality e(el, i)
        union all
        select v_ads -> ((((e.i / 4) - 1 + v_offset) % v_ad_n)::int), e.i, 1
          from jsonb_array_elements(v_content) with ordinality e(el, i)
         where v_ad_n > 0 and e.i % 4 = 0
      ) x), '[]'::jsonb);

  return jsonb_build_object('items', v_out, 'count', jsonb_array_length(v_out),
    -- celebrations wait for the result cards, then play one by one (prototype celOn)
    'celebrations', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'created_at', i.created_at, 'payload', i.payload)
                                               order by i.created_at)
                                from core.feed_inbox i
                               where i.user_id = v_uid and i.kind = 'celebration' and i.seen_at is null), '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- core.upcoming_for: copied from 20270212000000_logos.sql; the area in English for an English profile
-- ---------------------------------------------------------------------------
create or replace function core.upcoming_for(p_user uuid, p_today date default core.athens_day(now()))
returns table (id uuid, ord bigint, area_match boolean, doc jsonb)
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (
    select pr.user_id, pr.primary_sport, pr.area_id, pr.area_ids, pr.gender, pr.claimed_player_id
      from core.profiles pr where pr.user_id = p_user
  ),
  c as (
    select t.*,
           (t.area_id is not null and (t.area_id = me.area_id or t.area_id = any(me.area_ids))) as area_match,
           (t.entry_deadline is not null and t.entry_deadline >= p_today) as open_entry,
           -- fit: a category for the player's gender, or none that names one
           (me.gender is null
            or not exists (select 1 from core.tournament_events e where e.tournament_id = t.id and e.gender is not null)
            or exists (select 1 from core.tournament_events e where e.tournament_id = t.id
                        and (e.gender is null or e.gender = me.gender or e.gender = 'mixed'))) as fits,
           core.played_edition(me.claimed_player_id, t.id) as played,
           me.claimed_player_id
      from core.tournaments t, me
     where t.sport_id = me.primary_sport
       and not t.is_minor_event
       and ((t.starts_on is not null and t.starts_on > p_today) or (t.entry_deadline is not null and t.entry_deadline >= p_today))
  )
  select c.id,
         row_number() over (order by c.area_match desc, c.fits desc, c.open_entry desc, c.entry_deadline nulls last,
                                     c.starts_on nulls last, c.name, c.id) as ord,
         c.area_match,
         jsonb_build_object(
           'id', c.id, 'name', c.name, 'logo', c.logo_path, 'venue', c.venue, 'area_id', c.area_id,
           -- i18n: the area in English for an English profile
           'area', (select case when core.user_locale(p_user) = 'en' and nullif(btrim(a.name_en), '') is not null then a.name_en else a.name_el end
                      from core.areas a where a.id = c.area_id),
           'surface', c.surface, 'starts_on', c.starts_on, 'ends_on', c.ends_on,
           'entry_deadline', c.entry_deadline, 'entry_open', c.open_entry, 'entry_link', c.entry_link,
           'categories', coalesce((select jsonb_agg(x.name order by x.name)
                                     from (select distinct e.name from core.tournament_events e where e.tournament_id = c.id) x), '[]'::jsonb),
           'played_before', c.played,
           'near', c.area_match)
    from c
$$;

-- ---------------------------------------------------------------------------
-- core.my_result_payload: copied from 20270408000000_my_result_moment.sql; the opponent as written for an English profile
-- ---------------------------------------------------------------------------
create or replace function core.my_result_payload(p_match uuid, p_player uuid, p_side smallint)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_m     core.matches;
  v_r     core.match_results;
  v_year  int;
  v_w     int;
  v_l     int;
  v_row   int;
  v_opp   uuid;
  v_hw    int;
  v_hl    int;
  v_score text;
begin
  select * into v_m from core.matches where id = p_match;
  select * into v_r from core.match_results where match_id = p_match;
  v_year := extract(year from coalesce(v_m.starts_at, v_r.entered_at) at time zone 'Europe/Athens');
  with mine as (
    select m.id, m.format, mr.winner_side = mp.side as won, coalesce(m.starts_at, mr.entered_at) as at
      from core.match_participants mp
      join core.matches m on m.id = mp.match_id
      join core.match_results mr on mr.match_id = m.id
     where mp.player_id = p_player and m.approved and m.status <> 'void' and not mr.walkover
  )
  select count(*) filter (where won and extract(year from at at time zone 'Europe/Athens') = v_year)::int,
         count(*) filter (where not won and extract(year from at at time zone 'Europe/Athens') = v_year)::int,
         coalesce((select count(*)::int from mine x
                    where x.at > coalesce((select max(l.at) from mine l where not l.won), '-infinity'::timestamptz)), 0)
    into v_w, v_l, v_row
    from mine;
  if v_m.format = 'singles' then
    select mp.player_id into v_opp from core.match_participants mp where mp.match_id = p_match and mp.side <> p_side limit 1;
    select count(*) filter (where mr.winner_side = a.side)::int, count(*) filter (where mr.winner_side <> a.side)::int
      into v_hw, v_hl
      from core.match_participants a
      join core.match_participants b on b.match_id = a.match_id and b.player_id = v_opp and b.side <> a.side
      join core.matches m on m.id = a.match_id and m.format = 'singles' and m.approved and m.status <> 'void'
      join core.match_results mr on mr.match_id = m.id and not mr.walkover
     where a.player_id = p_player;
  end if;
  select coalesce(string_agg((x ->> 'w') || '-' || (x ->> 'l'), ' ' order by o), nullif(v_r.score_summary, ''))
    into v_score from jsonb_array_elements(v_r.sets) with ordinality y(x, o);
  return jsonb_build_object('type', 'my_result', 'match_id', p_match, 'win', v_r.winner_side = p_side, 'score', v_score,
                            -- i18n: «τον Π. Βλάχο» in Greek, «Π. Βλάχος» as written for an English profile (core.opponents_plain)
                            'opponent', case when core.user_locale((select claimed_by_user_id from core.players where id = p_player)) = 'en'
                                             then core.opponents_plain(p_match, p_side) else core.opponents_acc(p_match, p_side) end,
                            'year_wins', v_w, 'year_losses', v_l,
                            'wins_in_row', case when v_r.winner_side = p_side then v_row else 0 end,
                            'h2h_wins', v_hw, 'h2h_losses', v_hl);
end;
$$;

-- ---------------------------------------------------------------------------
-- api.admin_daily_streak: copied from 20270427000000_daily_streak.sql; writes the English earn rule of Seven and Ten too
-- ---------------------------------------------------------------------------
create or replace function api.admin_daily_streak(p_on boolean default null)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_on   boolean := core.daily_streak_on();
  v_done int;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_on is not null and not core.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;

  if p_on is true and not v_on then
    perform pg_advisory_xact_lock(hashtextextended('daily_streak_switch', 0));
    update core.game_settings set daily_streak = true, daily_streak_at = now(), updated_at = now(), updated_by = auth.uid() where id;
    -- while off, streak and streak_best are the correct calls: they become calls_streak and calls_best
    update core.user_game_state set calls_streak = streak, calls_best = streak_best
     where calls_streak <> streak or calls_best <> streak_best;
    v_done := core.day_streak_backfill_all(now());
    update core.cosmetic_items set active = true where key in ('frame_month', 'frame_hundred');
    update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις με 7 μέρες στη σειρά' where key = 'frame_seven';
    update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις με 10 μέρες στη σειρά' where key = 'frame_ten';
    -- i18n
    update core.cosmetic_items set earn_rule_text_en = 'Earn it with 7 days in a row' where key = 'frame_seven';
    update core.cosmetic_items set earn_rule_text_en = 'Earn it with 10 days in a row' where key = 'frame_ten';
  elsif p_on is false and v_on then
    update core.game_settings set daily_streak = false, updated_at = now(), updated_by = auth.uid() where id;
    update core.user_game_state set streak = calls_streak, streak_best = calls_best, record_run = false,
           version = version + 1, updated_at = now()
     where streak <> calls_streak or streak_best <> calls_best or record_run;
    update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις με 7 σωστές στη σειρά' where key = 'frame_seven';
    update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις με 10 σωστές στη σειρά' where key = 'frame_ten';
    -- i18n
    update core.cosmetic_items set earn_rule_text_en = 'Earn it with 7 correct votes in a row' where key = 'frame_seven';
    update core.cosmetic_items set earn_rule_text_en = 'Earn it with 10 correct votes in a row' where key = 'frame_ten';
  end if;

  return (select jsonb_build_object(
            'on', gs.daily_streak, 'since', gs.daily_streak_at, 'backfilled', v_done,
            'players', (select count(*)::int from core.user_game_state where streak > 0 and gs.daily_streak),
            'best', (select coalesce(max(streak), 0) from core.user_game_state where gs.daily_streak),
            'played_today', (select count(*)::int from core.user_game_state where gs.daily_streak and day_last = core.athens_day()))
            from core.game_settings gs where gs.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- api.admin_save_quiz_template: copied from 20261204000000_m3_admin_game.sql; an edit in Greek drops English that no longer matches
-- ---------------------------------------------------------------------------
create or replace function api.admin_save_quiz_template(p_id uuid, p jsonb)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_family  text := coalesce(p ->> 'family', (select family from core.quiz_templates where id = p_id));
  v_players int := coalesce((p ->> 'players')::int, 0);
  v_opts    jsonb := coalesce(p -> 'options', '[]'::jsonb);
  v_q       text := btrim(coalesce(p ->> 'q', ''));
  v_tag     text := btrim(coalesce(p ->> 'tag', ''));
  v_gender  text := nullif(p ->> 'gender', '');
  v_text    text;
  v_id      uuid := p_id;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_family is null or v_family not in ('s', 'c', 'q', 'o') then raise exception 'bad_family' using errcode = '22023'; end if;
  if v_tag = '' then raise exception 'tag_required' using errcode = '22023'; end if;
  if v_family = 'q' then
    if p_id is null then raise exception 'q_is_built_from_facts' using errcode = '22023'; end if;
    update core.quiz_templates
       set slot_template = slot_template || jsonb_build_object('tag', v_tag), active = coalesce((p ->> 'active')::boolean, active),
           -- i18n: a new Greek tag leaves the old English one behind; English falls back to the Greek
           text_en = case when slot_template ->> 'tag' is distinct from v_tag then nullif(text_en - 'tag', '{}'::jsonb) else text_en end
     where id = p_id;
    return jsonb_build_object('id', p_id);
  end if;
  if v_q = '' then raise exception 'question_required' using errcode = '22023'; end if;
  if jsonb_typeof(v_opts) <> 'array' or jsonb_array_length(v_opts) not between 2 and 4 then
    raise exception 'two_to_four_options' using errcode = '22023';
  end if;
  if v_family = 'o' then v_players := 0; v_gender := null; end if;
  if v_family <> 'o' and (v_players < 1 or v_players > 4 or v_gender is null or v_gender not in ('m', 'f')) then
    raise exception 'players_and_gender_required' using errcode = '22023';
  end if;
  -- every {pN...} must point at one of the players
  v_text := v_q || ' ' || (select string_agg(o, ' ') from jsonb_array_elements_text(v_opts) o);
  if exists (select 1 from regexp_matches(v_text, '\{p(\d)(\.(o|ton|ston|first|o_first))?\}', 'g') m where m[1]::int > v_players)
     or v_text ~ '\{(?!p\d(\.(o|ton|ston|first|o_first))?\})[^}]*\}' then
    raise exception 'bad_slot' using errcode = '22023';
  end if;

  if v_id is null then
    insert into core.quiz_templates (family, trigger, slot_template, option_templates, guardrails, active)
    values (v_family, 'static', jsonb_build_object('tag', v_tag, 'q', v_q, 'players', v_players), v_opts,
            case when v_gender is null then '{}'::jsonb else jsonb_build_object('gender', v_gender) end,
            coalesce((p ->> 'active')::boolean, true))
    returning id into v_id;
  else
    update core.quiz_templates
       set family = v_family, slot_template = jsonb_build_object('tag', v_tag, 'q', v_q, 'players', v_players),
           option_templates = v_opts,
           guardrails = case when v_gender is null then '{}'::jsonb else jsonb_build_object('gender', v_gender) end,
           active = coalesce((p ->> 'active')::boolean, active),
           -- i18n: changed Greek words drop the English ones, which no longer match; English falls back to the Greek
           text_en = case when slot_template ->> 'tag' is distinct from v_tag or slot_template ->> 'q' is distinct from v_q
                               or option_templates is distinct from v_opts then null else text_en end
     where id = v_id and trigger = 'static';
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  end if;
  return jsonb_build_object('id', v_id);
end;
$$;
