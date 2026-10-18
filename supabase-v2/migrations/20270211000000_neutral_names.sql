-- New accounts never show their email (founder, 18 Oct 2026). A sign-up without a name (email OTP) used to get
-- the email's local part as display_name, which others could see. Now it is a neutral «Παίκτης 4821» until the
-- player gives a name; a «name» from the provider that is an email address counts as no name. Accounts that
-- already carry their email (or its local part) as display_name get a neutral name too.

create or replace function core.neutral_display_name()
returns text
language sql volatile set search_path = core, pg_temp
as $$
  select 'Παίκτης ' || (1000 + floor(random() * 9000))::int::text
$$;
revoke all on function core.neutral_display_name() from public;

create or replace function core.handle_new_user()
returns trigger language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_full text := coalesce(nullif(meta ->> 'full_name', ''), nullif(meta ->> 'name', ''));
  v_name text;
begin
  v_name := coalesce(v_full, nullif(trim(coalesce(meta ->> 'first_name', '') || ' ' || coalesce(meta ->> 'surname', '')), ''));
  -- never an email (some providers send the address as the name)
  if v_name is not null and position('@' in v_name) > 0 then v_name := null; end if;

  insert into core.profiles (user_id, first_name, surname, display_name, locale)
  values (
    new.id,
    nullif(meta ->> 'first_name', ''),
    nullif(meta ->> 'surname', ''),
    coalesce(v_name, core.neutral_display_name()),
    case when meta ->> 'locale' = 'en' then 'en' else 'el' end
  )
  on conflict (user_id) do nothing;

  insert into core.user_game_state (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

-- the accounts that show their email today (also callable again by staff tooling and tests); returns how many
create or replace function core.neutralize_email_names()
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  n int;
begin
  update core.profiles pr
     set display_name = core.neutral_display_name()
    from auth.users u
   where u.id = pr.user_id
     and u.email is not null
     and (lower(btrim(pr.display_name)) = lower(split_part(u.email, '@', 1))
          or lower(btrim(pr.display_name)) = lower(u.email));
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function core.neutralize_email_names() from public;

select core.neutralize_email_names();
