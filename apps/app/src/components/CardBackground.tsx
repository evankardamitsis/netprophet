import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, cosmetics } from '../theme';

/**
 * The card background (Εμφάνιση), drawn in 2D from the prototype's `.bgl[data-b]`: a court colour, stripes or
 * dots, a dark fade towards the bottom so text stays readable, and the court lines. `k` scales the details
 * (1 on the Εγώ card, about .45 on a thumbnail). Gradients use bounding-box units, so one definition fits any size.
 */
export const BG_KEYS = ['bg_clay', 'bg_hard', 'bg_grass', 'bg_night', 'bg_indoor', 'bg_center'] as const;

function Fade({ id, to }: { id: string; to: number }) {
  return (
    <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0.25" stopColor={colors.ink} stopOpacity={0} />
      <Stop offset="1" stopColor={colors.ink} stopOpacity={to} />
    </LinearGradient>
  );
}

/**
 * `stage` (founder, 17 Oct: "remove that strange square and improve the bg"): for a Baller standing on it rather than
 * a card. No court outline; a court floor in perspective at the bottom, a spotlight from above and a glow where
 * Baller stands. With no background bought it is the ink stage with the same light.
 */
export function CardBackground({ bg, k = 1, scrim = false, stage = false }: { bg: string | null; k?: number; scrim?: boolean; stage?: boolean }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const { w, h } = box;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {(bg || stage) && w > 0 ? (
        <Svg width={w} height={h}>
          {bg ? <Layers bg={bg} w={w} h={h} k={k} court={!stage} /> : null}
          {stage ? <StageFloor w={w} h={h} /> : null}
          {/* the rendered look (14 Oct): light falls from the top left, the corners sink, as on the balls */}
          <Defs>
            <RadialGradient id="np-bg-light" cx="22%" cy="12%" r="75%">
              <Stop offset="0" stopColor={colors.white} stopOpacity={0.15} />
              <Stop offset="1" stopColor={colors.white} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="np-bg-vignette" cx="50%" cy="45%" r="75%">
              <Stop offset="0.55" stopColor={colors.ink} stopOpacity={0} />
              <Stop offset="1" stopColor={colors.ink} stopOpacity={0.38} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={w} height={h} fill="url(#np-bg-vignette)" />
          <Rect x={0} y={0} width={w} height={h} fill="url(#np-bg-light)" />
          {scrim ? (
            <>
              <Defs>
                <LinearGradient id="np-scrim" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.ink} stopOpacity={0.1} />
                  <Stop offset="1" stopColor={colors.ink} stopOpacity={0.5} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={w} height={h} fill="url(#np-scrim)" />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

/**
 * The Baller stage: the near half of a court seen from behind the baseline, lines converging to the back, a spotlight
 * from the top and a soft pool of light on the ground under Baller.
 */
function StageFloor({ w, h }: { w: number; h: number }) {
  const horizon = h * 0.52;
  const cx = w / 2;
  // the far baseline is narrow, the near one runs off the sides
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
        <LinearGradient id="np-floor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.ink} stopOpacity={0.05} />
          <Stop offset="1" stopColor={colors.ink} stopOpacity={0.45} />
        </LinearGradient>
        <RadialGradient id="np-spot" cx="50%" cy="0%" r="80%" fx="50%" fy="0%">
          <Stop offset="0" stopColor={colors.white} stopOpacity={0.26} />
          <Stop offset="0.55" stopColor={colors.white} stopOpacity={0.05} />
          <Stop offset="1" stopColor={colors.white} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="np-pool" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.white} stopOpacity={0.22} />
          <Stop offset="1" stopColor={colors.white} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={horizon} width={w} height={h - horizon} fill="url(#np-floor)" />
      <G stroke={colors.paper} strokeOpacity={0.22} strokeWidth={2} fill="none">
        <Path d={line(0)} />
        <Path d={line(0.42)} />
        <Path d={`M${cx - farHalf} ${horizon} L${cx - nearHalf} ${h}`} />
        <Path d={`M${cx + farHalf} ${horizon} L${cx + nearHalf} ${h}`} />
        <Path d={`M${cx} ${service.y} L${cx} ${horizon}`} />
      </G>
      <Rect x={0} y={0} width={w} height={h} fill="url(#np-spot)" />
      <Ellipse cx={cx} cy={h * 0.9} rx={w * 0.34} ry={h * 0.08} fill="url(#np-pool)" />
    </>
  );
}

/** the white lines of the court, inset from the card edge */
function Court({ w, h, k, top = 0.07, alpha = 0.34 }: { w: number; h: number; k: number; top?: number; alpha?: number }) {
  return (
    <Rect
      x={w * 0.09}
      y={h * top}
      width={w * 0.82}
      height={h * (1 - top - 0.07)}
      rx={3}
      fill="none"
      stroke={colors.paper}
      strokeOpacity={alpha}
      strokeWidth={2 * k}
    />
  );
}

function Stripes({ w, h, k, dir, size, a, b }: { w: number; h: number; k: number; dir: 'h' | 'v'; size: number; a: string; b: string }) {
  const step = size * k;
  const count = Math.ceil((dir === 'h' ? h : w) / step);
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Rect
          key={i}
          x={dir === 'v' ? i * step : 0}
          y={dir === 'h' ? i * step : 0}
          width={dir === 'v' ? step : w}
          height={dir === 'h' ? step : h}
          fill={i % 2 === 0 ? a : b}
        />
      ))}
    </>
  );
}

function Layers({ bg, w, h, k, court = true }: { bg: string; w: number; h: number; k: number; court?: boolean }) {
  const c = cosmetics.bg;
  const full = { x: 0, y: 0, width: w, height: h };
  switch (bg) {
    case 'bg_clay':
    case 'bg_hard':
      return (
        <>
          <Defs>
            <Fade id="np-fade-72" to={0.72} />
          </Defs>
          <Rect {...full} fill={bg === 'bg_clay' ? c.clay : c.hard} />
          <Rect {...full} fill="url(#np-fade-72)" />
          {court ? <Court w={w} h={h} k={k} /> : null}
        </>
      );
    case 'bg_grass':
      return (
        <>
          <Defs>
            <Fade id="np-fade-70" to={0.7} />
          </Defs>
          <Stripes w={w} h={h} k={k} dir="h" size={14} a={c.grassDark} b={c.grassLight} />
          <Rect {...full} fill="url(#np-fade-70)" />
          {court ? <Court w={w} h={h} k={k} /> : null}
        </>
      );
    case 'bg_indoor':
      return (
        <>
          <Defs>
            <Fade id="np-fade-70" to={0.7} />
          </Defs>
          <Stripes w={w} h={h} k={k} dir="v" size={18} a={c.indoorLight} b={c.indoorDark} />
          <Rect {...full} fill="url(#np-fade-70)" />
          {court ? <Court w={w} h={h} k={k} /> : null}
        </>
      );
    case 'bg_night':
      return (
        <>
          <Defs>
            <LinearGradient id="np-night" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.nightTop} />
              <Stop offset="0.62" stopColor={c.nightMid} />
              <Stop offset="1" stopColor={colors.ink} />
            </LinearGradient>
            <RadialGradient id="np-night-l" cx="0.06" cy="0" r="0.5" fx="0.06" fy="0">
              <Stop offset="0" stopColor={colors.paper} stopOpacity={0.55} />
              <Stop offset="0.84" stopColor={colors.paper} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="np-night-r" cx="0.94" cy="0" r="0.5" fx="0.94" fy="0">
              <Stop offset="0" stopColor={colors.paper} stopOpacity={0.55} />
              <Stop offset="0.84" stopColor={colors.paper} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect {...full} fill="url(#np-night)" />
          <Rect {...full} fill="url(#np-night-l)" />
          <Rect {...full} fill="url(#np-night-r)" />
          {court ? <Court w={w} h={h} k={k} /> : null}
        </>
      );
    case 'bg_center': {
      const id = `np-dots-${String(k).replace('.', '_')}`;
      return (
        <>
          <Defs>
            <Pattern id={id} patternUnits="userSpaceOnUse" width={14 * k} height={10 * k}>
              <Circle cx={7 * k} cy={5 * k} r={2 * k} fill={colors.paper} fillOpacity={0.28} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={w} height={h * 0.4} fill={c.centerSky} />
          <Rect x={0} y={h * 0.4} width={w} height={h * 0.6} fill={c.centerGrass} />
          <Rect {...full} fill={`url(#${id})`} />
          {court ? <Court w={w} h={h} k={k} top={0.46} alpha={0.4} /> : null}
        </>
      );
    }
    default:
      return null;
  }
}
