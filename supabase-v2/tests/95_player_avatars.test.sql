-- Other players' avatars: null for a roster player without an account or a hidden profile, 'default' for an account
-- that picked none, the key otherwise; the match sides carry it with the gender.
begin;
select plan(6);

select tests.create_user('pa-u@test.local') as u \gset
select tests.mk_player('Άβα', 'Τάρ', 'f') as p \gset
select tests.mk_player('Ρό', 'Στερ', 'f') as r \gset

select is(core.player_ref_json(:'r'::uuid) -> 'avatar', 'null'::jsonb, 'a roster player keeps the initials');
update core.players set claimed_by_user_id = :'u'::uuid where id = :'p'::uuid;
select is(core.player_ref_json(:'p'::uuid) ->> 'avatar', 'default', 'an account that picked none: the default');
update core.profiles set avatar = 'f5' where user_id = :'u'::uuid;
select is(core.player_card_json(:'p'::uuid, :'u'::uuid, 'tennis') ->> 'avatar', 'f5', 'the one they picked');

select tests.mk_match(:'p'::uuid, :'r'::uuid) as m \gset
select is((select pl ->> 'avatar' from jsonb_array_elements(core.match_sides_json(:'m'::uuid)) s, jsonb_array_elements(s -> 'players') pl where pl ->> 'id' = :'p'),
          'f5', 'the match sides carry it');
select is((select pl ->> 'gender' from jsonb_array_elements(core.match_sides_json(:'m'::uuid)) s, jsonb_array_elements(s -> 'players') pl where pl ->> 'id' = :'p'),
          'f', 'and the gender');

update core.profiles set hidden = true where user_id = :'u'::uuid;
select is(core.player_ref_json(:'p'::uuid) -> 'avatar', 'null'::jsonb, 'a hidden profile shows no face');

select * from finish();
rollback;
