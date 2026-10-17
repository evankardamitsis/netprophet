import { useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, cosmetics } from '../theme';

/**
 * The backgrounds (Εμφάνιση) are courts you stand on (founder, 17 Oct: "more realistic, much better 3D"): each one is a
 * scene seen from behind the near baseline through one camera, so the lines thin and close in with distance, the net
 * stands across the middle, a wall, hedge, stands or curtain closes the back, and sky, floodlights or a ceiling sit above.
 * One light from the top left, haze towards the horizon. `k` thins the detail on thumbnails (about .45).
 */
export const BG_KEYS = ['bg_clay', 'bg_hard', 'bg_grass', 'bg_night', 'bg_indoor', 'bg_center'] as const;

/**
 * `stage`: for a Baller standing on it (a pool of light where it stands). With no background it is the ink stage:
 * the near half of a court in faint lines and a spotlight. `scrim` darkens it under text.
 */
export function CardBackground({ bg, k = 1, scrim = false, stage = false }: { bg: string | null; k?: number; scrim?: boolean; stage?: boolean }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  // gradient ids are per drawing: several backgrounds share a screen (the dressing room's thumbnails)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { w, h } = box;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {(bg || stage) && w > 0 ? (
        <Svg width={w} height={h}>
          {bg ? <Scene bg={bg} cam={camera(w, h)} k={k} id={uid} /> : <StageFloor w={w} h={h} id={uid} />}
          {stage ? <Pool w={w} h={h} id={uid} /> : null}
          <Defs>
            <RadialGradient id={`li${uid}`} cx="22%" cy="12%" r="75%">
              <Stop offset="0" stopColor={colors.white} stopOpacity={0.12} />
              <Stop offset="1" stopColor={colors.white} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`vi${uid}`} cx="50%" cy="45%" r="75%">
              <Stop offset="0.55" stopColor={colors.ink} stopOpacity={0} />
              <Stop offset="1" stopColor={colors.ink} stopOpacity={0.42} />
            </RadialGradient>
            {scrim ? (
              <LinearGradient id={`sc${uid}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.ink} stopOpacity={0.1} />
                <Stop offset="1" stopColor={colors.ink} stopOpacity={0.5} />
              </LinearGradient>
            ) : null}
          </Defs>
          <Rect x={0} y={0} width={w} height={h} fill={`url(#vi${uid})`} />
          <Rect x={0} y={0} width={w} height={h} fill={`url(#li${uid})`} />
          {scrim ? <Rect x={0} y={0} width={w} height={h} fill={`url(#sc${uid})`} /> : null}
        </Svg>
      ) : null}
    </View>
  );
}

/**
 * The camera: on a court whose doubles sidelines are X = ±1 (5.5 m), looking down the court from above and behind the
 * near baseline. A point (X, z) on the ground lands at x = cx + f·X/z, y = horizon + f·eye/z; something H tall at
 * depth z rises f·H/z. Depths: the picture's bottom edge is z = 1.6, the near baseline 2, the net a half court (2.16)
 * further, the far baseline another, the back a little behind it.
 */
interface Cam {
  w: number;
  h: number;
  cx: number;
  hz: number;
  f: number;
  eye: number;
}
const Z_EDGE = 1.6;
const Z_BASE = 2;
const HALF = 2.16;
const Z_NET = Z_BASE + HALF;
const Z_FAR = Z_BASE + 2 * HALF;
const Z_BACK = Z_FAR + 1.1;
/** the service line, 6.4 m from the net */
const SERVICE = 1.16;
const SINGLES = 0.75;
const LINE = 0.035;
const NET_H = 0.17;
const POST_X = 1.12;

function camera(w: number, h: number): Cam {
  const hz = h * 0.4;
  const nearHalf = w * 0.72;
  return { w, h, cx: w / 2, hz, f: nearHalf * Z_EDGE, eye: (h - hz) / nearHalf };
}
const px = (c: Cam, X: number, z: number) => c.cx + (c.f * X) / z;
const py = (c: Cam, z: number, H = 0) => c.hz + (c.f * (c.eye - H)) / z;
const pt = (c: Cam, X: number, z: number, H = 0) => `${px(c, X, z).toFixed(1)} ${py(c, z, H).toFixed(1)}`;
/** a patch of ground (X1..X2 by z1..z2) as a path */
const ground = (c: Cam, X1: number, X2: number, z1: number, z2: number) =>
  `M${pt(c, X1, z1)} L${pt(c, X2, z1)} L${pt(c, X2, z2)} L${pt(c, X1, z2)} Z`;

/** the court lines as painted strips, so they thin with distance */
function CourtLines({ c, color, opacity = 0.9 }: { c: Cam; color: string; opacity?: number }) {
  const l = LINE / 2;
  const strips = [
    ground(c, -1, 1, Z_BASE - l, Z_BASE + l),
    ground(c, -1, 1, Z_FAR - l, Z_FAR + l),
    ground(c, -1 - l, -1 + l, Z_BASE, Z_FAR),
    ground(c, 1 - l, 1 + l, Z_BASE, Z_FAR),
    ground(c, -SINGLES - l, -SINGLES + l, Z_BASE, Z_FAR),
    ground(c, SINGLES - l, SINGLES + l, Z_BASE, Z_FAR),
    ground(c, -SINGLES, SINGLES, Z_NET - SERVICE - l, Z_NET - SERVICE + l),
    ground(c, -SINGLES, SINGLES, Z_NET + SERVICE - l, Z_NET + SERVICE + l),
    ground(c, -l, l, Z_NET - SERVICE, Z_NET + SERVICE),
    ground(c, -l, l, Z_BASE, Z_BASE + 0.06),
    ground(c, -l, l, Z_FAR - 0.06, Z_FAR),
  ];
  return <Path d={strips.join(' ')} fill={color} fillOpacity={opacity} />;
}

/** the net across the middle: its shadow, a see-through mesh, the white tape and the posts */
function Net({ c, id }: { c: Cam; id: string }) {
  const z = Z_NET;
  const left = px(c, -POST_X, z);
  const right = px(c, POST_X, z);
  const top = py(c, z, NET_H);
  const sag = py(c, z, NET_H * 0.85);
  const foot = py(c, z);
  const tape = Math.max(0.8, (c.f * 0.018) / z);
  const post = Math.max(1.2, (c.f * 0.03) / z);
  const drop = (foot - top) * 0.25;
  return (
    <G>
      <Defs>
        <LinearGradient id={`nm${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.ink} stopOpacity={0.62} />
          <Stop offset="1" stopColor={colors.ink} stopOpacity={0.38} />
        </LinearGradient>
      </Defs>
      <Path d={`M${left} ${foot} L${right} ${foot} L${right + drop * 2} ${foot + drop} L${left + drop * 2} ${foot + drop} Z`} fill={colors.ink} opacity={0.2} />
      <Path d={`M${left} ${top} Q${c.cx} ${sag} ${right} ${top} L${right} ${foot} L${left} ${foot} Z`} fill={`url(#nm${id})`} />
      <Path d={`M${left} ${top} Q${c.cx} ${sag} ${right} ${top}`} stroke={colors.white} strokeWidth={tape} fill="none" />
      <Rect x={left - post / 2} y={top - post * 0.4} width={post} height={foot - top + post * 0.4} rx={post / 2} fill={colors.ink} opacity={0.9} />
      <Rect x={right - post / 2} y={top - post * 0.4} width={post} height={foot - top + post * 0.4} rx={post / 2} fill={colors.ink} opacity={0.9} />
    </G>
  );
}

/** a wall across the back from the ground to height H, darker at its foot, a lighter cap along the top */
function BackWall({ c, H, color, cap, id }: { c: Cam; H: number; color: string; cap: string; id: string }) {
  const foot = py(c, Z_BACK);
  const top = py(c, Z_BACK, H);
  const capH = Math.max(1, (c.f * 0.04) / Z_BACK);
  return (
    <G>
      <Defs>
        <LinearGradient id={`wa${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} />
          <Stop offset="1" stopColor={colors.ink} stopOpacity={0.9} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={top} width={c.w} height={foot - top + 1} fill={`url(#wa${id})`} />
      <Rect x={0} y={top} width={c.w} height={capH} fill={cap} />
    </G>
  );
}

/** the ground everywhere, lighter towards the back */
function Floor({ c, near, far, id }: { c: Cam; near: string; far: string; id: string }) {
  const y = py(c, Z_BACK);
  return (
    <>
      <Defs>
        <LinearGradient id={`fl${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={far} />
          <Stop offset="1" stopColor={near} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={y} width={c.w} height={c.h - y} fill={`url(#fl${id})`} />
    </>
  );
}

/** a sky from its top colour into a haze at the horizon */
function Sky({ c, top, haze, id }: { c: Cam; top: string; haze: string; id: string }) {
  return (
    <>
      <Defs>
        <LinearGradient id={`sk${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={top} />
          <Stop offset="1" stopColor={haze} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={c.w} height={py(c, Z_BACK) + 1} fill={`url(#sk${id})`} />
      <Defs>
        <RadialGradient id={`su${id}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.white} stopOpacity={0.55} />
          <Stop offset="1" stopColor={colors.white} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={c.w * 0.14} cy={c.h * 0.06} r={c.w * 0.3} fill={`url(#su${id})`} />
      {CLOUDS.map(([x, y, s], i) => (
        <G key={i} opacity={0.5}>
          <Ellipse cx={x * c.w} cy={y * c.hz} rx={s * c.w} ry={s * c.w * 0.28} fill={colors.white} />
          <Ellipse cx={x * c.w + s * c.w * 0.45} cy={y * c.hz - s * c.w * 0.12} rx={s * c.w * 0.55} ry={s * c.w * 0.26} fill={colors.white} />
        </G>
      ))}
    </>
  );
}

/** a few soft clouds: [x, y as a share of the sky, size] */
const CLOUDS: [number, number, number][] = [
  [0.62, 0.32, 0.14],
  [0.24, 0.55, 0.1],
  [0.86, 0.62, 0.08],
];

/** the air between you and the back: a pale band at the horizon fading both ways */
function Haze({ c, id, strength = 0.2 }: { c: Cam; id: string; strength?: number }) {
  const y = py(c, Z_BACK);
  const span = c.h * 0.22;
  return (
    <>
      <Defs>
        <LinearGradient id={`hz${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.white} stopOpacity={0} />
          <Stop offset="0.5" stopColor={colors.white} stopOpacity={strength} />
          <Stop offset="1" stopColor={colors.white} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={y - span / 2} width={c.w} height={span} fill={`url(#hz${id})`} />
    </>
  );
}

/** a soft sheen on the surface where the light falls */
function Sheen({ c, id, opacity = 0.2, color = colors.white }: { c: Cam; id: string; opacity?: number; color?: string }) {
  return (
    <>
      <Defs>
        <RadialGradient id={`sh${id}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={px(c, -0.35, Z_NET - 0.6)} cy={py(c, Z_NET - 0.6)} rx={c.w * 0.5} ry={(c.h - c.hz) * 0.22} fill={`url(#sh${id})`} />
    </>
  );
}

function Scene({ bg, cam: c, k, id }: { bg: string; cam: Cam; k: number; id: string }) {
  const s = cosmetics.bg;
  const rich = k > 0.6;
  switch (bg) {
    case 'bg_clay': {
      // grain: rows of fine marks whose spacing opens up towards you
      const grain: string[] = [];
      const rows = rich ? 9 : 5;
      const n = rich ? 16 : 8;
      for (let r = 0; r < rows; r++) {
        const z = Z_EDGE + 0.15 + ((Z_FAR - Z_EDGE) * r ** 1.6) / rows ** 1.6;
        const rr = Math.max(0.4, (c.f * 0.012) / z);
        for (let i = 0; i < n; i++) {
          const X = -1.5 + (3 * (i + ((r * 7) % 3) / 3)) / n;
          const x = px(c, X, z);
          const y = py(c, z);
          grain.push(`M${x - rr} ${y} a${rr} ${rr * 0.5} 0 1 0 ${rr * 2} 0 a${rr} ${rr * 0.5} 0 1 0 ${-rr * 2} 0`);
        }
      }
      return (
        <>
          <Sky c={c} top={s.skyTop} haze={s.skyHaze} id={id} />
          <BackWall c={c} H={0.62} color={s.windscreen} cap={s.windscreenTop} id={id} />
          <Floor c={c} near={s.clayDark} far={s.clayLight} id={id} />
          <Path d={grain.join(' ')} fill={s.clayDark} fillOpacity={0.35} />
          <Sheen c={c} id={id} opacity={0.16} />
          <CourtLines c={c} color={colors.paper} opacity={0.82} />
          <Net c={c} id={id} />
          <Haze c={c} id={id} />
        </>
      );
    }
    case 'bg_hard':
      return (
        <>
          <Sky c={c} top={s.skyTop} haze={s.skyHaze} id={id} />
          <BackWall c={c} H={0.55} color={s.wallBlue} cap={s.hardLight} id={id} />
          <Floor c={c} near={s.hardRunoffDark} far={s.hardRunoff} id={id} />
          <Defs>
            <LinearGradient id={`hc${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={s.hardLight} />
              <Stop offset="1" stopColor={s.hardDark} />
            </LinearGradient>
          </Defs>
          <Path d={ground(c, -1.18, 1.18, Z_EDGE, Z_FAR + 0.5)} fill={`url(#hc${id})`} />
          <Sheen c={c} id={id} opacity={0.26} />
          <CourtLines c={c} color={colors.white} />
          <Net c={c} id={id} />
          <Haze c={c} id={id} />
        </>
      );
    case 'bg_grass': {
      // mown stripes across the court, and the worn patches behind the baselines
      const bands: string[] = [];
      const n = rich ? 12 : 8;
      for (let i = 0; i < n; i += 2) {
        const z1 = Z_EDGE + ((Z_BACK - Z_EDGE) * i) / n;
        const z2 = Z_EDGE + ((Z_BACK - Z_EDGE) * (i + 1)) / n;
        bands.push(ground(c, -3, 3, z1, z2));
      }
      return (
        <>
          <Sky c={c} top={s.skyTop} haze={s.skyHaze} id={id} />
          <BackWall c={c} H={0.7} color={s.hedge} cap={s.hedgeLight} id={id} />
          <Floor c={c} near={s.grassDark} far={s.grassLight} id={id} />
          <Path d={bands.join(' ')} fill={colors.white} fillOpacity={0.07} />
          <Path d={ground(c, -0.55, 0.55, Z_BASE - 0.35, Z_BASE + 0.3)} fill={s.grassWorn} fillOpacity={0.45} />
          <Path d={ground(c, -0.45, 0.45, Z_FAR - 0.3, Z_FAR + 0.3)} fill={s.grassWorn} fillOpacity={0.35} />
          <Sheen c={c} id={id} opacity={0.12} />
          <CourtLines c={c} color={colors.white} />
          <Net c={c} id={id} />
          <Haze c={c} id={id} />
        </>
      );
    }
    case 'bg_night': {
      const stars = rich ? 14 : 6;
      return (
        <>
          <Defs>
            <LinearGradient id={`ns${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={s.nightSky} />
              <Stop offset="1" stopColor={s.nightMid} />
            </LinearGradient>
            <RadialGradient id={`bl${id}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={s.lamp} stopOpacity={1} />
              <Stop offset="0.16" stopColor={s.lamp} stopOpacity={0.75} />
              <Stop offset="0.45" stopColor={s.lamp} stopOpacity={0.14} />
              <Stop offset="1" stopColor={s.lamp} stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id={`cn${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={s.lamp} stopOpacity={0.2} />
              <Stop offset="1" stopColor={s.lamp} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={c.w} height={py(c, Z_BACK) + 1} fill={`url(#ns${id})`} />
          {Array.from({ length: stars }, (_, i) => (
            <Circle key={i} cx={((i * 37) % 100) * (c.w / 100)} cy={((i * 53) % 40) * (c.hz / 100)} r={Math.max(0.6, c.w / 260)} fill={colors.white} opacity={0.35 + (i % 3) * 0.2} />
          ))}
          <BackWall c={c} H={0.5} color={s.wallBlue} cap={s.nightMid} id={id} />
          <Floor c={c} near={s.nightFloorDark} far={s.nightFloor} id={id} />
          {[-1.6, 1.6].map((X) => {
            const base = py(c, Z_BACK);
            const head = py(c, Z_BACK, 2.4);
            const x = px(c, X, Z_BACK);
            const pole = Math.max(1.5, c.w / 120);
            return (
              <G key={X}>
                <Path d={`M${x} ${head} L${px(c, X * 0.1, Z_BASE)} ${c.h} L${px(c, X * 0.7, Z_BASE)} ${c.h} Z`} fill={`url(#cn${id})`} />
                <Rect x={x - pole / 2} y={head} width={pole} height={base - head} fill={s.pole} />
                <Circle cx={x} cy={head} r={c.w * 0.2} fill={`url(#bl${id})`} />
              </G>
            );
          })}
          <Sheen c={c} id={id} opacity={0.3} color={s.lamp} />
          <CourtLines c={c} color={colors.white} />
          <Net c={c} id={id} />
          <Haze c={c} id={id} strength={0.08} />
        </>
      );
    }
    case 'bg_indoor': {
      // a hall: a ceiling with rows of lights, a curtain at the back, a wooden floor in boards that run to the back
      const ceilH = 1.5;
      const ceil = (z: number) => c.hz + (c.f * (c.eye - ceilH)) / z;
      const lights: string[] = [];
      const rows = rich ? 5 : 3;
      for (let r = 0; r < rows; r++) {
        const z1 = Z_BASE + ((Z_BACK - Z_BASE) * r) / rows;
        const z2 = z1 + 0.35;
        for (const X of [-0.7, 0, 0.7]) {
          lights.push(`M${px(c, X - 0.18, z1)} ${ceil(z1)} L${px(c, X + 0.18, z1)} ${ceil(z1)} L${px(c, X + 0.18, z2)} ${ceil(z2)} L${px(c, X - 0.18, z2)} ${ceil(z2)} Z`);
        }
      }
      const boards: string[] = [];
      const n = rich ? 22 : 12;
      for (let i = 0; i <= n; i++) {
        const X = -2.2 + (4.4 * i) / n;
        boards.push(`M${pt(c, X, Z_EDGE)} L${pt(c, X, Z_BACK)}`);
      }
      return (
        <>
          <Rect x={0} y={0} width={c.w} height={py(c, Z_BACK) + 1} fill={s.ceiling} />
          <Path d={lights.join(' ')} fill={s.ceilingLight} fillOpacity={0.9} />
          <BackWall c={c} H={ceilH} color={s.curtain} cap={s.curtain} id={id} />
          <Floor c={c} near={s.woodDark} far={s.woodLight} id={id} />
          <Path d={boards.join(' ')} stroke={s.woodDark} strokeOpacity={0.35} strokeWidth={Math.max(0.5, c.w / 400)} />
          {/* the lights again, softly, on the polished floor */}
          {[-0.7, 0, 0.7].map((X) => (
            <Ellipse key={X} cx={px(c, X, Z_NET)} cy={py(c, Z_NET + 0.8)} rx={c.w * 0.06} ry={c.h * 0.05} fill={s.ceilingLight} opacity={0.14} />
          ))}
          <Sheen c={c} id={id} opacity={0.18} color={s.ceilingLight} />
          <CourtLines c={c} color={colors.white} opacity={0.85} />
          <Net c={c} id={id} />
          <Haze c={c} id={id} strength={0.1} />
        </>
      );
    }
    case 'bg_center': {
      // the stadium: tiers of people rising behind the court under an evening sky, grass below
      const tiers = rich ? 6 : 4;
      const per = rich ? 30 : 16;
      const foot = py(c, Z_BACK, 0.35);
      const top = c.h * 0.1;
      const crowd: { x: number; y: number; r: number; color: string }[] = [];
      for (let t = 0; t < tiers; t++) {
        const y = foot - ((foot - top) * (t + 0.5)) / tiers;
        for (let i = 0; i < per; i++) {
          const j = ((i * 13 + t * 29) % 7) / 7;
          crowd.push({
            x: ((i + (t % 2) * 0.5 + (j - 0.5) * 0.4) * c.w) / per,
            y: y + (j - 0.5) * ((foot - top) / tiers) * 0.3,
            r: Math.max(0.7, (c.w / per) * (0.24 + j * 0.1)),
            color: cosmetics.crowd[(i * 7 + t * 3 + Math.floor(j * 5)) % cosmetics.crowd.length]!,
          });
        }
      }
      return (
        <>
          <Rect x={0} y={0} width={c.w} height={top + 1} fill={s.centerSky} />
          <Defs>
            <LinearGradient id={`st${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={s.stands} />
              <Stop offset="1" stopColor={s.standsLight} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={top} width={c.w} height={foot - top} fill={`url(#st${id})`} />
          {Array.from({ length: tiers }, (_, t) => (
            <Rect key={t} x={0} y={foot - ((foot - top) * t) / tiers - 1} width={c.w} height={Math.max(1, c.h / 260)} fill={colors.ink} opacity={0.45} />
          ))}
          {crowd.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.color} opacity={0.72} />
          ))}
          <BackWall c={c} H={0.35} color={s.windscreen} cap={s.windscreenTop} id={id} />
          <Floor c={c} near={s.grassDark} far={s.centerGrass} id={id} />
          <Path d={ground(c, -0.5, 0.5, Z_BASE - 0.3, Z_BASE + 0.25)} fill={s.grassWorn} fillOpacity={0.4} />
          <Sheen c={c} id={id} opacity={0.14} />
          <CourtLines c={c} color={colors.white} />
          <Net c={c} id={id} />
          <Haze c={c} id={id} strength={0.1} />
        </>
      );
    }
    default:
      return null;
  }
}

/** no background: the ink stage, the near half of a court in faint lines and a spotlight from the top */
function StageFloor({ w, h, id }: { w: number; h: number; id: string }) {
  const horizon = h * 0.52;
  const cx = w / 2;
  const farHalf = w * 0.24;
  const nearHalf = w * 0.78;
  const at = (t: number) => ({ y: horizon + (h - horizon) * t, half: farHalf + (nearHalf - farHalf) * t });
  const service = at(0.42);
  const line = (t: number) => {
    const p = at(t);
    return `M${cx - p.half} ${p.y} L${cx + p.half} ${p.y}`;
  };
  return (
    <>
      <Defs>
        <LinearGradient id={`fo${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.ink} stopOpacity={0.05} />
          <Stop offset="1" stopColor={colors.ink} stopOpacity={0.45} />
        </LinearGradient>
        <RadialGradient id={`sp${id}`} cx="50%" cy="0%" r="80%" fx="50%" fy="0%">
          <Stop offset="0" stopColor={colors.white} stopOpacity={0.26} />
          <Stop offset="0.55" stopColor={colors.white} stopOpacity={0.05} />
          <Stop offset="1" stopColor={colors.white} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={horizon} width={w} height={h - horizon} fill={`url(#fo${id})`} />
      <G stroke={colors.paper} strokeOpacity={0.22} strokeWidth={2} fill="none">
        <Path d={line(0)} />
        <Path d={line(0.42)} />
        <Path d={`M${cx - farHalf} ${horizon} L${cx - nearHalf} ${h}`} />
        <Path d={`M${cx + farHalf} ${horizon} L${cx + nearHalf} ${h}`} />
        <Path d={`M${cx} ${service.y} L${cx} ${horizon}`} />
      </G>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#sp${id})`} />
    </>
  );
}

/** where Baller stands: a soft pool of light on the ground */
function Pool({ w, h, id }: { w: number; h: number; id: string }) {
  return (
    <>
      <Defs>
        <RadialGradient id={`po${id}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.white} stopOpacity={0.2} />
          <Stop offset="1" stopColor={colors.white} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={w / 2} cy={h * 0.9} rx={w * 0.34} ry={h * 0.08} fill={`url(#po${id})`} />
    </>
  );
}
