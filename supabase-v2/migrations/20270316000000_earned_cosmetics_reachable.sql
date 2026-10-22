-- Earned cosmetics are earnable (founder, 22 Oct 2026: "check that the cosmetics awards actually exist and not
-- everything is to buy"). The audit found every earned item has a working grant path, except two frames that the
-- wardrobe showed to everyone as earnable although nothing can give them today:
--   frame_founding  «Πρώτη γενιά»: no grant path anywhere. The first reference data tied it to a friend quest that M3
--                   replaced (invite_friend gives frame_friends). What «από την αρχή» means is the founder's call.
--   frame_friends   «Φίλοι»: given by the invite_friend quest, which stays inactive until invites exist.
-- Both are switched off (api.get_look and api.equip_item only see active items). Nobody owns either, so nobody loses
-- anything. frame_friends comes back with the invite quest, frame_founding once it has a rule. Their artwork stays.

update core.cosmetic_items set active = false where key in ('frame_founding', 'frame_friends');
