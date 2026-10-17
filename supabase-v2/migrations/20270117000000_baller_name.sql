-- Your Baller has a name (founder, 17 Oct 2026: "people can name their own baller"). Given at the end of «Γνώρισε τον
-- Baller σου», changeable on the profile. 2 to 16 letters, Greek or Latin, single spaces between words; checked
-- against a list of rude words before it is saved, in any spelling (core.normalize_search folds Greek, Greeklish,
-- case and accents to one key). Staff see the names given and can reset one.

alter table core.profiles
  add column baller_name text,
  add column baller_named_at timestamptz,
  add constraint profiles_baller_name_shape check (
    baller_name is null
    or (char_length(baller_name) between 2 and 16
        and baller_name ~ '^[A-Za-zΑ-Ωα-ωΆΈΉΊΌΎΏάέήίόύώϊϋΐΰς]+( [A-Za-zΑ-Ωα-ωΆΈΉΊΌΎΏάέήίόύώϊϋΐΰς]+)*$'));

-- the words a name may not contain, kept as search keys so every spelling matches
create table core.blocked_words (
  word text primary key,
  key  text not null
);
alter table core.blocked_words enable row level security;

insert into core.blocked_words (word, key)
select w, core.normalize_search(w)
  from unnest(array[
    'μαλάκας', 'μαλακία', 'πουτάνα', 'πούστης', 'γαμώ', 'γαμιέσαι', 'γαμημένος', 'αρχίδι', 'καριόλης', 'σκατά',
    'ψωλή', 'κουράδα', 'πούτσα', 'τσούλα', 'κωλόπαιδο',
    'fuck', 'shit', 'bitch', 'nigger', 'nigga', 'faggot', 'whore', 'slut', 'nazi', 'hitler', 'porn', 'pussy',
    'penis', 'asshole', 'bastard'
  ]) w
on conflict (word) do nothing;

/** true when no word of the name contains a blocked word */
create or replace function core.baller_name_ok(p_name text)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select not exists (
    select 1 from core.blocked_words b
     where position(b.key in replace(core.normalize_search(p_name), ' ', '')) > 0
  )
$$;

/** the name as the player meant it: trimmed, one space between words */
create or replace function core.clean_baller_name(p_name text)
returns text
language sql immutable set search_path = pg_temp
as $$ select nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '') $$;

create or replace function api.set_baller_name(p_name text)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text := core.clean_baller_name(p_name);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_name is not null then
    if char_length(v_name) < 2 or char_length(v_name) > 16
       or v_name !~ '^[A-Za-zΑ-Ωα-ωΆΈΉΊΌΎΏάέήίόύώϊϋΐΰς]+( [A-Za-zΑ-Ωα-ωΆΈΉΊΌΎΏάέήίόύώϊϋΐΰς]+)*$' then
      raise exception 'bad_name' using errcode = '22023';
    end if;
    if not core.baller_name_ok(v_name) then
      raise exception 'name_not_allowed' using errcode = '22023';
    end if;
  end if;
  update core.profiles set baller_name = v_name, baller_named_at = case when v_name is null then null else now() end
   where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  return jsonb_build_object('name', v_name);
end;
$$;

create or replace function api.get_baller()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return (select jsonb_build_object('name', p.baller_name, 'avatar', p.avatar, 'met', p.baller_named_at is not null)
            from core.profiles p where p.user_id = v_uid and p.deleted_at is null);
end;
$$;

-- staff: the names given lately, newest first, and a reset
create or replace function api.admin_baller_names(p_limit int default 100)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not (core.is_service() or core.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'person', p.display_name, 'name', p.baller_name, 'at', p.baller_named_at)
                     order by p.baller_named_at desc)
      from (select * from core.profiles
             where baller_name is not null and deleted_at is null
             order by baller_named_at desc nulls last
             limit least(greatest(coalesce(p_limit, 100), 1), 500)) p), '[]'::jsonb);
end;
$$;

create or replace function api.admin_reset_baller_name(p_user uuid)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if not (core.is_service() or core.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  update core.profiles set baller_name = null, baller_named_at = null where user_id = p_user;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  return jsonb_build_object('user_id', p_user, 'name', null);
end;
$$;

revoke all on function core.baller_name_ok(text) from public;
revoke all on function api.set_baller_name(text), api.get_baller(), api.admin_baller_names(int), api.admin_reset_baller_name(uuid) from public, anon;
grant execute on function api.set_baller_name(text), api.get_baller() to authenticated, service_role;
grant execute on function api.admin_baller_names(int), api.admin_reset_baller_name(uuid) to authenticated, service_role;
