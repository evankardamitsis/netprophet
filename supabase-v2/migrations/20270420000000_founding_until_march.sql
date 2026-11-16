-- The founding offer runs to the end of March (founder, 16 Nov 2026: "extend the founding offer for the first 3
-- months"). Pro «Ιδρυτικό μέλος», 49,99€ the first year then 69,99€, is sold until 31/3/2027 23:59 Athens, and
-- «Πρώτη γενιά» goes to whoever first took it by then. The date now lives in one place, core.founding_until().
-- The stores follow by hand: Apple's price change to 69,99€ moves to start 1/4/2027, Play's offer is switched off then.

create or replace function core.founding_until()
returns date language sql immutable set search_path = core, pg_temp
as $$ select date '2027-03-31' $$;
grant execute on function core.founding_until() to authenticated, service_role;

create or replace function api.pro_offer()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_founding boolean := core.athens_day() <= core.founding_until();
  v_joined   timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select created_at into v_joined from auth.users where id = v_uid;
  return jsonb_build_object(
    'pro', core.is_pro(v_uid),
    'trial_available', not core.pro_trial_used(v_uid) and not core.is_pro(v_uid),
    'on_trial', exists (select 1 from core.entitlements where user_id = v_uid and key = 'pro' and source = 'trial'
                         and status = 'active' and ends_at > now()),
    'founding_until', case when v_founding then core.founding_until()::text end,
    'plans', (select jsonb_agg(jsonb_build_object('product_id', p.product_id, 'price', p.price_eur, 'period', p.period,
                                                  'renews', coalesce(p.renews_eur, p.price_eur))
                               order by p.price_eur desc)
                from core.store_products p
               where p.grants = 'pro' and p.active
                 and (p.product_id <> 'pro_founding' or v_founding)
                 and (p.product_id <> 'pro_yearly' or not v_founding)),
    'can_offer', not core.is_pro(v_uid)
                 and coalesce(v_joined, now()) < now() - interval '3 days'
                 and not exists (select 1 from core.pro_offers_shown s
                                  where s.user_id = v_uid and s.shown_at > now() - interval '20 hours'));
end;
$$;

create or replace function core.founding_member(p_users uuid[])
returns boolean language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (select 1 from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
                  where c.key = 'frame_founding' and uc.user_id = any (p_users))
      or coalesce((select (min(core.store_event_at(p.raw, p.created_at)) at time zone 'Europe/Athens')::date <= core.founding_until()
                     from core.purchases p
                    where p.user_id = any (p_users) and p.applied
                      and (p.product_id = 'pro_founding'
                           or core.store_product_id(coalesce(p.raw -> 'event', p.raw) ->> 'new_product_id') = 'pro_founding')
                      and p.event_type in ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE',
                                           'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT', 'NON_RENEWING_PURCHASE')),
                  false)
$$;

update core.cosmetic_items set earn_rule_text = 'Για όσους μπήκαν Ιδρυτικά μέλη στο Pro ως τις 31/3'
 where key = 'frame_founding';
