-- 006_seed_players.sql
-- Seed the players table with mock data for testing

INSERT INTO players (
    id, first_name, last_name, ntrp_rating, wins, losses, last5, current_streak, streak_type, surface_preference, surface_win_rates, aggressiveness, stamina, consistency, age, hand, notes, last_match_date, fatigue_level, injury_status, seasonal_form
) VALUES
    (gen_random_uuid(), 'Γιώργος', 'Παπαδόπουλος', 4.5, 15, 8, ARRAY['W','W','L','W','L'], 2, 'W', 'Hard Court', '{"hardCourt":0.75,"clayCourt":0.45,"grassCourt":0.60,"indoor":0.70}', 7, 8, 6, 28, 'right', 'Strong baseline player', '2024-01-15', 2, 'healthy', 0.68),
    (gen_random_uuid(), 'Μαρία', 'Κωνσταντίνου', 3.5, 12, 10, ARRAY['L','W','W','L','W'], 1, 'W', 'Clay Court', '{"hardCourt":0.40,"clayCourt":0.80,"grassCourt":0.35,"indoor":0.45}', 5, 7, 8, 25, 'right', 'Consistent player', '2024-01-12', 4, 'healthy', 0.55),
    (gen_random_uuid(), 'Νίκος', 'Αλεξίου', 5.0, 20, 5, ARRAY['W','W','W','W','W'], 5, 'W', 'Grass Court', '{"hardCourt":0.85,"clayCourt":0.70,"grassCourt":0.90,"indoor":0.80}', 9, 9, 7, 30, 'left', 'Top player', '2024-01-14', 1, 'healthy', 0.82),
    (gen_random_uuid(), 'Ελένη', 'Δημητρίου', 4.0, 8, 12, ARRAY['L','L','W','L','L'], 1, 'L', 'Hard Court', '{"hardCourt":0.55,"clayCourt":0.30,"grassCourt":0.40,"indoor":0.50}', 6, 5, 7, 22, 'right', 'Developing player', '2024-01-10', 6, 'minor', 0.40); 