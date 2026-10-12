import { describe, expect, it } from 'vitest';
import type { KudoOption, ReceivedKudo } from '@netprophet/db';
import { copy } from '../i18n';
import { applyReaction, kudoQuestion, kudosCloud, kudoText } from './kudos';

const baseline: KudoOption = { key: 'steady_baseline', forms: { m: 'Σταθερός στη baseline', f: 'Σταθερή στη baseline', plural: 'Σταθεροί στη baseline' } };

describe('kudos', () => {
  it('picks the form', () => {
    expect(kudoText(baseline, 'm')).toBe('Σταθερός στη baseline');
    expect(kudoText(baseline, 'f')).toBe('Σταθερή στη baseline');
    expect(kudoText(baseline, 'f', true)).toBe('Σταθεροί στη baseline');
  });

  it('asks the prototype question', () => {
    expect(kudoQuestion(copy, 'f', false, false)).toBe('Τι σου άρεσε περισσότερο στην αντίπαλο;');
    expect(kudoQuestion(copy, 'm', true, false)).toBe('Τι σου άρεσε περισσότερο στους αντιπάλους;');
    expect(kudoQuestion(copy, 'f', false, true)).toBe('Τι θες να της πεις;');
  });

  it('moves the reaction counts like the server does', () => {
    const r = { options: [], counts: { bravo: 2 }, mine: null };
    const a = applyReaction(r, 'bravo');
    expect(a).toEqual({ options: [], counts: { bravo: 3 }, mine: 'bravo' });
    const b = applyReaction(a, 'rematch');
    expect(b).toEqual({ options: [], counts: { bravo: 2, rematch: 1 }, mine: 'rematch' });
    expect(applyReaction(b, 'rematch')).toEqual({ options: [], counts: { bravo: 2 }, mine: null });
  });

  it('builds the cloud, most said first, six unless all', () => {
    const k = (key: string, n: number, doubles_only = false): ReceivedKudo => ({ key, forms: { m: key, f: key + 'F', plural: key + 'P' }, doubles_only, n });
    const list = [k('a', 4), k('b', 2), k('c', 1, true), k('d', 1), k('e', 1), k('f', 1), k('g', 1)];
    const six = kudosCloud(list, 'f', false);
    expect(six.map((x) => x.text)).toEqual(['aF', 'bF', 'cP', 'dF', 'eF', 'fF']);
    expect(six[0]).toMatchObject({ lead: true, weight: 1 });
    expect(six[1]!.weight).toBe(0.5);
    expect(kudosCloud(list, 'm', true)).toHaveLength(7);
    expect(kudosCloud([k('a', 1)], 'm', false)[0]!.lead).toBe(false);
  });
});
