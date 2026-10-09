-- NetProphet v2 baseline 5/8: RLS on every table, grants, storage policies.
-- Deny by default. Game, commerce and ledger tables have NO insert/update/delete grant or policy
-- for authenticated: they change only through SECURITY DEFINER RPCs or the service role.
-- Aggregates (vote splits, reaction counts) are exposed only through views and RPCs, so who voted is never readable.

-- 1. Enable RLS on every table in core (also tables added later by other migrations: re-run this block there)
do $$
declare t record;
begin
  for t in select c.relname from pg_class c
            where c.relnamespace = 'core'::regnamespace and c.relkind in ('r', 'p') loop
    execute format('alter table core.%I enable row level security', t.relname);
  end loop;
end $$;

-- 2. Start from zero privileges, then grant narrowly.
revoke all on all tables in schema core from anon, authenticated;
revoke all on all sequences in schema core from anon, authenticated;
grant all on all tables in schema core to service_role;
grant usage, select on all sequences in schema core to service_role;
grant execute on function core.is_admin(), core.is_staff(), core.is_service() to authenticated, service_role;

-- 3. Reference data: readable by clients.
grant select on core.sports, core.areas to anon, authenticated;
grant select on core.quest_defs, core.badge_defs, core.unlock_defs, core.cosmetic_items,
                core.kudos_options, core.reaction_pool, core.trait_defs, core.sponsored_cards to authenticated;

create policy sports_read_anon on core.sports for select to anon using (active);
create policy sports_read on core.sports for select to authenticated using (active or core.is_staff());
create policy areas_read on core.areas for select to anon, authenticated using (true);
create policy quest_defs_read on core.quest_defs for select to authenticated using (active or core.is_staff());
create policy badge_defs_read on core.badge_defs for select to authenticated using (true);
create policy unlock_defs_read on core.unlock_defs for select to authenticated using (true);
create policy cosmetic_items_read on core.cosmetic_items for select to authenticated using (active or core.is_staff());
create policy kudos_options_read on core.kudos_options for select to authenticated using (active or core.is_staff());
create policy reaction_pool_read on core.reaction_pool for select to authenticated using (active or core.is_staff());
create policy trait_defs_read on core.trait_defs for select to authenticated
  using (status = 'approved' or created_by = (select auth.uid()) or core.is_staff());
create policy sponsored_cards_read on core.sponsored_cards for select to authenticated
  using ((status = 'active' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
         or core.is_admin());

-- 4. Roster and competition: visible rows only.
grant select on core.players, core.tournaments, core.tournament_events, core.matches,
                core.match_participants, core.match_results to authenticated;
-- level_value, initial_level and upset_index are Pro-only / admin-only: column grant keeps them out of reach
grant select (player_id, sport_id, hand, level_tier, level_direction, level_status, record, form, updated_at)
  on core.player_sports to authenticated;

create policy players_read on core.players for select to authenticated
  using ((not hidden and status = 'active') or claimed_by_user_id = (select auth.uid()) or core.is_staff());
create policy player_sports_read on core.player_sports for select to authenticated
  using (exists (select 1 from core.players p where p.id = player_id));
create policy tournaments_read on core.tournaments for select to authenticated using (true);
create policy tournament_events_read on core.tournament_events for select to authenticated using (true);
create policy matches_read on core.matches for select to authenticated
  using ((approved and status <> 'void') or logged_by = (select auth.uid()) or core.is_staff());
create policy match_participants_read on core.match_participants for select to authenticated
  using (exists (select 1 from core.matches m where m.id = match_id));
create policy match_results_read on core.match_results for select to authenticated
  using (exists (select 1 from core.matches m where m.id = match_id));

-- 5. Admin / editor writes on content tables (the admin app also has the service role; this is defence in depth).
do $$
declare t text;
begin
  foreach t in array array['players', 'player_sports', 'tournaments', 'tournament_events', 'matches',
                           'match_participants', 'match_results'] loop
    execute format('grant insert, update, delete on core.%I to authenticated', t);
    execute format('create policy %I on core.%I for insert to authenticated with check (core.is_staff())', t || '_staff_insert', t);
    execute format('create policy %I on core.%I for update to authenticated using (core.is_staff()) with check (core.is_staff())', t || '_staff_update', t);
    execute format('create policy %I on core.%I for delete to authenticated using (core.is_staff())', t || '_staff_delete', t);
  end loop;
  -- config tables: admin only
  foreach t in array array['sports', 'areas', 'quest_defs', 'badge_defs', 'unlock_defs', 'cosmetic_items',
                           'kudos_options', 'reaction_pool', 'trait_defs', 'sponsored_cards', 'quiz_cards',
                           'quiz_templates', 'level_snapshots'] loop
    execute format('grant insert, update, delete on core.%I to authenticated', t);
    execute format('create policy %I on core.%I for insert to authenticated with check (core.is_admin())', t || '_admin_insert', t);
    execute format('create policy %I on core.%I for update to authenticated using (core.is_admin()) with check (core.is_admin())', t || '_admin_update', t);
    execute format('create policy %I on core.%I for delete to authenticated using (core.is_admin())', t || '_admin_delete', t);
  end loop;
end $$;
-- admin-only reads for tables that clients never read directly (answers, internals)
grant select on core.quiz_cards, core.quiz_templates, core.level_snapshots to authenticated;
create policy quiz_cards_admin_read on core.quiz_cards for select to authenticated using (core.is_admin());
create policy quiz_templates_admin_read on core.quiz_templates for select to authenticated using (core.is_admin());
create policy level_snapshots_admin_read on core.level_snapshots for select to authenticated using (core.is_admin());

-- 6. Own rows only (reads). No write grants: writes happen in RPCs.
do $$
declare r record;
begin
  for r in select * from (values
      ('profiles', 'user_id'), ('follows', 'user_id'), ('votes', 'user_id'), ('points_ledger', 'user_id'),
      ('user_game_state', 'user_id'), ('freezes', 'user_id'), ('streak_events', 'user_id'),
      ('feed_inbox', 'user_id'), ('user_quest_progress', 'user_id'), ('user_badges', 'user_id'),
      ('unlock_progress', 'user_id'), ('user_cosmetics', 'user_id'), ('user_equipped', 'user_id'),
      ('entitlements', 'user_id'), ('notifications', 'user_id'), ('league_members', 'user_id'),
      ('kudos', 'from_user_id'), ('trait_votes', 'voter_user_id'), ('reactions', 'user_id')
    ) as v(tbl, col) loop
    execute format('grant select on core.%I to authenticated', r.tbl);
    execute format('create policy %I on core.%I for select to authenticated using (%I = (select auth.uid()))',
                   r.tbl || '_own_read', r.tbl, r.col);
  end loop;
end $$;

-- staff can read profiles (admin app)
create policy profiles_staff_read on core.profiles for select to authenticated using (core.is_staff());

-- gifts: giver or receiver
grant select on core.gifts to authenticated;
create policy gifts_own_read on core.gifts for select to authenticated
  using (giver_user_id = (select auth.uid()) or receiver_user_id = (select auth.uid()));

-- leagues: only the ones the user belongs to
grant select on core.leagues to authenticated;
create policy leagues_member_read on core.leagues for select to authenticated
  using (exists (select 1 from core.league_members lm where lm.league_id = id and lm.user_id = (select auth.uid())));

-- opponent confirmations: the logger, or the player's own claimed account
grant select on core.match_confirmations to authenticated;
create policy match_confirmations_read on core.match_confirmations for select to authenticated
  using (
    exists (select 1 from core.players p where p.id = player_id and p.claimed_by_user_id = (select auth.uid()))
    or exists (select 1 from core.matches m where m.id = match_id and m.logged_by = (select auth.uid()))
    or core.is_staff()
  );

-- outbox, match_links: service role only (RLS on, no policies, no grants)

-- ---------------------------------------------------------------------------
-- Storage: avatars (folder = user id) and athlete-photos (folder = player id).
-- v1 let ANY authenticated user write and delete; v2 is owner-only.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('athlete-photos', 'athlete-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars public read" on storage.objects for select to anon, authenticated
  using (bucket_id in ('avatars', 'athlete-photos'));

create policy "avatars owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars owner update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- athlete photos: the claimed player's own account, or staff. Folder name is the player id.
create or replace function core.can_write_athlete_photo(p_folder text)
returns boolean language sql stable security definer set search_path = core, pg_temp
as $$
  select core.is_staff() or exists (
    select 1 from core.players p
     where p.id::text = p_folder and p.claimed_by_user_id = auth.uid()
  )
$$;
grant execute on function core.can_write_athlete_photo(text) to authenticated;

create policy "athlete-photos owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'athlete-photos' and core.can_write_athlete_photo((storage.foldername(name))[1]));
create policy "athlete-photos owner update" on storage.objects for update to authenticated
  using (bucket_id = 'athlete-photos' and core.can_write_athlete_photo((storage.foldername(name))[1]))
  with check (bucket_id = 'athlete-photos' and core.can_write_athlete_photo((storage.foldername(name))[1]));
create policy "athlete-photos owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'athlete-photos' and core.can_write_athlete_photo((storage.foldername(name))[1]));

grant usage on sequence core.level_snapshots_id_seq to authenticated;
