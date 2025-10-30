-- Profile claim guardrails: trigger + indexes + backfill

-- 1) Trigger to sync profiles when a player is claimed/unclaimed
create or replace function sync_profile_on_player_claim
()
returns trigger as $$
begin
    -- Player got claimed by a user
    if new.claimed_by_user_id is not null then
    update profiles
    set profile_claim_status = 'claimed',
        claimed_player_id = new.id,
        profile_claim_completed_at = coalesce(profile_claim_completed_at, now()),
        terms_accepted = coalesce(terms_accepted, true),
        terms_accepted_at = coalesce(terms_accepted_at, now()),
        updated_at = now()
    where id = new.claimed_by_user_id;
    else
    -- Player got unclaimed: clear claimed fields on the profile referencing this player
    update profiles
    set claimed_player_id = null,
        profile_claim_status = case when profile_claim_status = 'claimed' then 'skipped' else profile_claim_status end,
        updated_at = now()
    where claimed_player_id = new.id;
end
if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_player_claim_sync
on players;
create trigger trg_player_claim_sync
after
insert or
update of claimed_by_user_id on players
for each row
execute function sync_profile_on_player_claim
();

-- 2) Unique partial index: only one player per user, and one user per player
-- Prevent multiple players being claimed by the same user
create unique index
if not exists ux_players_claimed_by_user
on players
(claimed_by_user_id)
where claimed_by_user_id is not null;

-- Prevent multiple users pointing to the same player in profiles
create unique index
if not exists ux_profiles_claimed_player
on profiles
(claimed_player_id)
where claimed_player_id is not null;

-- 3) Backfill: if a user already has a player claimed, but profile row misses claimed_player_id
update profiles p
set claimed_player_id
= pl.id,
    profile_claim_status = 'claimed',
    profile_claim_completed_at = coalesce
(p.profile_claim_completed_at, now
()),
    terms_accepted = coalesce
(p.terms_accepted, true),
    terms_accepted_at = coalesce
(p.terms_accepted_at, now
()),
    updated_at = now
()
from players pl
where pl.claimed_by_user_id = p.id
  and
(p.claimed_player_id is null or p.profile_claim_status <> 'claimed');

-- 4) Optional: Normalize hidden/active state on claimed players
update players
set is_hidden = false,
    is_active = true,
    updated_at = now()
where claimed_by_user_id is not null
    and (is_hidden = true or is_active = false);


