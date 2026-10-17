import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { cardStats, ownerLine, shareMessage, SHARE_URL } from './ballerShare';

const el = getCopy('el');
const en = getCopy('en');

describe('Baller share card', () => {
  it('names the Baller in the message when it has a name', () => {
    expect(shareMessage(el, 'Σερβίτσας')).toBe(`Γνώρισε τον Σερβίτσας, τον Baller μου στο NetProphet. Φτιάξε τον δικό σου: ${SHARE_URL}`);
    expect(shareMessage(en, 'Ace')).toBe(`Meet Ace, my Baller on NetProphet. Make your own: ${SHARE_URL}`);
  });
  it('still reads without a name', () => {
    expect(shareMessage(el, null)).toBe(`Γνώρισε τον Baller μου στο NetProphet. Φτιάξε τον δικό σου: ${SHARE_URL}`);
  });
  it('shows the owner as first name and initial', () => {
    expect(ownerLine('Βαγγέλης', 'Καρδαμίτσης')).toBe('Βαγγέλης Κ.');
    expect(ownerLine(' Μαρία ', 'αλεξίου')).toBe('Μαρία Α.');
    expect(ownerLine('Νίκος', '')).toBe('Νίκος');
    expect(ownerLine('', 'Παππάς')).toBe('Π.');
  });
  it('puts level, σερί and πόντοι μήνα on the card', () => {
    expect(cardStats(el, { game: { level: 3 }, streak: 4, monthPoints: 120 })).toEqual([
      { value: '3', label: 'level' },
      { value: '4', label: 'σερί' },
      { value: '120', label: 'πόντοι μήνα' },
    ]);
  });
});
