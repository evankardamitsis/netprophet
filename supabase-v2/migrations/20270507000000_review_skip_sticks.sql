-- A skipped review card stays skipped (founder, 19 Nov 2026: "why the ones that i skip keep appearing"). The runs open
-- a card only when no OPEN card has the row's fingerprint, so a dismissed card came back on the next read (three a
-- day, every «Update now», every saved decision). Now a card is not opened again for a row staff skipped: same
-- tournament, same kind, same fingerprint. A row the organiser changes has a new fingerprint (date, category, names)
-- and gets a new card.
create or replace function core.ingest_reviews_skip_dismissed()
returns trigger
language plpgsql set search_path = core, pg_temp
as $$
begin
  if exists (select 1 from core.ingest_reviews r
              where r.tournament_id = new.tournament_id and r.kind = new.kind and r.fingerprint = new.fingerprint
                and r.status = 'dismissed') then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists ingest_reviews_skip_dismissed on core.ingest_reviews;
create trigger ingest_reviews_skip_dismissed
  before insert on core.ingest_reviews
  for each row execute function core.ingest_reviews_skip_dismissed();
