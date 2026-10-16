-- «Πάγωμα» is «Ασφάλεια» now (founder, 16 Oct 2026: the website says «Ασφάλεια», "rename it to Ασφάλεια in the app
-- too"): the unlock step that gives the first one. The app's own words are in packages/copy.
update core.unlock_defs set title_el = 'Πρώτη Ασφάλεια', title_en = 'First Insurance' where key = 'first_freeze';
