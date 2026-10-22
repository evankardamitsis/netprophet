-- Founding pricing (founder, 22 Oct 2026): «Ιδρυτικό μέλος» is 49,99€ for the first year and renews at 69,99€ a
-- year after it; sold only until 31/12/2026; every plan starts with the store's 7-day free trial (with a card). The
-- store mechanism is in docs/v2/founding-pricing.md: on the App Store pro_founding stays 49,99€ with a trial and a
-- price change to 69,99€ for existing subscribers takes effect on 1/1/2027; on Google Play pro_founding is a 69,99€
-- base plan with a two-phase offer (7 days free, then one year at 49,99€). Play ids («pro_founding:yearly») are read
-- by 20270318000000_play_product_ids.sql; nothing here touches api.apply_store_event.
--
-- core.store_products.renews_eur: what a plan costs after its first year when that differs (pro_founding 69,99).
-- api.pro_offer returns it per plan as `renews`, so the Pro screen can say «μετά 69,99€/χρόνο».

alter table core.store_products add column renews_eur numeric(6, 2);
update core.store_products
   set renews_eur = 69.99,
       note = 'Founding members: 49,99 the first year, then 69,99 a year; sold until 31 Dec 2026'
 where product_id = 'pro_founding';

/** the Pro screen's plans: the free week is there until the account has had it or paid; `renews` is the price after the first year */
create or replace function api.pro_offer()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_founding boolean := core.athens_day() <= date '2026-12-31';
  v_joined   timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select created_at into v_joined from auth.users where id = v_uid;
  return jsonb_build_object(
    'pro', core.is_pro(v_uid),
    'trial_available', not core.pro_trial_used(v_uid) and not core.is_pro(v_uid),
    'on_trial', exists (select 1 from core.entitlements where user_id = v_uid and key = 'pro' and source = 'trial'
                         and status = 'active' and ends_at > now()),
    'founding_until', case when v_founding then '2026-12-31' end,
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
revoke all on function api.pro_offer() from public, anon;
grant execute on function api.pro_offer() to authenticated, service_role;
