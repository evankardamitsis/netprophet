import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop, Svg, Text as SvgText } from 'react-native-svg';
import type { AvatarLook, HairStyle } from '../lib/avatar';
import { colors, cosmetics, fonts } from '../theme';

/**
 * Ball people (founder, 15 Oct: "a cool round of 3d moving avatars", "love them"): every player is one shaded ball
 * with a face, lit from the top left like the intro's balls. Skin and hair are the person's; the kit dresses the
 * lower band and the racket. Drawn on 100×100; `bg` fills the box behind, the caller clips it round.
 * A roster player without an account is a faceless ball with initials, never a face (avatar.md).
 */
const BALL = { cx: 50, cy: 56, r: 34 };
const EYE = { y: 55, dx: 11, rx: 7, ry: 8.5, pupil: 4 };
/** below this size the racket is noise in a list row */
const RACKET_MIN = 56;

type KitKey = keyof typeof cosmetics.kit;

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type Mouth = 'smile' | 'open' | 'sad';

export interface ArtProps {
  look: AvatarLook;
  size: number;
  kit?: string;
  bg?: string | null;
  /** an open, cheering mouth (the win jump); `mouth` says it in full */
  cheer?: boolean;
  /** the face: a smile, an open cheer or a little sigh */
  mouth?: Mouth;
  /** crossed-out eyes after too many pokes */
  dizzy?: boolean;
  /** the racket raised: Baller waves or cheers with it */
  raised?: boolean;
  /** 1 open, 0 shut (blink); -1..1 where the pupils look */
  eyes?: { open: SharedValue<number>; look: SharedValue<number> };
  /** the gear worn: gear_cap, gear_headband, gear_visor, gear_shades, gear_bandana, gear_bucket */
  gear?: string | null;
  /** the frame worn: a ring around the ball (founder, 15 Oct) */
  frame?: string | null;
}

/** the still avatar: lists, cards, the picker */
export function Avatar(props: Omit<ArtProps, 'eyes' | 'cheer'>) {
  return <BallArt {...props} />;
}

/** the confetti win effect: a burst of little squares out of the ball, then gone */
export const PIECES = Array.from({ length: 14 }, (_, i) => ({
  angle: (i / 14) * Math.PI * 2 + (i % 2) * 0.2,
  dist: 0.42 + (i % 3) * 0.1,
  colour: cosmetics.confetti[i % cosmetics.confetti.length]!,
  spin: (i % 2 ? 1 : -1) * (180 + i * 20),
}));

export function Confetti({ size }: { size: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [t]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PIECES.map((p, i) => (
        <Piece key={i} p={p} t={t} size={size} />
      ))}
    </View>
  );
}

function Piece({ p, t, size }: { p: (typeof PIECES)[number]; t: SharedValue<number>; size: number }) {
  const piece = Math.max(4, size * 0.07);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [
      { translateX: Math.cos(p.angle) * p.dist * size * t.value },
      { translateY: Math.sin(p.angle) * p.dist * size * t.value - size * 0.12 * t.value },
      { rotate: `${p.spin * t.value}deg` },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', left: size / 2 - piece / 2, top: size * 0.5, width: piece, height: piece, borderRadius: 1.5, backgroundColor: p.colour }, style]} />;
}

export function BallArt({ look, size, kit = 'kit_green', bg = null, cheer, mouth, dizzy = false, raised = false, eyes, gear = null, frame = null }: ArtProps) {
  const face: Mouth = mouth ?? (cheer ? 'open' : 'smile');
  const skin = cosmetics.avatar.skin[look.skin] ?? cosmetics.avatar.skin[1];
  const hair = cosmetics.avatar.hair[look.hairColour];
  const k = cosmetics.kit[kit as KitKey] ?? cosmetics.kit.kit_green;
  const collar = kit === 'kit_white' || kit === 'kit_retro' ? colors.slate : colors.paper;
  // ids are per drawing so many avatars on one screen never share a gradient
  const id = `${look.skin}${look.hair}${look.hairColour}${kit}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`sh${id}`} cx="36%" cy="30%" r="72%">
          <Stop offset="0" stopColor={colors.white} stopOpacity={0.55} />
          <Stop offset="0.38" stopColor={colors.white} stopOpacity={0} />
          <Stop offset="0.8" stopColor={colors.ink} stopOpacity={0.05} />
          <Stop offset="1" stopColor={colors.ink} stopOpacity={0.3} />
        </RadialGradient>
        <ClipPath id={`cl${id}`}>
          <Circle cx={BALL.cx} cy={BALL.cy} r={BALL.r} />
        </ClipPath>
      </Defs>
      {bg ? <Rect x={0} y={0} width={100} height={100} fill={bg} /> : null}
      <Ellipse cx={50} cy={95} rx={24} ry={3.5} fill={colors.ink} opacity={0.22} />
      {frame ? <FrameRing frame={frame} id={id} /> : null}
      {size >= RACKET_MIN ? <Racket frame={k.racket} grip={k.shirt} raised={raised} /> : null}
      <HairBack style={look.hair} fill={hair} hatOn={gear === 'gear_cap' || gear === 'gear_bandana' || gear === 'gear_bucket' || gear === 'gear_beanie'} />
      <Circle cx={BALL.cx} cy={BALL.cy} r={BALL.r} fill={skin} />
      <G clipPath={`url(#cl${id})`}>
        {/* the kit: the lower band of the ball, a V at the collar */}
        <Rect x={0} y={74} width={100} height={30} fill={k.shirt} />
        <Path d="M40 74 L50 81 L60 74" fill="none" stroke={collar} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      </G>
      <Circle cx={BALL.cx} cy={BALL.cy} r={BALL.r} fill={`url(#sh${id})`} />
      {/* a faint rim of light, so a dark kit still reads on the ink card */}
      <Circle cx={BALL.cx} cy={BALL.cy} r={BALL.r - 0.6} fill="none" stroke={colors.white} strokeOpacity={0.18} strokeWidth={1.2} />
      <HairFront style={look.hair} fill={hair} />
      {/* a beard: a band round the chin, the mouth drawn over it */}
      {look.beard ? (
        <Path d="M22 60 C25 79 37 88 50 88 C63 88 75 79 78 60 C72 70 62 74 50 74 C38 74 28 70 22 60 Z" fill={hair} clipPath={`url(#cl${id})`} />
      ) : null}
      {gear ? <HeadGear gear={gear} /> : null}
      {dizzy ? <DizzyEyes /> : <Eyes eyes={eyes} />}
      {look.glasses ? (
        <G>
          <Circle cx={50 - EYE.dx} cy={EYE.y} r={10} fill={colors.white} fillOpacity={0.12} stroke={colors.ink} strokeWidth={2.4} />
          <Circle cx={50 + EYE.dx} cy={EYE.y} r={10} fill={colors.white} fillOpacity={0.12} stroke={colors.ink} strokeWidth={2.4} />
          <Path d="M46 54 Q50 51.5 54 54" fill="none" stroke={colors.ink} strokeWidth={2.4} strokeLinecap="round" />
        </G>
      ) : null}
      {gear === 'gear_shades' ? <Shades /> : null}
      <Ellipse cx={29} cy={67} rx={5} ry={3.4} fill={cosmetics.avatar.blush} opacity={0.4} />
      <Ellipse cx={71} cy={67} rx={5} ry={3.4} fill={cosmetics.avatar.blush} opacity={0.4} />
      {face === 'open' ? (
        <Path d="M42 67 Q50 79 58 67 Z" fill={colors.ink} />
      ) : face === 'sad' ? (
        <Path d="M44 71 Q50 66.5 56 71" fill="none" stroke={colors.ink} strokeWidth={2.8} strokeLinecap="round" />
      ) : (
        <Path d="M43.5 68 Q50 73.5 56.5 68" fill="none" stroke={colors.ink} strokeWidth={2.8} strokeLinecap="round" />
      )}
    </Svg>
  );
}

/**
 * A frame as a ring around the ball, in the colours and style of the card frame it was (gold, stripes, the glow of
 * «Επτά», «10»): behind the hair and the racket, so the player stands in it.
 */
const RING = { cx: BALL.cx, cy: BALL.cy, r: 40 };
const AROUND = 2 * Math.PI * RING.r;

function FrameRing({ frame, id }: { frame: string; id: string }) {
  const f = cosmetics.frame;
  const ring = (r: number, width: number, stroke: string, extra: object = {}) => (
    <Circle cx={RING.cx} cy={RING.cy} r={r} fill="none" stroke={stroke} strokeWidth={width} {...extra} />
  );
  // two colours in stripes round the ring
  const stripes = (width: number, a: string, b: string, n: number) => (
    <>
      {ring(RING.r, width, a)}
      {ring(RING.r, width, b, { strokeDasharray: `${AROUND / (n * 2)} ${AROUND / (n * 2)}` })}
    </>
  );
  const plate = (text: string, fill: string, ink: string, edge: string) => (
    <G>
      <Rect x={41} y={88} width={18} height={11} rx={5.5} fill={fill} stroke={edge} strokeWidth={1.4} />
      <SvgText x={50} y={96.6} textAnchor="middle" fontSize={8.5} fontFamily={fonts.displayHeavy} fill={ink}>
        {text}
      </SvgText>
    </G>
  );
  switch (frame) {
    case 'frame_week':
      return (
        <G>
          {ring(RING.r, 4, colors.lime)}
          {ring(RING.r - 2.8, 1.4, colors.ink)}
          {ring(RING.r + 3, 3, colors.lime, { strokeDasharray: `2 ${AROUND / 24 - 2}` })}
        </G>
      );
    case 'frame_ten':
      return (
        <G>
          {ring(RING.r, 4.5, colors.paper)}
          {ring(RING.r - 3.6, 2.2, colors.lime)}
          {plate('10', colors.paper, colors.ink, colors.lime)}
        </G>
      );
    case 'frame_seven':
      return (
        <G>
          {ring(RING.r, 11, colors.lime, { strokeOpacity: 0.18 })}
          {ring(RING.r, 4, f.glow)}
          {ring(RING.r - 2.8, 1.4, colors.ink)}
          {plate('7', colors.ink, colors.lime, f.glow)}
        </G>
      );
    case 'frame_month_top':
      return (
        <G>
          {stripes(6, colors.ink, colors.lime, 18)}
          {ring(RING.r - 3.8, 1.4, colors.paper)}
          <Path d="M42 13 L44 6 L47 10 L50 4 L53 10 L56 6 L58 13 Z" fill={colors.lime} stroke={colors.ink} strokeWidth={1} strokeLinejoin="round" />
        </G>
      );
    case 'frame_friends':
      return (
        <G>
          {stripes(6, colors.paper, colors.lime, 14)}
          {ring(RING.r - 3.8, 1.2, colors.ink)}
        </G>
      );
    case 'frame_level':
      return (
        <G>
          {ring(RING.r, 3.5, colors.ink)}
          {ring(RING.r - 2.8, 2, colors.lime)}
          {[
            [37, f.bronze],
            [50, f.silver],
            [63, f.gold],
          ].map(([x, c]) => (
            <Circle key={x as number} cx={x as number} cy={x === 50 ? 96.5 : 94.5} r={3.6} fill={c as string} stroke={colors.ink} strokeWidth={1} />
          ))}
        </G>
      );
    case 'frame_gold':
      return (
        <G>
          <Defs>
            <LinearGradient id={`gold${id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={f.goldDeep} />
              <Stop offset="0.2" stopColor={f.glow} />
              <Stop offset="0.42" stopColor={f.goldShadow} />
              <Stop offset="0.58" stopColor={f.goldLight} />
              <Stop offset="0.8" stopColor={f.goldDark} />
              <Stop offset="1" stopColor={f.gold} />
            </LinearGradient>
          </Defs>
          {ring(RING.r, 7, `url(#gold${id})`)}
          {ring(RING.r - 3.8, 1.2, f.goldDeep)}
        </G>
      );
    case 'frame_retro':
      return (
        <G>
          {stripes(7, f.retroCream, f.retroRed, 22)}
          {ring(RING.r - 4.2, 1.4, colors.ink)}
        </G>
      );
    case 'frame_grass':
      return (
        <G>
          {stripes(8, f.grassDark, f.grassLight, 16)}
          {ring(RING.r - 4.6, 1.4, colors.white, { strokeOpacity: 0.9 })}
        </G>
      );
    case 'frame_founding':
      return (
        <G>
          {ring(RING.r, 3, colors.lime)}
          {ring(RING.r - 2.6, 2, colors.ink)}
          {ring(RING.r - 4.6, 1.4, colors.paper)}
        </G>
      );
    default:
      return null;
  }
}

/** what goes on the head: a cap, a headband, a visor, a bandana or a bucket hat (the shades go on the eyes) */
function HeadGear({ gear }: { gear: string }) {
  const g = cosmetics.gear;
  switch (gear) {
    case 'gear_cap':
      return (
        <G>
          <Path d="M17 45 C18 25 32 15 50 15 C68 15 82 25 83 45 Z" fill={g.cap} stroke={colors.ink} strokeOpacity={0.28} strokeWidth={1.4} />
          <Path d="M50 16 L50 44 M34 20 C38 28 40 36 40 44 M66 20 C62 28 60 36 60 44" stroke={g.capShade} strokeWidth={1} fill="none" />
          <Path d="M13 45 Q50 60 87 45 Q50 50 13 45 Z" fill={g.capShade} stroke={colors.ink} strokeOpacity={0.28} strokeWidth={1.2} />
          <Circle cx={50} cy={15.5} r={2.6} fill={g.capShade} />
        </G>
      );
    case 'gear_headband':
      return (
        <G>
          <Path d="M17 44 Q50 29 83 44 L83 52 Q50 37 17 52 Z" fill={colors.lime} />
          <Path d="M82 45 L94 41 L91 49 Z M82 49 L93 55 L84 56 Z" fill={colors.lime} />
        </G>
      );
    case 'gear_visor':
      return (
        <G>
          <Path d="M17 43 Q50 31 83 43 L83 49 Q50 37 17 49 Z" fill={g.visor} />
          <Path d="M20 48 Q50 64 80 48 Q50 54 20 48 Z" fill={g.visorShade} />
        </G>
      );
    case 'gear_bandana':
      return (
        <G>
          <Path d="M17 47 C18 26 33 16 50 16 C67 16 82 26 83 47 Q50 35 17 47 Z" fill={g.bandana} />
          <Path d="M80 36 L95 31 L91 41 Z M81 41 L94 48 L85 50 Z" fill={g.bandana} />
          {[
            [32, 30],
            [44, 23],
            [57, 24],
            [69, 31],
            [40, 37],
            [60, 37],
          ].map(([x, y]) => (
            <Circle key={`${x}${y}`} cx={x} cy={y} r={1.8} fill={g.bandanaDot} />
          ))}
        </G>
      );
    case 'gear_phones':
      // headphones over the hair: a band across the top, warm cups at the sides
      return (
        <G>
          <Path d="M17 54 C17 27 33 16 50 16 C67 16 83 27 83 54" fill="none" stroke={g.phonesBand} strokeWidth={5} strokeLinecap="round" />
          <Rect x={9} y={47} width={13} height={20} rx={6} fill={g.phonesCup} stroke={g.phonesBand} strokeWidth={1.4} />
          <Rect x={78} y={47} width={13} height={20} rx={6} fill={g.phonesCup} stroke={g.phonesBand} strokeWidth={1.4} />
        </G>
      );
    case 'gear_beanie':
      return (
        <G>
          <Path d="M18 46 C18 24 34 14 50 14 C66 14 82 24 82 46 Z" fill={g.beanie} />
          <Path d="M30 20 L30 44 M40 16 L40 44 M50 15 L50 44 M60 16 L60 44 M70 20 L70 44" stroke={g.beanieCuff} strokeWidth={1.2} opacity={0.6} />
          <Rect x={16} y={39} width={68} height={10} rx={5} fill={g.beanieCuff} />
          <Circle cx={50} cy={12} r={6.5} fill={g.beaniePom} />
        </G>
      );
    case 'gear_crown':
      // lime: earned, first in your Ladder group for a month
      return (
        <G>
          <Path d="M30 30 L34 13 L42 23 L50 9 L58 23 L66 13 L70 30 Z" fill={colors.lime} stroke={colors.ink} strokeOpacity={0.35} strokeWidth={1.4} strokeLinejoin="round" />
          <Circle cx={50} cy={22} r={2.2} fill={colors.ink} opacity={0.5} />
        </G>
      );
    case 'gear_bucket':
      return (
        <G>
          <Path d="M24 41 C25 22 37 14 50 14 C63 14 75 22 76 41 Z" fill={g.bucket} />
          <Path d="M10 47 Q50 30 90 47 Q93 54 86 55 Q50 40 14 55 Q7 54 10 47 Z" fill={g.bucketShade} />
          <Path d="M25 38 Q50 32 75 38" stroke={g.bucketShade} strokeWidth={2} fill="none" />
        </G>
      );
    default:
      return null;
  }
}

/** sunglasses over the eyes */
function Shades() {
  const g = cosmetics.gear;
  return (
    <G>
      <Rect x={27} y={47.5} width={20} height={14} rx={6} fill={g.lens} />
      <Rect x={53} y={47.5} width={20} height={14} rx={6} fill={g.lens} />
      <Path d="M47 52 Q50 50 53 52" stroke={g.lens} strokeWidth={2.6} fill="none" />
      <Path d="M30 51 L36 51 M56 51 L62 51" stroke={g.lensShine} strokeWidth={2} strokeLinecap="round" />
    </G>
  );
}

/** big round eyes with a catchlight; with `eyes` they blink and look around */
function Eyes({ eyes }: { eyes?: ArtProps['eyes'] }) {
  return (
    <G>
      <Eye cx={50 - EYE.dx} eyes={eyes} />
      <Eye cx={50 + EYE.dx} eyes={eyes} />
    </G>
  );
}

function Eye({ cx, eyes }: { cx: number; eyes?: ArtProps['eyes'] }) {
  const white = useAnimatedProps(() => ({ ry: EYE.ry * (eyes ? eyes.open.value : 1) }));
  const pupil = useAnimatedProps(() => ({
    cx: cx + 1.5 + (eyes ? eyes.look.value * 2.6 : 0),
    ry: EYE.pupil * (eyes ? eyes.open.value : 1),
  }));
  const shine = useAnimatedProps(() => ({
    cx: cx + 3 + (eyes ? eyes.look.value * 2.6 : 0),
    opacity: eyes ? (eyes.open.value > 0.5 ? 1 : 0) : 1,
  }));
  return (
    <G>
      <AnimatedEllipse cx={cx} cy={EYE.y} rx={EYE.rx} ry={EYE.ry} fill={colors.white} animatedProps={white} />
      <AnimatedEllipse cx={cx + 1.5} cy={EYE.y + 1.5} rx={EYE.pupil} ry={EYE.pupil} fill={colors.ink} animatedProps={pupil} />
      <AnimatedCircle cx={cx + 3} cy={EYE.y - 0.5} r={1.4} fill={colors.white} animatedProps={shine} />
    </G>
  );
}

/** crossed-out eyes: Baller is dizzy */
function DizzyEyes() {
  return (
    <G stroke={colors.ink} strokeWidth={2.8} strokeLinecap="round">
      {[50 - EYE.dx, 50 + EYE.dx].map((x) => (
        <Path key={x} d={`M${x - 5} ${EYE.y - 5} L${x + 5} ${EYE.y + 5} M${x + 5} ${EYE.y - 5} L${x - 5} ${EYE.y + 5}`} />
      ))}
    </G>
  );
}

/** a small racket behind the ball, in the kit's colours; `raised` swings it up from the grip */
function Racket({ frame, grip, raised }: { frame: string; grip: string; raised?: boolean }) {
  // both poses are always drawn with fixed transforms and only their opacity changes: react-native-svg on iOS stops
  // drawing a group whose transform changes after the first render
  return (
    <G>
      <G opacity={raised ? 0 : 1}>{racketHead(frame, grip, 28)}</G>
      <G opacity={raised ? 1 : 0} transform="translate(0 -16)">
        {racketHead(frame, grip, 14)}
      </G>
    </G>
  );
}

function racketHead(frame: string, grip: string, angle: number): ReactNode {
  // held behind the ball: the handle disappears into it, the head stands up at the right
  return (
    <G transform={`rotate(${angle} 86 36)`}>
      <Path d="M86 50 L86 70" stroke={grip} strokeWidth={5} strokeLinecap="round" />
      <Path d="M83 48 L86 52 L89 48" fill="none" stroke={frame} strokeWidth={2.4} strokeLinejoin="round" />
      <Ellipse cx={86} cy={34} rx={10} ry={13.5} fill={colors.white} fillOpacity={0.12} stroke={frame} strokeWidth={3} />
      <Path d="M81 24 L81 44 M86 21 L86 47 M91 24 L91 44 M77 29 L95 29 M76 34 L96 34 M77 39 L95 39" stroke={frame} strokeWidth={0.9} opacity={0.55} />
    </G>
  );
}

/** hair that falls behind the ball */
function HairBack({ style, fill, hatOn }: { style: HairStyle; fill: string; hatOn?: boolean }) {
  if (style === 'long') return <Path d="M14 74 C8 38 28 17 50 17 C72 17 92 38 86 74 C80 78 74 76 72 70 L28 70 C26 76 20 78 14 74 Z" fill={fill} />;
  if (style === 'bob') return <Path d="M15 62 C12 34 30 18 50 18 C70 18 88 34 85 62 C80 66 74 64 73 60 L27 60 C26 64 20 66 15 62 Z" fill={fill} />;
  if (style === 'ponytail') return <Path d="M76 32 C92 34 96 54 88 68 C86 56 82 46 72 40 Z" fill={fill} />;
  // a bun goes under a hat
  if (style === 'bun') return hatOn ? null : <Circle cx={50} cy={17} r={10} fill={fill} />;
  return null;
}

/** hair over the top of the ball */
function HairFront({ style, fill }: { style: HairStyle; fill: string }) {
  switch (style) {
    case 'short':
      return <Path d="M17 50 C18 30 32 20 50 20 C68 20 82 30 83 50 C75 39 64 33 52 34 C46 30 36 31 30 36 C25 39 20 44 17 50 Z" fill={fill} />;
    case 'buzz':
      return <Path d="M19 44 C23 29 35 22 50 22 C65 22 77 29 81 44 C73 36 62 32 50 32 C38 32 27 36 19 44 Z" fill={fill} opacity={0.85} />;
    case 'curly':
      return (
        <G fill={fill}>
          {[
            [24, 38, 9],
            [32, 28, 10],
            [43, 23, 10],
            [56, 23, 10],
            [67, 28, 10],
            [76, 38, 9],
          ].map(([x, y, r]) => (
            <Circle key={x} cx={x} cy={y} r={r} />
          ))}
        </G>
      );
    case 'long':
    case 'bob':
      return <Path d="M17 52 C17 31 32 20 52 20 C70 20 84 31 83 50 C74 38 62 33 48 34 C36 36 24 42 17 52 Z" fill={fill} />;
    case 'ponytail':
    case 'bun':
      return <Path d="M17 48 C19 30 33 21 50 21 C67 21 81 30 83 47 C75 38 63 33 50 33 C37 33 25 38 17 48 Z" fill={fill} />;
    case 'bald':
      // a little at the sides only
      return (
        <G fill={fill}>
          <Path d="M17 58 C15 50 16 44 19 39 C21 45 21 52 20 59 Z" />
          <Path d="M83 58 C85 50 84 44 81 39 C79 45 79 52 80 59 Z" />
        </G>
      );
  }
}

/** a roster player without an account: a faceless ball with the initials, never a face */
export function AvatarSilhouette({ initials, size, bg = null }: { initials: string; size: number; bg?: string | null }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="np-sil" cx="36%" cy="30%" r="72%">
          <Stop offset="0" stopColor={colors.white} stopOpacity={0.25} />
          <Stop offset="0.4" stopColor={colors.white} stopOpacity={0} />
          <Stop offset="1" stopColor={colors.ink} stopOpacity={0.3} />
        </RadialGradient>
      </Defs>
      {bg ? <Rect x={0} y={0} width={100} height={100} fill={bg} /> : null}
      <Ellipse cx={50} cy={95} rx={24} ry={3.5} fill={colors.ink} opacity={0.22} />
      <Circle cx={BALL.cx} cy={BALL.cy} r={BALL.r} fill={cosmetics.avatar.silhouette} />
      <Circle cx={BALL.cx} cy={BALL.cy} r={BALL.r} fill="url(#np-sil)" />
      <SvgText x={50} y={63} textAnchor="middle" fontSize={22} fontFamily={fonts.displayHeavy} fill={colors.paper}>
        {initials}
      </SvgText>
    </Svg>
  );
}
