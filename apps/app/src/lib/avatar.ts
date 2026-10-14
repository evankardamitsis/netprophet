/**
 * The drawn avatars (founder, 14 Oct 2026: "create avatars same way you created the ball animations"): a player is a
 * bust drawn in code (components/Avatar.tsx) from a few choices, in the sticker style of docs/v2/avatar.md (thick ink
 * outline, flat colour). No photos, no image model. Skin and hair belong to the person and are never sold; the shirt
 * takes the worn kit.
 */

export type HairStyle = 'short' | 'buzz' | 'curly' | 'long' | 'ponytail' | 'bun' | 'bob' | 'bald';
export type HairColour = 'black' | 'brown' | 'chestnut' | 'blonde' | 'auburn' | 'grey';

export interface AvatarLook {
  /** index into tokens cosmetics.avatar.skin (0 lightest to 5 deepest) */
  skin: number;
  hair: HairStyle;
  hairColour: HairColour;
  beard: boolean;
  glasses: boolean;
}

export interface DefaultAvatar {
  key: string;
  gender: 'm' | 'f';
  look: AvatarLook;
}

const d = (key: string, gender: 'm' | 'f', skin: number, hair: HairStyle, hairColour: HairColour, beard = false, glasses = false): DefaultAvatar => ({
  key,
  gender,
  look: { skin, hair, hairColour, beard, glasses },
});

/** the 12 defaults: 6 men, 6 women, mid-20s to about 60, a spread of skin and hair (avatar.md «Defaults») */
export const DEFAULT_AVATARS: readonly DefaultAvatar[] = [
  d('m1', 'm', 1, 'short', 'brown'),
  d('m2', 'm', 3, 'curly', 'black', true),
  d('m3', 'm', 5, 'buzz', 'black'),
  d('m4', 'm', 0, 'bald', 'grey', true, true),
  d('m5', 'm', 2, 'short', 'chestnut', false, true),
  d('m6', 'm', 0, 'short', 'blonde', true),
  d('f1', 'f', 1, 'ponytail', 'brown'),
  d('f2', 'f', 2, 'long', 'black'),
  d('f3', 'f', 5, 'curly', 'black'),
  d('f4', 'f', 0, 'bob', 'grey', false, true),
  d('f5', 'f', 3, 'bun', 'auburn'),
  d('f6', 'f', 0, 'long', 'blonde'),
];

/** a small stable hash (FNV-1a), so a player always gets the same default */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** the default for a player with an account who has not picked one: by gender, then by id */
export function defaultAvatarFor(id: string, gender: 'm' | 'f' | null | undefined): DefaultAvatar {
  const pool = gender ? DEFAULT_AVATARS.filter((a) => a.gender === gender) : DEFAULT_AVATARS;
  return pool[hash(id) % pool.length]!;
}

export function avatarByKey(key: string | null | undefined): DefaultAvatar | null {
  return DEFAULT_AVATARS.find((a) => a.key === key) ?? null;
}
