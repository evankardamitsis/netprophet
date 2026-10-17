-- Other players' Ballers for the podium: style, name, kit and gear; hidden profiles left out.
begin;
select plan(5);

select tests.create_user('bl-a@test.local') as a \gset
select tests.create_user('bl-b@test.local') as b \gset
select tests.create_user('bl-c@test.local') as c \gset
update core.profiles set avatar = 'f2', baller_name = 'Σλάισα', gender = 'f' where user_id = :'b'::uuid;
update core.profiles set hidden = true where user_id = :'c'::uuid;
insert into core.user_equipped (user_id, category, item_id)
select :'b'::uuid, 'gear', id from core.cosmetic_items where key = 'gear_cap';

select tests.login(:'a'::uuid);
select is(jsonb_array_length(api.get_ballers(array[:'a', :'b', :'c']::uuid[])), 2, 'hidden profiles are left out');
select is((select e ->> 'name' from jsonb_array_elements(api.get_ballers(array[:'b']::uuid[])) e), 'Σλάισα', 'the name they gave it');
select is((select e ->> 'avatar' from jsonb_array_elements(api.get_ballers(array[:'b']::uuid[])) e), 'f2', 'the style they picked');
select is((select e ->> 'gear' from jsonb_array_elements(api.get_ballers(array[:'b']::uuid[])) e), 'gear_cap', 'what they wear');
select is((select e ->> 'avatar' from jsonb_array_elements(api.get_ballers(array[:'a']::uuid[])) e), 'default', 'no pick is the default');

select * from finish();
rollback;
