-- NetProphet v2 baseline 1/8: schemas, extensions, pure helpers.
-- Layout: base tables live in `core` (never exposed). Clients see only `api`
-- (views + SECURITY DEFINER RPCs). Every period key is computed in Europe/Athens.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists core;
create schema if not exists api;

revoke all on schema core from public;
revoke all on schema api from public;
grant usage on schema extensions to anon, authenticated, service_role;
grant usage on schema core to anon, authenticated, service_role;   -- anon: reference views only (no table privileges)
grant usage on schema api to anon, authenticated, service_role;

comment on schema core is 'Base tables and internal functions. Not exposed by PostgREST.';
comment on schema api is 'The only schema exposed to clients: security_invoker views and SECURITY DEFINER RPCs.';

-- ---------------------------------------------------------------------------
-- Greek + Greeklish search normalisation (ported and extended from v1
-- normalize_for_search). Pure and IMMUTABLE so it can back generated columns.
-- Greek and Greeklish spellings of the same name fold to the same key:
--   Παπαδόπουλος = Papadopoulos = PAPADOPOULOS -> papadopulos
--   Χρήστος = Christos -> hristos ; Αλέξανδρος = Alexandros -> aleksandros
-- No dependency on the unaccent extension (it is not IMMUTABLE).
-- ---------------------------------------------------------------------------
create or replace function core.normalize_search(t text)
returns text
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  s text := coalesce(t, '');
begin
  -- case + accents (explicit, so it works in any DB locale)
  s := lower(s);
  s := translate(s,
    'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΆΈΉΊΌΎΏΪΫάέήίόύώϊϋΐΰςàáâäãåçèéêëìíîïñòóôöõùúûüýÿ',
    'αβγδεζηθικλμνξοπρστυφχψωαεηιουωιυαεηιουωιυιυσaaaaaaceeeeiiiinooooouuuuyy');
  -- Greek digraphs first (they change sound)
  s := replace(s, 'ου', 'u');
  s := replace(s, 'αυ', 'av');
  s := replace(s, 'ευ', 'ev');
  s := replace(s, 'μπ', 'b');
  s := replace(s, 'ντ', 'd');
  s := replace(s, 'γκ', 'g');
  s := replace(s, 'γγ', 'g');
  -- Greek letters to Latin (th -> 8, ps -> q, ks -> x placeholders)
  s := translate(s, 'αβγδεζηθικλμνξοπρστυφχψω', 'avgdezi8iklmnxoprstyfhqo');
  -- Latin / Greeklish folding
  s := replace(s, 'ch', 'h');
  s := replace(s, 'ph', 'f');
  s := replace(s, 'dh', 'd');
  s := replace(s, 'ou', 'u');
  s := replace(s, 'ai', 'e');
  s := replace(s, 'ei', 'i');
  s := replace(s, 'oi', 'i');
  s := replace(s, 'yi', 'i');
  s := replace(s, 'mp', 'b');
  s := replace(s, 'nt', 'd');
  s := replace(s, 'gk', 'g');
  s := replace(s, 'gg', 'g');
  s := replace(s, 'x', 'ks');
  s := replace(s, 'q', 'ps');
  s := replace(s, '8', 'th');
  s := replace(s, 'c', 'k');
  s := replace(s, 'y', 'i');
  s := replace(s, 'w', 'o');
  -- collapse doubled letters (Giannis = Gianis), strip punctuation
  s := regexp_replace(s, '(.)\1+', '\1', 'g');
  s := regexp_replace(s, '[^a-z0-9 ]+', ' ', 'g');
  s := regexp_replace(s, '\s+', ' ', 'g');
  return btrim(s);
end;
$$;
comment on function core.normalize_search(text) is
  'Greek/Greeklish/accent/case-insensitive search key. Ported from v1 normalize_for_search, extended with Greeklish folding.';

-- Europe/Athens period keys
create or replace function core.athens_day(ts timestamptz default now())
returns date language sql immutable parallel safe set search_path = ''
as $$ select (ts at time zone 'Europe/Athens')::date $$;

create or replace function core.month_key(ts timestamptz default now())
returns text language sql immutable parallel safe set search_path = ''
as $$ select to_char(ts at time zone 'Europe/Athens', 'YYYY-MM') $$;

create or replace function core.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
