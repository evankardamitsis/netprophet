-- Real data only (founder, 14 Oct: "remove all demo tournaments from the admin and the app"). The demo matches went
-- with core.seed_demo(false); this removes the empty «Demo Open Γλυφάδας» the first phone demos used (created by
-- staff on 9 Oct, every match in it a demo). Only if nothing real is left in it.
delete from core.tournaments t
 where t.name = 'Demo Open Γλυφάδας' and t.source = 'admin' and t.source_url is null
   and not exists (select 1 from core.matches m where m.tournament_id = t.id)
   and not exists (select 1 from core.tournament_draws d where d.tournament_id = t.id);
