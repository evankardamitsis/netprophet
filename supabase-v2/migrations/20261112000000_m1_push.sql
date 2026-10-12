-- M1 push for results. The resolver already writes a 'result' notification and a 'push' outbox job per resolved
-- vote; this adds the devices and the sender.
--   core.push_tokens:          Expo push tokens per device, owned by the signed-in account (a token moves when
--                              someone else signs in on that phone)
--   api.register_push_token / api.unregister_push_token
--   core.take_push_batch:      claims open push jobs and returns one Expo message per device, grouped per person so
--                              three results arrive as one «Βγήκαν 3 αποτελέσματα» (no spoiler: the reveal is in the app)
--   core.send_push:            posts the batch to Expo's push API with pg_net, every minute under pg_cron (hosted);
--                              the CI image has neither, so there only the batch logic is tested
-- Delivery receipts (DeviceNotRegistered and the like) are not read yet: tokens of uninstalled apps stay until
-- they are replaced. The texts mirror packages/copy `push`.

create table core.push_tokens (
  token         text primary key check (token ~ '^Expo(nent)?PushToken\[.+\]$'),
  user_id       uuid not null references auth.users (id) on delete cascade,
  platform      text not null check (platform in ('ios', 'android')),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);
create index push_tokens_user_idx on core.push_tokens (user_id);
alter table core.push_tokens enable row level security;
comment on table core.push_tokens is 'Expo push tokens. No client access: only the api functions below touch it.';

create or replace function api.register_push_token(p_token text, p_platform text)
returns boolean
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[.+\]$' then raise exception 'bad_token' using errcode = '22023'; end if;
  if p_platform not in ('ios', 'android') then raise exception 'bad_platform' using errcode = '22023'; end if;
  insert into core.push_tokens (token, user_id, platform) values (p_token, v_uid, p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now();
  return true;
end;
$$;

create or replace function api.unregister_push_token(p_token text)
returns boolean
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from core.push_tokens where token = p_token and user_id = v_uid;
  return found;
end;
$$;

create or replace function core.take_push_batch(p_limit int default 200)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_jobs jsonb;
begin
  with claimed as (
    select id, (payload ->> 'user_id')::uuid as user_id, payload ->> 'dedupe_key' as dedupe_key
      from core.outbox
     where kind = 'push' and done_at is null and run_after <= now()
     order by id
     limit greatest(coalesce(p_limit, 200), 1)
     for update skip locked
  ),
  done as (
    update core.outbox o set done_at = now(), attempts = o.attempts + 1
      from claimed c where o.id = c.id
    returning c.user_id, c.dedupe_key
  ),
  sent as (
    update core.notifications n set sent_at = now()
      from done d where n.dedupe_key = d.dedupe_key and n.sent_at is null
    returning n.user_id
  ),
  per_user as (
    select d.user_id, count(*)::int as n from done d group by d.user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'to', t.token,
           'sound', 'default',
           'title', case when u.n = 1 then 'Βγήκε αποτέλεσμα' else 'Βγήκαν ' || u.n || ' αποτελέσματα' end,
           'body', case when u.n = 1 then 'Το ’πες; Μπες να δεις.' else 'Πόσα το ’πες; Μπες να δεις.' end,
           'data', jsonb_build_object('type', 'results', 'count', u.n))
           order by u.user_id, t.token), '[]'::jsonb)
    into v_jobs
    from per_user u
    join core.push_tokens t on t.user_id = u.user_id;
  -- (data-modifying CTEs run whether or not the select reads them: jobs are done and notifications sent even
  -- for people with no device, so nothing piles up)
  return v_jobs;
end;
$$;

revoke all on function core.take_push_batch(int) from public;
revoke all on function api.register_push_token(text, text) from public, anon;
revoke all on function api.unregister_push_token(text) from public, anon;
grant execute on function api.register_push_token(text, text) to authenticated, service_role;
grant execute on function api.unregister_push_token(text) to authenticated, service_role;

-- the sender exists only where pg_net does (hosted, local stack)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
    execute $f$
      create or replace function core.send_push(p_limit int default 200)
      returns int
      language plpgsql security definer set search_path = core, extensions, pg_temp
      as $b$
      declare
        v_msgs  jsonb := core.take_push_batch(p_limit);
        v_n     int := jsonb_array_length(v_msgs);
        v_i     int := 0;
      begin
        -- Expo takes up to 100 messages per request
        while v_i < v_n loop
          perform net.http_post(
            url := 'https://exp.host/--/api/v2/push/send',
            body := (select jsonb_agg(m) from jsonb_array_elements(v_msgs) with ordinality e(m, k)
                      where k > v_i and k <= v_i + 100),
            headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
          v_i := v_i + 100;
        end loop;
        return v_n;
      end;
      $b$;
    $f$;
    execute 'revoke all on function core.send_push(int) from public';
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
      perform cron.schedule('np-send-push', '* * * * *', 'select core.send_push(200)');
    end if;
  end if;
end;
$$;
