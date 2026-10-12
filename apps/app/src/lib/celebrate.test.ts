import { describe, expect, it } from 'vitest';
import type { Celebration } from '@netprophet/db';
import { copy } from '../i18n';
import { celebrationView } from './celebrate';

const c = (streak: number, freeze: boolean, frame: string | null): Celebration => ({
  id: 'c',
  created_at: '2026-10-12T10:00:00Z',
  payload: { type: 'streak_milestone', streak, match_id: 'm', reward: { freeze, frame } },
});

describe('celebrationView', () => {
  it('says the prototype lines and only what was given', () => {
    expect(celebrationView(c(3, true, null), copy)).toEqual({ label: 'ΣΕΡΙ', streak: 3, title: 'Τρία στη σειρά!', reward: 'Πάρε κι ένα πάγωμα για τις δύσκολες μέρες' });
    expect(celebrationView(c(3, false, null), copy).reward).toBe('Συνέχισε έτσι');
    expect(celebrationView(c(5, false, null), copy).title).toBe('Πέντε στη σειρά!');
    expect(celebrationView(c(7, false, 'frame_seven'), copy).reward).toBe('Κορνίζα «Επτά»');
    expect(celebrationView(c(10, false, 'frame_ten'), copy)).toMatchObject({ title: 'Το δέκα το καλό', reward: 'Κορνίζα «Δέκα»' });
    expect(celebrationView(c(10, true, 'frame_ten'), copy).reward).toBe('Πάγωμα και κορνίζα');
  });
});
