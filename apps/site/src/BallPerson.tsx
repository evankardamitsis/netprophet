import { colors, cosmetics } from '@netprophet/tokens';

/**
 * A ball person for the website: the same drawing as the app's avatar (apps/app/src/components/Avatar.tsx), as plain
 * SVG. Only what the site shows: skin, hair, the kit band and racket, one piece of gear.
 */
type Hair = 'short' | 'curly' | 'long' | 'bun';
type Gear = 'cap' | 'headband' | 'shades' | 'bucket' | null;

export interface BallPersonProps {
  id: string;
  skin: number;
  hair: Hair;
  hairColour: keyof typeof cosmetics.avatar.hair;
  kit: keyof typeof cosmetics.kit;
  gear?: Gear;
  size?: number;
}

export function BallPerson({ id, skin, hair, hairColour, kit, gear = null, size = 140 }: BallPersonProps) {
  const s = cosmetics.avatar.skin[skin] ?? cosmetics.avatar.skin[1];
  const h = cosmetics.avatar.hair[hairColour];
  const k = cosmetics.kit[kit];
  const g = cosmetics.gear;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id={`sh-${id}`} cx="36%" cy="30%" r="72%">
          <stop offset="0" stopColor={colors.white} stopOpacity={0.55} />
          <stop offset="0.38" stopColor={colors.white} stopOpacity={0} />
          <stop offset="0.8" stopColor={colors.ink} stopOpacity={0.05} />
          <stop offset="1" stopColor={colors.ink} stopOpacity={0.3} />
        </radialGradient>
        <clipPath id={`cl-${id}`}>
          <circle cx="50" cy="56" r="34" />
        </clipPath>
      </defs>
      <ellipse cx="50" cy="95" rx="24" ry="3.5" fill={colors.ink} opacity={0.22} />
      <g transform="rotate(28 86 36)">
        <path d="M86 50 L86 70" stroke={k.shirt} strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="86" cy="34" rx="10" ry="13.5" fill={colors.white} fillOpacity={0.12} stroke={k.racket} strokeWidth="3" />
        <path d="M81 24 L81 44 M86 21 L86 47 M91 24 L91 44 M77 29 L95 29 M76 34 L96 34 M77 39 L95 39" stroke={k.racket} strokeWidth="0.9" opacity={0.55} />
      </g>
      {hair === 'long' ? <path d="M14 74 C8 38 28 17 50 17 C72 17 92 38 86 74 C80 78 74 76 72 70 L28 70 C26 76 20 78 14 74 Z" fill={h} /> : null}
      {hair === 'bun' && gear !== 'cap' && gear !== 'bucket' ? <circle cx="50" cy="17" r="10" fill={h} /> : null}
      <circle cx="50" cy="56" r="34" fill={s} />
      <g clipPath={`url(#cl-${id})`}>
        <rect x="0" y="74" width="100" height="30" fill={k.shirt} />
        <path d="M40 74 L50 81 L60 74" fill="none" stroke={kit === 'kit_white' ? colors.slate : colors.paper} strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <circle cx="50" cy="56" r="34" fill={`url(#sh-${id})`} />
      {hair === 'short' ? <path d="M17 50 C18 30 32 20 50 20 C68 20 82 30 83 50 C75 39 64 33 52 34 C46 30 36 31 30 36 C25 39 20 44 17 50 Z" fill={h} /> : null}
      {hair === 'curly' ? (
        <g fill={h}>
          {[[24, 38, 9], [32, 28, 10], [43, 23, 10], [56, 23, 10], [67, 28, 10], [76, 38, 9]].map(([x, y, r]) => (
            <circle key={x} cx={x} cy={y} r={r} />
          ))}
        </g>
      ) : null}
      {hair === 'long' ? <path d="M17 52 C17 31 32 20 52 20 C70 20 84 31 83 50 C74 38 62 33 48 34 C36 36 24 42 17 52 Z" fill={h} /> : null}
      {hair === 'bun' ? <path d="M17 48 C19 30 33 21 50 21 C67 21 81 30 83 47 C75 38 63 33 50 33 C37 33 25 38 17 48 Z" fill={h} /> : null}
      {gear === 'cap' ? (
        <g>
          <path d="M17 45 C18 25 32 15 50 15 C68 15 82 25 83 45 Z" fill={g.cap} stroke={colors.ink} strokeOpacity={0.28} strokeWidth="1.4" />
          <path d="M13 45 Q50 60 87 45 Q50 50 13 45 Z" fill={g.capShade} stroke={colors.ink} strokeOpacity={0.28} strokeWidth="1.2" />
        </g>
      ) : null}
      {gear === 'headband' ? (
        <g fill={colors.lime}>
          <path d="M17 44 Q50 29 83 44 L83 52 Q50 37 17 52 Z" />
          <path d="M82 45 L94 41 L91 49 Z M82 49 L93 55 L84 56 Z" />
        </g>
      ) : null}
      {gear === 'bucket' ? (
        <g>
          <path d="M24 41 C25 22 37 14 50 14 C63 14 75 22 76 41 Z" fill={g.bucket} />
          <path d="M10 47 Q50 30 90 47 Q93 54 86 55 Q50 40 14 55 Q7 54 10 47 Z" fill={g.bucketShade} />
        </g>
      ) : null}
      {[39, 61].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="55" rx="7" ry="8.5" fill={colors.white} />
          <ellipse cx={x + 1.5} cy="56.5" rx="4" ry="4" fill={colors.ink} />
          <circle cx={x + 3} cy="54.5" r="1.4" fill={colors.white} />
        </g>
      ))}
      {gear === 'shades' ? (
        <g>
          <rect x="27" y="47.5" width="20" height="14" rx="6" fill={g.lens} />
          <rect x="53" y="47.5" width="20" height="14" rx="6" fill={g.lens} />
          <path d="M47 52 Q50 50 53 52" stroke={g.lens} strokeWidth="2.6" fill="none" />
        </g>
      ) : null}
      <ellipse cx="29" cy="67" rx="5" ry="3.4" fill={cosmetics.avatar.blush} opacity={0.4} />
      <ellipse cx="71" cy="67" rx="5" ry="3.4" fill={cosmetics.avatar.blush} opacity={0.4} />
      <path d="M43.5 68 Q50 73.5 56.5 68" fill="none" stroke={colors.ink} strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}
