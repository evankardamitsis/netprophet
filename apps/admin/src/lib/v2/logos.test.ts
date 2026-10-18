import { describe, expect, it } from 'vitest';
import { LOGO_MAX_BYTES, isLogoKind, logoPath, logoProblem, logoUrl, sniffLogo } from './logos';

// the path rule matches api.admin_set_logo in supabase-v2/migrations/20270212000000_logos.sql
describe('logos', () => {
  it('accepts PNG, JPG and WebP up to 512 KB', () => {
    expect(logoProblem({ type: 'image/png', size: 10_000 })).toBeNull();
    expect(logoProblem({ type: 'image/jpeg', size: LOGO_MAX_BYTES })).toBeNull();
    expect(logoProblem({ type: 'image/webp', size: 1 })).toBeNull();
    expect(logoProblem({ type: 'image/svg+xml', size: 100 })).toBe('Use a PNG, JPG or WebP image.');
    expect(logoProblem({ type: 'image/gif', size: 100 })).toBe('Use a PNG, JPG or WebP image.');
    expect(logoProblem({ type: 'image/png', size: 0 })).toBe('The file is empty.');
    expect(logoProblem({ type: 'image/png', size: LOGO_MAX_BYTES + 1 })).toBe('The image is 513 KB. Keep it under 512 KB.');
  });

  it('reads the real type from the first bytes', () => {
    expect(sniffLogo(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe('image/png');
    expect(sniffLogo(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffLogo(new TextEncoder().encode('RIFF\u0000\u0000\u0000\u0000WEBPVP8 '))).toBe('image/webp');
    expect(sniffLogo(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(sniffLogo(new Uint8Array([]))).toBeNull();
  });

  it('puts every upload at a new path in the row folder', () => {
    expect(logoPath('tournament', 'abc', 'image/png', 'lx9k2')).toBe('tournaments/abc/lx9k2.png');
    expect(logoPath('club', 'abc', 'image/jpeg', 'LX9K2')).toBe('clubs/abc/lx9k2.jpg');
    expect(logoPath('club', 'abc', 'image/webp', '../../x')).toBe('clubs/abc/x.webp');
    expect(logoPath('club', 'abc', 'image/webp', '///')).toBe('clubs/abc/logo.webp');
  });

  it('builds the public URL', () => {
    expect(logoUrl('https://x.supabase.co/', 'clubs/abc/k.png')).toBe('https://x.supabase.co/storage/v1/object/public/logos/clubs/abc/k.png');
    expect(logoUrl('https://x.supabase.co', null)).toBeNull();
    expect(logoUrl('', 'clubs/abc/k.png')).toBeNull();
  });

  it('knows the two kinds', () => {
    expect(isLogoKind('tournament')).toBe(true);
    expect(isLogoKind('club')).toBe(true);
    expect(isLogoKind('player')).toBe(false);
  });
});
