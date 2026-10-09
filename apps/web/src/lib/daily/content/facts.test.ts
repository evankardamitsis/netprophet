import { describe, expect, it } from 'vitest';
import { played, rankingFacts, winRate } from './facts';
import type { PlayerRow, Snapshot } from '../providers/supabase';

// Only the fields these functions read; the row type is much wider.
function player(fields: Partial<PlayerRow>): PlayerRow {
    return fields as PlayerRow;
}

describe('winRate', () => {
    it('derives from wins and losses', () => {
        expect(winRate(player({ wins: 8, losses: 4 }))).toBeCloseTo(8 / 12);
        expect(winRate(player({ wins: 3, losses: 3 }))).toBe(0.5);
    });

    it('ignores the stored win_rate column entirely', () => {
        // The production row that exposed the bug: 8-4 stored as 100%.
        const row = player({ wins: 8, losses: 4, win_rate: 100 });
        expect(winRate(row)).toBeCloseTo(8 / 12);
    });

    it('is null when the player has not played, not zero', () => {
        // Zero would read as "loses every match", which is a different claim.
        expect(winRate(player({ wins: 0, losses: 0 }))).toBeNull();
        expect(winRate(player({}))).toBeNull();
    });

    it('reads the doubles record for doubles', () => {
        const row = player({
            wins: 10, losses: 0, doubles_wins: 1, doubles_losses: 3,
        });
        expect(winRate(row, 'singles')).toBe(1);
        expect(winRate(row, 'doubles')).toBe(0.25);
    });

    it('is null for a player with singles only, asked about doubles', () => {
        expect(winRate(player({ wins: 5, losses: 5 }), 'doubles')).toBeNull();
    });

    it('never disagrees with the record shown beside it', () => {
        for (const [w, l] of [[8, 4], [36, 21], [4, 11], [45, 15], [1, 2]]) {
            const row = player({ wins: w, losses: l });
            expect(Math.round((winRate(row)! * 100))).toBe(Math.round((w / (w + l)) * 100));
            expect(played(row, 'singles')).toBe(w + l);
        }
    });
});

describe('rankingFacts', () => {
    function pool(records: [string, number, number][]): Snapshot {
        const players = new Map<string, PlayerRow>();
        for (const [id, wins, losses] of records) {
            players.set(id, player({ id, wins, losses, is_active: true }));
        }
        return {
            players, matches: [], tournaments: new Map(), takenAt: '2026-09-06T00:00:00.000Z',
        } as unknown as Snapshot;
    }

    it('will not rank a player whose record is too thin to have a rate', () => {
        // 3-0 is 100% and would otherwise lead the table over a 40-10 player.
        const facts = rankingFacts(pool([
            ['thin', 3, 0], ['solid', 40, 10], ['mid', 20, 20], ['low', 10, 30],
        ]));
        expect(facts.flatMap((f) => f.value.playerIds)).not.toContain('thin');
    });

    it('orders by the derived rate, best first', () => {
        const facts = rankingFacts(pool([
            ['best', 40, 10], ['mid', 20, 20], ['low', 10, 30],
        ]));
        expect(facts).toHaveLength(1);
        expect(facts[0].value.order).toEqual(['best', 'mid', 'low']);
    });
});
