-- NetProphet v2 baseline 8/8: reference data every environment needs (sports, areas, defs, pools).
-- Dev-only data (players, tournaments, matches, test users) lives in supabase-v2/seed.sql.

-- Sports. Tennis is live; the rest are placeholders proving the model is sport-generic (inactive).
-- config.rules holds the game numbers from product-spec section 3; core.sport_rules() reads them.
insert into core.sports (id, name_el, name_en, config, active, sort) values
('tennis', 'Τένις', 'Tennis', $cfg$
{
  "formats": {"singles": {"side_size": 1}, "doubles": {"side_size": 2}, "mixed": {"side_size": 2}},
  "score_model": "sets",
  "best_of_sets": 3,
  "set_games": 6,
  "super_tiebreak_final_set": true,
  "mixed_rules": {"singles_same_gender": true, "mixed_only_doubles": true},
  "rules": {
    "correct": 10, "upset": 30, "chain": 5, "daily_quiz": 30,
    "freeze_max": 2, "free_freeze_every_votes": 15, "first_free_freeze_at_streak": 3,
    "upset_share_max": 0.35, "upset_min_votes": 10,
    "streak_milestones": [3, 5, 7, 10]
  }
}$cfg$::jsonb, true, 1),
('padel', 'Πάντελ', 'Padel', $cfg$
{
  "formats": {"doubles": {"side_size": 2}, "mixed": {"side_size": 2}},
  "score_model": "sets", "best_of_sets": 3, "set_games": 6,
  "mixed_rules": {"mixed_only_doubles": true},
  "rules": {}
}$cfg$::jsonb, false, 2),
('basketball', 'Μπάσκετ', 'Basketball', $cfg$
{"formats": {"singles": {"side_size": 1}}, "score_model": "points", "periods": 4, "rules": {}}$cfg$::jsonb, false, 3),
('football', 'Ποδόσφαιρο', 'Football', $cfg$
{"formats": {"singles": {"side_size": 1}}, "score_model": "points", "periods": 2, "rules": {}}$cfg$::jsonb, false, 4)
on conflict (id) do nothing;

insert into core.areas (id, region, name_el, name_en, sort) values
('kifisia',        'north',  'Κηφισιά',        'Kifisia', 1),
('marousi',        'north',  'Μαρούσι',        'Marousi', 2),
('halandri',       'north',  'Χαλάνδρι',       'Halandri', 3),
('athens',         'center', 'Αθήνα',          'Athens', 4),
('pagrati',        'center', 'Παγκράτι',       'Pagrati', 5),
('psychiko',       'center', 'Ψυχικό',         'Psychiko', 6),
('glyfada',        'south',  'Γλυφάδα',        'Glyfada', 7),
('voula',          'south',  'Βούλα',          'Voula', 8),
('palaio_faliro',  'south',  'Παλαιό Φάληρο',  'Palaio Faliro', 9)
on conflict (id) do nothing;

-- Quests (daily 3, weekly 2, plus the friend-invite quest). Rewards are cosmetic or badge bonuses only.
insert into core.quest_defs (key, period, target, counter, reward, title_el, title_en, sort) values
('daily_vote_3_cards',   'daily',  3, 'votes',          '{"badge_bonus": 1}', 'Ψήφισε 3 κάρτες',               'Vote on 3 cards', 1),
('daily_give_kudos',     'daily',  1, 'kudos_given',    '{"badge_bonus": 1}', 'Δώσε ένα μπράβο',               'Give a kudos', 2),
('daily_vote_2_matches', 'daily',  2, 'match_votes',    '{"badge_bonus": 1}', 'Ψήφισε σε 2 ματς',              'Vote on 2 matches', 3),
('weekly_play_2',        'weekly', 2, 'matches_played', '{"cosmetic": "frame_seven"}', 'Πέρνα 2 αγώνες σου',   'Play 2 of your own matches', 4),
('weekly_vote_5_days',   'weekly', 5, 'active_days',    '{"badge_bonus": 1}', 'Ψήφισε 5 μέρες την εβδομάδα',   'Vote on 5 days this week', 5),
('once_invite_friend',   'once',   1, 'friends_joined', '{"cosmetic": "frame_founding"}', 'Κάλεσε έναν φίλο',  'Invite a friend', 6)
on conflict (key) do nothing;

-- Badges: 16, three tiers each; the third tier grants a frame.
insert into core.badge_defs (key, name_el, name_en, counter, thresholds, tier3_reward, sort) values
('first_serve',    'Πρώτο σερβίς',            'First serve',          'matches_logged',    '{1,5,25}',    '{"cosmetic":"frame_level"}', 1),
('nice_player',    'Ωραίος ο παίχτης',        'Good sport',           'confirmations',     '{1,5,20}',    '{"cosmetic":"frame_level"}', 2),
('gentleman',      'Ο ευγενικός',             'The gentleman',        'kudos_given',       '{3,15,50}',   '{"cosmetic":"frame_level"}', 3),
('beloved',        'Αγαπητός',                'Beloved',              'kudos_received',    '{3,15,50}',   '{"cosmetic":"frame_level"}', 4),
('club_oracle',    'Μάντης του κλαμπ',        'Club oracle',          'votes_correct',     '{5,25,100}',  '{"cosmetic":"frame_level"}', 5),
('upset',          'Ανατροπή',                'Upset',                'upset_calls',       '{1,5,15}',    '{"cosmetic":"frame_level"}', 6),
('in_a_row',       'Στη σειρά',               'In a row',             'streak_best',       '{5,7,10}',    '{"cosmetic":"frame_level"}', 7),
('influencer',     'Ινφλουένσερ',             'Influencer',           'friends_joined',    '{1,3,10}',    '{"cosmetic":"frame_level"}', 8),
('whole_week',     'Όλη η βδομάδα',           'The whole week',       'full_weeks',        '{1,4,12}',    '{"cosmetic":"frame_level"}', 9),
('doubles_player', 'Ο διπλίστας',             'Doubles player',       'doubles_logged',    '{1,5,15}',    '{"cosmetic":"frame_level"}', 10),
('variety',        'Έχει ποικιλία',           'Variety',              'opponents',         '{5,15,40}',   '{"cosmetic":"frame_level"}', 11),
('steady',         'Σταθερός',                'Steady',               'active_weeks',      '{4,12,26}',   '{"cosmetic":"frame_level"}', 12),
('many_votes',     'Πολλά τα ψηφαλάκια',      'Lots of votes',        'votes_cast',        '{25,100,500}','{"cosmetic":"frame_level"}', 13),
('generous',       'Χουβαρντάς',              'Generous',             'treats',            '{1,5,15}',    '{"cosmetic":"frame_level"}', 14),
('season_veteran', 'Βετεράνος σεζόν',         'Season veteran',       'seasons',           '{1,2,4}',     '{"cosmetic":"frame_level"}', 15),
('month_top',      'Κορυφαίος του μήνα',      'Top of the month',     'months_top3',       '{1,3,10}',    '{"cosmetic":"frame_month_top"}', 16)
on conflict (key) do nothing;

-- The 13-step unlock ladder. Each step has an action-based primary rule and a backup trigger counted in votes.
-- Counters are approximations from the prototype and are tunable here, in data, without a deploy.
insert into core.unlock_defs (key, step, primary_rule, backup_votes, title_el, title_en) values
('day1_basics',   1,  '{"always": true}',                                   0,  'Ψήφισε',                   'Vote'),
('level_bar',     2,  '{"correct_votes": 3, "app_opens": 2}',               6,  'Το level σου',             'Your level'),
('first_freeze',  3,  '{"streak": 3}',                                      8,  'Πρώτο πάγωμα',            'First freeze'),
('quests',        4,  '{"votes": 10, "active_days": 2}',                    10, 'Αποστολές',                'Quests'),
('bridge_line',   5,  '{"first_result_after_day": 2}',                      12, 'Έπαιξες κι εσύ σήμερα;',   'Did you play today?'),
('ladder',        6,  '{"votes": 20, "active_days": 3}',                    20, 'Κατάταξη',                 'Ladder'),
('kudos',         7,  '{"matches_confirmed": 1}',                           15, 'Μπράβο και αντιδράσεις',   'Kudos and reactions'),
('me_avatar',     8,  '{"full_quest_days": 3}',                             25, 'Εγώ',                      'Me'),
('badges',        9,  '{"correct_votes": 10}',                              12, 'Badges',                   'Badges'),
('pro_first',     10, '{"streak": 5}',                                      30, 'Pro',                      'Pro'),
('weekly_quests', 11, '{"active_days": 6}',                                 35, 'Αποστολές της εβδομάδας',  'Weekly quests'),
('gifts',         12, '{"kudos_given": 3}',                                 40, 'Κεράσματα',                'Gifts'),
('stats_attica',  13, '{"votes": 45}',                                      45, 'Στατιστικά και Αττική',    'Stats and Attica')
on conflict (key) do nothing;

insert into core.reaction_pool (key, label_el, label_en) values
('what_a_match',  'Τι ματς!',            'What a match'),
('deserved',      'Δίκαιο',              'Deserved'),
('close_one',     'Στο νήμα',            'Close one'),
('big_upset',     'Δεν το περίμενα',     'Did not see it coming'),
('clean_win',     'Καθαρή νίκη',         'Clean win'),
('comeback',      'Επική ανατροπή',      'Epic comeback')
on conflict (key) do nothing;

insert into core.kudos_options (forms) values
('{"m": "Μπράβο, καλό ματς!", "f": "Μπράβο, καλό ματς!", "plural": "Μπράβο, καλό ματς!"}'),
('{"m": "Ωραίο παιχνίδι, σε ευχαριστώ", "f": "Ωραίο παιχνίδι, σε ευχαριστώ", "plural": "Ωραίο παιχνίδι, σας ευχαριστώ"}'),
('{"m": "Πολύ δυνατός σήμερα", "f": "Πολύ δυνατή σήμερα", "plural": "Πολύ δυνατοί σήμερα"}'),
('{"m": "Θέλω ρεβάνς", "f": "Θέλω ρεβάνς", "plural": "Θέλω ρεβάνς"}'),
('{"m": "Τέλειο σερβίς", "f": "Τέλειο σερβίς", "plural": "Τέλειο σερβίς"}');

insert into core.cosmetic_items (category, key, name_el, name_en, kind, price_eur, earn_rule_text) values
('kit',        'kit_green',        'Πράσινο',            'Green',            'free',   null, null),
('kit',        'kit_white',        'Λευκό',              'White',            'free',   null, null),
('kit',        'kit_black',        'Μαύρο',              'Black',            'free',   null, null),
('frame',      'frame_seven',      'Επτά',               'Seven',            'earned', null, 'Το κερδίζεις με σερί 7'),
('frame',      'frame_ten',        'Δέκα',               'Ten',              'earned', null, 'Το κερδίζεις με σερί 10'),
('frame',      'frame_level',      'Level',              'Level',            'earned', null, 'Το κερδίζεις με την τρίτη βαθμίδα ενός badge'),
('frame',      'frame_month_top',  'Κορυφαίος του μήνα', 'Top of the month', 'earned', null, 'Το κερδίζεις στην πρώτη τριάδα του μήνα'),
('frame',      'frame_founding',   'Πρώτη γενιά',        'Founding',         'earned', null, 'Για όσους ήταν από την αρχή'),
('frame',      'frame_gold',       'Χρυσή κορνίζα',      'Gold frame',       'buy',    1.99, null),
('background', 'bg_court',         'Γήπεδο',             'Court',            'buy',    0.99, null),
('win_effect', 'fx_confetti',      'Κομφετί',            'Confetti',         'buy',    1.99, null)
on conflict (key) do nothing;
