import { describe, expect, it } from 'vitest';
import { logoUrl, monogram } from './logo';

describe('logos', () => {
  it('builds the public URL from the path', () => {
    expect(logoUrl('tournaments/abc/k1.png', 'https://x.supabase.co')).toBe('https://x.supabase.co/storage/v1/object/public/logos/tournaments/abc/k1.png');
    expect(logoUrl('/clubs/abc/k1.webp', 'https://x.supabase.co/')).toBe('https://x.supabase.co/storage/v1/object/public/logos/clubs/abc/k1.webp');
  });

  it('gives no URL without a path or a backend', () => {
    expect(logoUrl(null, 'https://x.supabase.co')).toBeNull();
    expect(logoUrl('', 'https://x.supabase.co')).toBeNull();
    expect(logoUrl('tournaments/abc/k1.png', '')).toBeNull();
  });

  it('the monogram is the first letter in capitals without accents', () => {
    expect(monogram('Όμιλος Αντισφαίρισης')).toBe('Ο');
    expect(monogram('ήλιος')).toBe('Η');
    expect(monogram('Open Κηφισιάς')).toBe('O');
    expect(monogram('«ΑΟΚ» Tennis Open')).toBe('Α');
    expect(monogram('')).toBe('');
    expect(monogram(null)).toBe('');
  });
});
