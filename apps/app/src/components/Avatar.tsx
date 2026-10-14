import { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop, Svg, Text as SvgText } from 'react-native-svg';
import type { AvatarLook, HairStyle } from '../lib/avatar';
import { colors, cosmetics, fonts } from '../theme';

/**
 * A drawn player (founder, 14 Oct: "create avatars same way you created the ball animations"): a bust on a 100×100 box
 * in the sticker style (thick ink outline, flat colour), with the light from the top left that the balls and kits have.
 * The shirt takes the kit's colour. `bg` fills the disc behind; the caller clips it round.
 * A roster player without an account is the silhouette with initials, never a face (avatar.md).
 */
/** the bust drawn on 100×100, framed tighter so the face fills the disc */
const FRAME = '11 9 78 78';
const OUT = colors.ink;
const W = 3.2;

type KitKey = keyof typeof cosmetics.kit;

export function Avatar({
  look,
  size,
  kit = 'kit_green',
  bg = colors.paper,
}: {
  look: AvatarLook;
  size: number;
  kit?: string;
  bg?: string | null;
}) {
  const skin = cosmetics.avatar.skin[look.skin] ?? cosmetics.avatar.skin[1];
  const hair = cosmetics.avatar.hair[look.hairColour];
  const shirt = (cosmetics.kit[kit as KitKey] ?? cosmetics.kit.kit_green).shirt;
  const lightShirt = kit === 'kit_white';
  // grey hair, softer brows
  const brow = look.hairColour === 'grey' ? colors.slate : OUT;
  return (
    <Svg width={size} height={size} viewBox={FRAME}>
      <Defs>
        <RadialGradient id="np-av-light" cx="32%" cy="22%" r="70%">
          <Stop offset="0" stopColor={colors.white} stopOpacity={0.32} />
          <Stop offset="0.55" stopColor={colors.white} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="np-av-rim" cx="42%" cy="38%" r="80%">
          <Stop offset="0.78" stopColor={colors.ink} stopOpacity={0} />
          <Stop offset="1" stopColor={colors.ink} stopOpacity={0.16} />
        </RadialGradient>
      </Defs>
      {bg ? <Rect x={0} y={0} width={100} height={100} fill={bg} /> : null}
      <HairBack style={look.hair} fill={hair} />
      {/* shoulders in the kit's shirt, a V collar */}
      <Path d="M8 104 C10 84 26 75 42 73 L58 73 C74 75 90 84 92 104 Z" fill={shirt} stroke={OUT} strokeWidth={W} strokeLinejoin="round" />
      <Path d="M42 73 L50 84 L58 73" fill="none" stroke={lightShirt ? colors.slate : colors.paper} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {/* neck */}
      <Path d="M43 60 L43 74 C46 77 54 77 57 74 L57 60 Z" fill={skin} stroke={OUT} strokeWidth={W} strokeLinejoin="round" />
      {/* ears, then the head */}
      <Ellipse cx={31} cy={48} rx={4.4} ry={5.8} fill={skin} stroke={OUT} strokeWidth={2.6} />
      <Ellipse cx={69} cy={48} rx={4.4} ry={5.8} fill={skin} stroke={OUT} strokeWidth={2.6} />
      <Ellipse cx={50} cy={44} rx={19.5} ry={22.5} fill={skin} stroke={OUT} strokeWidth={W} />
      {look.beard ? (
        <Path
          d="M31 47 C32 63 40 70.5 50 70.5 C60 70.5 68 63 69 47 C66 56 61 60 56 60.5 C53 58.5 47 58.5 44 60.5 C39 60 34 56 31 47 Z"
          fill={hair}
          stroke={OUT}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
      ) : null}
      {/* the face: brows, eyes with a catchlight, nose, a smile, a touch of blush */}
      <Path d="M38.5 39.5 Q43 37 47 39.5" fill="none" stroke={brow} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M53 39.5 Q57 37 61.5 39.5" fill="none" stroke={brow} strokeWidth={2.4} strokeLinecap="round" />
      <Ellipse cx={43} cy={46} rx={2.6} ry={3} fill={OUT} />
      <Ellipse cx={57} cy={46} rx={2.6} ry={3} fill={OUT} />
      <Circle cx={43.9} cy={45} r={0.9} fill={colors.white} />
      <Circle cx={57.9} cy={45} r={0.9} fill={colors.white} />
      <Path d="M50.5 47 Q48 52.5 51 53.5" fill="none" stroke={OUT} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      {look.beard ? null : (
        <>
          <Ellipse cx={38.5} cy={54} rx={3.4} ry={2} fill={cosmetics.avatar.blush} opacity={0.35} />
          <Ellipse cx={61.5} cy={54} rx={3.4} ry={2} fill={cosmetics.avatar.blush} opacity={0.35} />
        </>
      )}
      <Path d="M44.5 57.5 Q50 62 55.5 57.5" fill="none" stroke={OUT} strokeWidth={2.3} strokeLinecap="round" />
      <HairFront style={look.hair} fill={hair} />
      {look.glasses ? (
        <G>
          <Rect x={36.5} y={41} width={12} height={9.5} rx={3.5} fill={colors.white} fillOpacity={0.18} stroke={OUT} strokeWidth={2.2} />
          <Rect x={51.5} y={41} width={12} height={9.5} rx={3.5} fill={colors.white} fillOpacity={0.18} stroke={OUT} strokeWidth={2.2} />
          <Path d="M48.5 45 L51.5 45" stroke={OUT} strokeWidth={2.2} strokeLinecap="round" />
        </G>
      ) : null}
      {/* the same light as the balls: bright top left, a darker rim bottom right */}
      <Rect x={0} y={0} width={100} height={100} fill="url(#np-av-rim)" />
      <Rect x={0} y={0} width={100} height={100} fill="url(#np-av-light)" />
    </Svg>
  );
}

/** hair that falls behind the head and shoulders */
function HairBack({ style, fill }: { style: HairStyle; fill: string }) {
  const p = { fill, stroke: OUT, strokeWidth: W, strokeLinejoin: 'round' as const };
  if (style === 'long') return <Path d="M28 46 C25 24 38 15 50 15 C62 15 75 24 72 46 L75 78 C68 83 61 81 58 76 L42 76 C39 81 32 83 25 78 Z" {...p} />;
  if (style === 'bob') return <Path d="M28.5 46 C26 24 38 16 50 16 C62 16 74 24 71.5 46 L72.5 63 C67 66 62 64 61 60 L39 60 C38 64 33 66 27.5 63 Z" {...p} />;
  if (style === 'ponytail') return <Path d="M66 30 C82 30 86 50 78 64 C76 53 72 44 64 38 Z" {...p} />;
  if (style === 'bun') return <Circle cx={50} cy={17} r={8.5} {...p} />;
  return null;
}

/** hair over the forehead */
function HairFront({ style, fill }: { style: HairStyle; fill: string }) {
  const p = { fill, stroke: OUT, strokeWidth: W, strokeLinejoin: 'round' as const };
  switch (style) {
    case 'short':
      return <Path d="M30 44 C28 26 38 18 51 18 C63 18 72.5 26 70 44 C67.5 36 63 31.5 57 30.5 C51 33.5 41 33.5 35 35.5 C32.5 37.5 31 40.5 30 44 Z" {...p} />;
    case 'buzz':
      return <Path d="M31.5 39 C32.5 27 40.5 21.5 50 21.5 C59.5 21.5 67.5 27 68.5 39 C64 32.5 57 29.5 50 29.5 C43 29.5 36 32.5 31.5 39 Z" {...p} />;
    case 'curly':
      return (
        <Path
          d="M30 44 a6.5 6.5 0 0 1 2 -11 a6.5 6.5 0 0 1 7 -9 a6.5 6.5 0 0 1 11 -4 a6.5 6.5 0 0 1 11 4 a6.5 6.5 0 0 1 7 9 a6.5 6.5 0 0 1 2 11 C67 37 59 33 50 33 C41 33 33 37 30 44 Z"
          {...p}
        />
      );
    case 'long':
    case 'bob':
      return <Path d="M30.5 45 C30 27 40 19.5 52 19.5 C64 19.5 70.5 28 69.5 43 C63.5 34.5 54 31 44 32 C38 34.5 33.5 39 30.5 45 Z" {...p} />;
    case 'ponytail':
    case 'bun':
      return <Path d="M30.5 43 C30.5 27 40 20 50.5 20 C61 20 69.5 27 69.5 42 C65 34 57.5 30.5 49 31 C41 31.5 34.5 36 30.5 43 Z" {...p} />;
    case 'bald':
      // grey at the sides only
      return (
        <>
          <Path d="M30.6 49 C29.8 42 31 36.5 34 33.5 C34.5 38 34.5 44 33.6 49.5 Z" {...p} strokeWidth={2.4} />
          <Path d="M69.4 49 C70.2 42 69 36.5 66 33.5 C65.5 38 65.5 44 66.4 49.5 Z" {...p} strokeWidth={2.4} />
        </>
      );
  }
}

/** a roster player without an account: the empty bust and the initials, never a face */
export function AvatarSilhouette({ initials, size, bg = colors.paper }: { initials: string; size: number; bg?: string | null }) {
  const fill = cosmetics.avatar.silhouette;
  return (
    <Svg width={size} height={size} viewBox={FRAME}>
      {bg ? <Rect x={0} y={0} width={100} height={100} fill={bg} /> : null}
      <Path d="M8 104 C10 84 26 75 42 73 L58 73 C74 75 90 84 92 104 Z" fill={fill} />
      <Path d="M43 60 L43 74 C46 77 54 77 57 74 L57 60 Z" fill={fill} />
      <Ellipse cx={50} cy={44} rx={19.5} ry={22.5} fill={fill} />
      <SvgText x={50} y={51} textAnchor="middle" fontSize={19} fontFamily={fonts.displayHeavy} fill={colors.paper}>
        {initials}
      </SvgText>
    </Svg>
  );
}
