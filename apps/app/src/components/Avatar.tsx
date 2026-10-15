import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Circle, ClipPath, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop, Svg, Text as SvgText } from 'react-native-svg';
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

interface ArtProps {
  look: AvatarLook;
  size: number;
  kit?: string;
  bg?: string | null;
  /** an open, cheering mouth (the win jump) */
  cheer?: boolean;
  /** 1 open, 0 shut (blink); -1..1 where the pupils look */
  eyes?: { open: SharedValue<number>; look: SharedValue<number> };
}

/** the still avatar: lists, cards, the picker */
export function Avatar(props: Omit<ArtProps, 'eyes' | 'cheer'>) {
  return <BallArt {...props} />;
}

/**
 * The avatar that lives (Εγώ, the picker's big preview): it bobs, blinks and looks around; a new `jump` makes it
 * celebrate. Idle motion stays here, never on the 40px faces in lists.
 */
export function LiveAvatar({ jump = 0, ...props }: Omit<ArtProps, 'eyes' | 'cheer'> & { jump?: number }) {
  const reduced = useReducedMotion();
  const bob = useSharedValue(0);
  const hop = useSharedValue(0);
  const open = useSharedValue(1);
  const look = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    bob.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }), -1, true);
    open.value = withRepeat(withSequence(withDelay(3200, withTiming(0.08, { duration: 70 })), withTiming(1, { duration: 90 })), -1);
    look.value = withRepeat(
      withSequence(
        withDelay(1400, withTiming(1, { duration: 260 })),
        withDelay(900, withTiming(-1, { duration: 360 })),
        withDelay(800, withTiming(0, { duration: 260 })),
      ),
      -1,
    );
  }, [reduced, bob, open, look]);

  useEffect(() => {
    if (!jump || reduced) return;
    hop.value = withSequence(withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 420, easing: Easing.bounce }));
  }, [jump, reduced, hop]);

  const size = props.size;
  const style = useAnimatedStyle(() => {
    const up = bob.value * 0.045 + hop.value * 0.32;
    // a squash at the bottom of the bob, a stretch in the air
    const stretch = hop.value > 0.05 ? 1 + hop.value * 0.1 : 1 - (1 - bob.value) * 0.03;
    return {
      transform: [{ translateY: -up * size }, { scaleY: stretch }, { scaleX: 2 - stretch }, { rotate: `${-hop.value * 8}deg` }],
    };
  });

  return (
    <Animated.View style={style}>
      <BallArt {...props} eyes={{ open, look }} cheer={jump > 0 && !reduced} />
    </Animated.View>
  );
}

function BallArt({ look, size, kit = 'kit_green', bg = null, cheer, eyes }: ArtProps) {
  const skin = cosmetics.avatar.skin[look.skin] ?? cosmetics.avatar.skin[1];
  const hair = cosmetics.avatar.hair[look.hairColour];
  const k = cosmetics.kit[kit as KitKey] ?? cosmetics.kit.kit_green;
  const collar = kit === 'kit_white' ? colors.slate : colors.paper;
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
      {size >= RACKET_MIN ? <Racket frame={k.racket} grip={k.shirt} /> : null}
      <HairBack style={look.hair} fill={hair} />
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
      <Eyes eyes={eyes} />
      {look.glasses ? (
        <G>
          <Circle cx={50 - EYE.dx} cy={EYE.y} r={10} fill={colors.white} fillOpacity={0.12} stroke={colors.ink} strokeWidth={2.4} />
          <Circle cx={50 + EYE.dx} cy={EYE.y} r={10} fill={colors.white} fillOpacity={0.12} stroke={colors.ink} strokeWidth={2.4} />
          <Path d="M46 54 Q50 51.5 54 54" fill="none" stroke={colors.ink} strokeWidth={2.4} strokeLinecap="round" />
        </G>
      ) : null}
      <Ellipse cx={29} cy={67} rx={5} ry={3.4} fill={cosmetics.avatar.blush} opacity={0.4} />
      <Ellipse cx={71} cy={67} rx={5} ry={3.4} fill={cosmetics.avatar.blush} opacity={0.4} />
      {cheer ? (
        <Path d="M42 67 Q50 79 58 67 Z" fill={colors.ink} />
      ) : (
        <Path d="M43.5 68 Q50 73.5 56.5 68" fill="none" stroke={colors.ink} strokeWidth={2.8} strokeLinecap="round" />
      )}
    </Svg>
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

/** a small racket behind the ball, in the kit's colours */
function Racket({ frame, grip }: { frame: string; grip: string }) {
  // held behind the ball: the handle disappears into it, the head stands up at the right
  return (
    <G transform="rotate(28 86 36)">
      <Path d="M86 50 L86 70" stroke={grip} strokeWidth={5} strokeLinecap="round" />
      <Path d="M83 48 L86 52 L89 48" fill="none" stroke={frame} strokeWidth={2.4} strokeLinejoin="round" />
      <Ellipse cx={86} cy={34} rx={10} ry={13.5} fill={colors.white} fillOpacity={0.12} stroke={frame} strokeWidth={3} />
      <Path d="M81 24 L81 44 M86 21 L86 47 M91 24 L91 44 M77 29 L95 29 M76 34 L96 34 M77 39 L95 39" stroke={frame} strokeWidth={0.9} opacity={0.55} />
    </G>
  );
}

/** hair that falls behind the ball */
function HairBack({ style, fill }: { style: HairStyle; fill: string }) {
  if (style === 'long') return <Path d="M14 74 C8 38 28 17 50 17 C72 17 92 38 86 74 C80 78 74 76 72 70 L28 70 C26 76 20 78 14 74 Z" fill={fill} />;
  if (style === 'bob') return <Path d="M15 62 C12 34 30 18 50 18 C70 18 88 34 85 62 C80 66 74 64 73 60 L27 60 C26 64 20 66 15 62 Z" fill={fill} />;
  if (style === 'ponytail') return <Path d="M76 32 C92 34 96 54 88 68 C86 56 82 46 72 40 Z" fill={fill} />;
  if (style === 'bun') return <Circle cx={50} cy={17} r={10} fill={fill} />;
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
