-- Demo sponsored cards for the founder's demos (12 Oct 2026): four in the feed (one every fourth card) and one on
-- Αποτελέσματα, from made-up local businesses (no real brands). Tagged category 'demo' and removed with demo off.

create or replace function core.seed_demo_sponsored(p_on boolean)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_n int;
begin
  delete from core.sponsored_cards where category = 'demo';
  if not p_on then return 0; end if;
  insert into core.sponsored_cards (sponsor, category, title, subtitle, cta_url, placement, weight, status) values
    ('Ρακέτες Ποσειδών',         'demo', 'Νέες χορδές σε 24 ώρες',          'Φέρε τη ρακέτα το πρωί, πάρ’ τη το απόγευμα.', 'https://netprophet.gr', 'feed',    3, 'active'),
    ('Ακαδημία Άσπρη Γραμμή',    'demo', 'Δωρεάν πρώτο μάθημα',              'Για όλα τα levels, κάθε Σάββατο.',              'https://netprophet.gr', 'feed',    2, 'active'),
    ('Καφέ Φιλέ',                'demo', 'Ο καφές μετά το ματς κερνάει',     'Δείξε το σκορ σου στο ταμείο.',                 'https://netprophet.gr', 'feed',    2, 'active'),
    ('Γήπεδα Τέσσερα Σετ',       'demo', 'Κλείσε γήπεδο για απόψε',          'Φωτισμένα γήπεδα ως τις 23:00.',                'https://netprophet.gr', 'feed',    1, 'active'),
    ('Ρακέτες Ποσειδών',         'demo', 'Η ρακέτα του μήνα',                'Δοκίμασέ τη δωρεάν για μια εβδομάδα.',          'https://netprophet.gr', 'results', 1, 'active');
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function core.seed_demo_sponsored(boolean) from public;

create or replace function api.admin_demo(p_on boolean)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return core.seed_demo(p_on) || jsonb_build_object('sponsored', core.seed_demo_sponsored(p_on));
end;
$$;
