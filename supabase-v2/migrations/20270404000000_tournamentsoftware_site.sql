-- tournamentsoftware.com is an organiser's site (founder, 2 Nov 2026: ITF Masters MT200 at Queens, its Matches page
-- with a day selector, read by apps/admin through packages/ingest tournamentSoftware). A link saved before the admin
-- knew the site was stored as a sheet; it is marked `site` now, so a match taken off the site is voided by itself
-- (20270328000000_site_vanished_void), like athenstennis.gr.
update core.tournaments set source_kind = 'site'
 where source_url ~* '^https?://([a-z0-9-]+\.)*tournamentsoftware\.com/tournament/' and source_kind is distinct from 'site';
