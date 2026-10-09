// Retire the order cards built on players.win_rate, then republish the pool.
//
// `win_rate` disagreed with `wins`/`losses` on 1.036 of the 1.517 players with
// a record. Every approved `order` card printed a wrong percentage and three of
// eight ordered the players wrongly, so the game would have marked a correct
// answer wrong. facts.ts now derives the rate instead; these rows predate that.
//
//   npx tsx scripts/regenerate-order-cards.mts [--apply]
//
// Without --apply it reports what it would do and writes nothing.

import { config } from 'dotenv';
config({ path: '.env.local' });

const { createDailyClient } = await import('../src/lib/daily/providers/supabase');
const { listCards, retireCards } = await import('../src/lib/daily/content/store');
const { publish } = await import('../src/lib/daily/content/publish');

const apply = process.argv.includes('--apply');
const REASON =
    'built on players.win_rate, which disagreed with wins/losses; superseded by regeneration';
const LOCALES = ['el', 'en'] as const;
const FROM = '2026-09-07';
const DAYS = 4;

const client = createDailyClient();

for (const locale of LOCALES) {
    const cards = await listCards({ locale, limit: 500, client });
    const stale = cards.filter((c) => c.card.kind === 'order' && c.status !== 'rejected');

    console.log(`\n=== ${locale} ===`);
    console.log(`order cards to retire: ${stale.length}`);
    for (const c of stale) console.log(`  ${c.status.padEnd(8)} ${c.scheduled_for}  ${c.id}`);

    if (!apply) continue;

    const { retired } = await retireCards({
        ids: stale.map((c) => c.id), locale, reason: REASON, client,
    });
    console.log(`retired ${retired}`);

    const report = await publish({ locale, from: FROM, days: DAYS, client });
    console.log(`generated ${report.generated} candidates, ${report.rejected} rejected`);
    for (const d of report.days) console.log(`  ${d.date}  ${d.written} new of ${d.cards} scheduled`);
}

if (!apply) console.log('\nDry run. Re-run with --apply to write.');
