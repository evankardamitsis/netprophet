-- The Pro welcome for Pro given from the admin (founder, 25 Nov 2026). Until now the welcome came only from a store
-- purchase. Now a 'promo' entitlement (api.admin_grant_pro) queues the same kind, pro_welcome, with {given, ends_at}
-- under the same once-per-account key, so nobody gets both and a second gift sends nothing. The send-time check that
-- skips it when Pro has already ended (core.email_gate) covers it too. The mail itself: apps/admin mail/pro.ts.
-- Back-send: everyone whose given Pro is running now and who never had a Pro welcome gets it once.

create or replace function core.email_on_pro_given()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if new.key = 'pro' and new.source = 'promo' and new.status = 'active'
     and exists (select 1 from core.profiles where user_id = new.user_id and deleted_at is null) then
    perform core.email_queue(new.user_id, 'pro_welcome', 'pro_welcome:' || new.user_id,
      jsonb_build_object('given', true, 'ends_at', new.ends_at));
  end if;
  return new;
end;
$$;
revoke all on function core.email_on_pro_given() from public, anon, authenticated;

create trigger email_on_pro_given after insert on core.entitlements
  for each row execute function core.email_on_pro_given();

-- the back-send, latest gift per person
select core.email_queue(g.user_id, 'pro_welcome', 'pro_welcome:' || g.user_id,
                        jsonb_build_object('given', true, 'ends_at', g.ends_at))
  from (select distinct on (e.user_id) e.user_id, e.ends_at
          from core.entitlements e
          join core.profiles pr on pr.user_id = e.user_id and pr.deleted_at is null
         where e.key = 'pro' and e.source = 'promo' and e.status = 'active' and e.starts_at <= now()
           and (e.ends_at is null or e.ends_at > now())
         order by e.user_id, e.ends_at desc nulls first) g;
