-- More cheers (founder, 17 Oct 2026: "more cheers that actually do stuff"). Five win effects next to the confetti,
-- each a moment that plays round your Baller when it jumps on a right call: fireworks, a rain of tennis balls, a
-- trophy raised over its head, flames, the photographers' flashes. Looks only, never an advantage.

insert into core.cosmetic_items (category, key, name_el, name_en, kind, price_eur, earn_rule_text) values
('win_effect', 'fx_fireworks', 'Πυροτεχνήματα',      'Fireworks',  'buy', 1.99, null),
('win_effect', 'fx_balls',     'Βροχή από μπαλάκια', 'Ball rain',  'buy', 0.99, null),
('win_effect', 'fx_trophy',    'Κύπελλο',            'Trophy',     'buy', 1.99, null),
('win_effect', 'fx_fire',      'Φωτιά',              'On fire',    'buy', 1.99, null),
('win_effect', 'fx_flash',     'Φλας',               'Flashes',    'buy', 0.99, null)
on conflict (key) do nothing;
