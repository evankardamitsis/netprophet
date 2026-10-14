import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATARS, avatarByKey, defaultAvatarFor } from './avatar';

describe('the drawn avatars', () => {
  it('has 12 defaults, 6 men and 6 women, with unique keys', () => {
    expect(DEFAULT_AVATARS).toHaveLength(12);
    expect(DEFAULT_AVATARS.filter((a) => a.gender === 'm')).toHaveLength(6);
    expect(new Set(DEFAULT_AVATARS.map((a) => a.key)).size).toBe(12);
  });
  it('gives a player the same default every time, from their gender', () => {
    const a = defaultAvatarFor('7d3c0f6e-1111-4c2a-9d6b-000000000001', 'f');
    expect(defaultAvatarFor('7d3c0f6e-1111-4c2a-9d6b-000000000001', 'f')).toBe(a);
    expect(a.gender).toBe('f');
    expect(defaultAvatarFor('another', 'm').gender).toBe('m');
  });
  it('spreads players over the defaults', () => {
    const keys = new Set(Array.from({ length: 60 }, (_, i) => defaultAvatarFor(`p${i}`, null).key));
    expect(keys.size).toBeGreaterThan(8);
  });
  it('finds a default by key', () => {
    expect(avatarByKey('f5')?.look.hair).toBe('bun');
    expect(avatarByKey('nope')).toBeNull();
  });
});
