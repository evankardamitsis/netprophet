-- A push when someone reacts to your match (founder, 20 Oct 2026: "when a user reacts to a match, the players in the
-- match, if they are in NetProphet, should get a notification").
--
-- Who hears: every player of the match with an account (core.players.claimed_by_user_id), not the reactor, not a
-- hidden player, not a minor, not a deleted account, nobody who blocked the reactor or was blocked by them, and not
-- someone who switched «Αντιδράσεις» off (profiles.notification_prefs ->> 'reactions' = false; on by default).
--
-- No spam: at most one push per person per match every 3 hours. The first reaction goes out at once (the outbox runs
-- every minute). A reaction while that push still waits, or within 3 hours after it went, joins the next one: that
-- push waits until 3 hours after the last and says «3 άτομα αντέδρασαν». Only a brand new reaction counts: switching
-- Μπράβο to Ρεβάνς adds nothing, and the same person never counts twice for one match. Who reacted is kept on the
-- outbox job (server only), never in the notification the player can read.
--
-- The texts live in core.notification_texts (reaction_one, reaction_many) so the founder edits and approves them in
-- admin /v2/notifications. As with every text there, approval is a review mark, not a send gate. The push data
-- carries match_id and tournament_id with type 'reaction'; the app opens Αποτελέσματα on that tournament.

insert into core.notification_texts (key, label_el, title, body, placeholders, pro, sort) values
  ('reaction_one', 'Κάποιος αντέδρασε σε ματς σου ({name}: το μικρό του όνομα, {reaction}: η αντίδραση, {opponent}: «τον Π. Βλάχο»). Αν λείπει το τουρνουά, φεύγει με το « · »',
   '{name}: «{reaction}»', 'Στο ματς σου με {opponent} · {tournament}', '{name,reaction,opponent,tournament}', false, 120),
  ('reaction_many', 'Πολλοί αντέδρασαν σε ματς σου, μαζεμένοι σε μία ειδοποίηση το πολύ ανά 3 ώρες ({n}: πόσοι). Αν λείπει το τουρνουά, φεύγει με το « · »',
   '{n} άτομα αντέδρασαν', 'Στο ματς σου με {opponent} · {tournament}', '{n,opponent,tournament}', false, 130)
on conflict (key) do nothing;

-- a name's grammatical gender when the roster does not say (packages/copy nameGender): -ς is masculine, -α -η -ω -ου
-- feminine, anything else masculine
create or replace function core.name_gender(p_first text, p_known text default null)
returns text
language sql immutable set search_path = pg_temp
as $$
  select case
    when p_known in ('m', 'f') then p_known
    when lower(btrim(coalesce(p_first, ''))) ~ '[ςσ]$' then 'm'
    when lower(btrim(coalesce(p_first, ''))) ~ '(α|ά|η|ή|ω|ώ|ου|ού)$' then 'f'
    else 'm' end
$$;

-- one word in the accusative (packages/copy accusativeWord): masculine words drop a final -ς after a vowel
-- (Βλάχος → Βλάχο, ΠΑΠΠΑΣ → ΠΑΠΠΑ); feminine and non-Greek words stay
create or replace function core.accusative_word(p_word text, p_gender text)
returns text
language sql immutable set search_path = pg_temp
as $$
  select case when p_gender = 'f' then p_word
              else regexp_replace(p_word, '([αεηιουωάέήίόύώϊϋΐΰΑΕΗΙΟΥΩΆΈΉΊΌΎΏΪΫ])[ςσΣ]$', '\1') end
$$;

-- the other side of a match as the object of «με»: «τον Π. Βλάχο», «την Μ. Καρρά», «τους Π. Βλάχο και Ν. Παππά».
-- Hidden players and minors are never named; null when nobody is left (then the piece drops out of the text).
create or replace function core.opponents_acc(p_match uuid, p_side smallint)
returns text
language sql stable security definer set search_path = core, pg_temp
as $$
  select case when bool_and(x.g = 'f') then case when count(*) > 1 then 'τις ' else 'την ' end
              else case when count(*) > 1 then 'τους ' else 'τον ' end end
         || string_agg(x.name, ' και ' order by x.position)
    from (select mp.position, core.name_gender(p.first_name, p.gender) as g,
                 concat_ws(' ', nullif(upper(left(btrim(p.first_name), 1)), '') || '.',
                           (select string_agg(core.accusative_word(w, core.name_gender(p.first_name, p.gender)), ' ' order by o)
                              from regexp_split_to_table(btrim(p.surname), '\s+') with ordinality s(w, o))) as name
            from core.match_participants mp join core.players p on p.id = mp.player_id
           where mp.match_id = p_match and mp.side <> p_side and not p.hidden and not p.is_minor) x
  having count(*) > 0
$$;

-- tell the players of p_match that p_reactor reacted; returns how many pushes were queued or updated
create or replace function core.reaction_notify(p_match uuid, p_reactor uuid, p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  m          core.matches;
  v_tour     text;
  r          record;
  n          core.notifications;
  o          core.outbox;
  v_at       timestamptz;
  v_key      text;
  v_reactors jsonb;
  v_count    int;
  v_name     text;
  v_label    text;
  v_txt      record;
  v_msg      jsonb;
  v_n        int := 0;
begin
  select * into m from core.matches where id = p_match;
  if m.id is null or p_reactor is null then return 0; end if;
  select name into v_tour from core.tournaments where id = m.tournament_id;

  for r in
    select distinct on (p.claimed_by_user_id) p.claimed_by_user_id as user_id, mp.side
      from core.match_participants mp
      join core.players p on p.id = mp.player_id
      join core.profiles pr on pr.user_id = p.claimed_by_user_id
     where mp.match_id = p_match
       and p.claimed_by_user_id is not null and p.claimed_by_user_id <> p_reactor
       and not p.hidden and not p.is_minor
       and pr.deleted_at is null
       and coalesce(pr.notification_prefs ->> 'reactions', 'true') <> 'false'
       and not core.is_blocked(p.claimed_by_user_id, p_reactor)
       and not core.is_blocked(p_reactor, p.claimed_by_user_id)
  loop
    -- the same person counts once per match, whatever they do later
    -- (through the person's notifications, which are indexed by user, then the job by its unique key)
    continue when exists (select 1 from core.notifications x
                            join core.outbox ob on ob.idempotency_key = 'push:' || x.dedupe_key
                           where x.user_id = r.user_id and x.type = 'reaction'
                             and x.dedupe_key like 'reaction:' || r.user_id || ':' || p_match || ':%'
                             and ob.payload -> 'reactors' ? p_reactor::text);

    select * into n from core.notifications
     where user_id = r.user_id and type = 'reaction' and dedupe_key like 'reaction:' || r.user_id || ':' || p_match || ':%'
     order by scheduled_at desc limit 1;
    o := null;
    if n.id is not null and n.sent_at is null then
      select * into o from core.outbox where idempotency_key = 'push:' || n.dedupe_key and done_at is null for update;
    end if;

    if o.id is not null then
      -- a push still waits: it now speaks for one more person
      v_reactors := coalesce(o.payload -> 'reactors', '[]'::jsonb) || to_jsonb(p_reactor::text);
      v_key := n.dedupe_key;
    else
      v_at := case when n.id is null or n.scheduled_at <= p_now - interval '3 hours' then p_now
                   else greatest(p_now, n.scheduled_at + interval '3 hours') end;
      v_reactors := jsonb_build_array(p_reactor::text);
      v_key := 'reaction:' || r.user_id || ':' || p_match || ':' || floor(extract(epoch from v_at))::bigint;
    end if;

    v_count := jsonb_array_length(v_reactors);
    if v_count = 1 then
      select coalesce(nullif(btrim(pr.first_name), ''), nullif(btrim(pl.first_name), ''),
                      nullif(split_part(btrim(coalesce(pr.display_name, '')), ' ', 1), ''), 'Κάποιος')
        into v_name
        from core.profiles pr left join core.players pl on pl.id = pr.claimed_player_id
       where pr.user_id = (v_reactors ->> 0)::uuid;
      select rp.label_el into v_label
        from core.reactions x join core.reaction_pool rp on rp.key = x.reaction_key
       where x.user_id = (v_reactors ->> 0)::uuid and x.match_id = p_match;
      select * into v_txt from core.ntext('reaction_one', jsonb_build_object(
        'name', coalesce(v_name, 'Κάποιος'), 'reaction', coalesce(v_label, ''),
        'opponent', core.opponents_acc(p_match, r.side), 'tournament', v_tour));
    else
      select * into v_txt from core.ntext('reaction_many', jsonb_build_object(
        'n', v_count, 'opponent', core.opponents_acc(p_match, r.side), 'tournament', v_tour));
    end if;
    v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                                'data', jsonb_build_object('match_id', p_match, 'tournament_id', m.tournament_id));

    if o.id is not null then
      update core.outbox
         set payload = payload || jsonb_build_object('message', v_msg, 'reactors', v_reactors)
       where id = o.id;
      update core.notifications set payload = v_msg where id = n.id;
    else
      insert into core.notifications (user_id, type, payload, channel, dedupe_key, scheduled_at)
      values (r.user_id, 'reaction', v_msg, 'push', v_key, v_at)
      on conflict (dedupe_key) do nothing;
      continue when not found;
      insert into core.outbox (kind, payload, idempotency_key, run_after)
      values ('push', jsonb_build_object('user_id', r.user_id, 'dedupe_key', v_key, 'type', 'reaction',
                                         'message', v_msg, 'reactors', v_reactors), 'push:' || v_key, v_at)
      on conflict (idempotency_key) do nothing;
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

revoke all on function core.name_gender(text, text) from public, anon;
revoke all on function core.accusative_word(text, text) from public, anon;
revoke all on function core.opponents_acc(uuid, smallint) from public, anon, authenticated;
revoke all on function core.reaction_notify(uuid, uuid, timestamptz) from public, anon, authenticated;

-- api.react (20261117000000_m2_kudos), now telling the players about a brand new reaction
create or replace function api.react(p_match_id uuid, p_key text)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_new boolean;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from core.matches m join core.match_results r on r.match_id = m.id
                  where m.id = p_match_id and m.approved and m.status <> 'void') then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;
  if p_key is null then
    delete from core.reactions where user_id = v_uid and match_id = p_match_id;
  else
    if not (p_key = any (core.reaction_pair(p_match_id))) then raise exception 'bad_reaction' using errcode = '22023'; end if;
    v_new := not exists (select 1 from core.reactions where user_id = v_uid and match_id = p_match_id);
    insert into core.reactions (user_id, match_id, reaction_key) values (v_uid, p_match_id, p_key)
    on conflict (user_id, match_id) do update set reaction_key = excluded.reaction_key, created_at = now();
    if v_new then perform core.reaction_notify(p_match_id, v_uid); end if;
  end if;
  return core.reactions_json(p_match_id, v_uid);
end;
$$;
revoke all on function api.react(uuid, text) from public, anon;
grant execute on function api.react(uuid, text) to authenticated, service_role;
