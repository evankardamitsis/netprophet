import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import { colors } from '../theme';

/** The drawn banners. Flat and geometric, theme colours only: lime stays for what was earned. */
export const AD_ART_KEYS = ['strings', 'racket', 'court', 'coffee', 'lights'] as const;
export type AdArtKey = (typeof AD_ART_KEYS)[number];

export function isAdArt(key: string | null): key is AdArtKey {
  return key !== null && (AD_ART_KEYS as readonly string[]).includes(key);
}

const W = 320;
const H = 150;

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

/** a racket, tilted, with handle; (cx, cy) is the head's centre. `grid` strings it. */
function Racket({ cx, cy, rot, grid }: { cx: number; cy: number; rot: number; grid: boolean }) {
  const rx = 38;
  const ry = 48;
  return (
    <G transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <Rect x={-6} y={ry - 4} width={12} height={58} rx={5} fill={colors.blue} />
      <Rect x={-3} y={ry + 2} width={6} height={44} rx={3} fill={colors.ink} opacity={0.35} />
      <Ellipse cx={0} cy={0} rx={rx} ry={ry} fill={grid ? colors.inkRaised : colors.ink} />
      {grid
        ? range(9).map((i) => {
            const x = -rx + 6 + (i * (2 * rx - 12)) / 8;
            const h = ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
            return <Line key={`v${i}`} x1={x} y1={-h} x2={x} y2={h} stroke={colors.paper} strokeWidth={1.4} opacity={0.85} />;
          })
        : null}
      {grid
        ? range(11).map((i) => {
            const y = -ry + 7 + (i * (2 * ry - 14)) / 10;
            const w = rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2));
            return <Line key={`h${i}`} x1={-w} y1={y} x2={w} y2={y} stroke={colors.paper} strokeWidth={1.4} opacity={0.85} />;
          })
        : null}
      <Ellipse cx={0} cy={0} rx={rx} ry={ry} fill="none" stroke={colors.paper} strokeWidth={6} />
    </G>
  );
}

function Strings() {
  return (
    <>
      <Racket cx={W / 2} cy={H / 2 - 4} rot={-24} grid />
      <Circle cx={262} cy={36} r={12} fill={colors.sand} />
      <Path d="M262 24 Q254 36 262 48 M262 24 Q270 36 262 48" stroke={colors.ink} strokeWidth={1.6} fill="none" />
    </>
  );
}

function RacketArt() {
  return (
    <>
      <Circle cx={W / 2} cy={H / 2} r={64} fill={colors.inkRaised} />
      <Racket cx={W / 2 - 4} cy={H / 2 - 8} rot={28} grid={false} />
      <Circle cx={96} cy={112} r={11} fill={colors.sand} />
      <Path d="M96 101 Q88 112 96 123 M96 101 Q104 112 96 123" stroke={colors.ink} strokeWidth={1.6} fill="none" />
    </>
  );
}

function Court() {
  // a court seen from the baseline: trapezoid, net line, service line, centre line
  return (
    <>
      <Polygon points="40,150 280,150 236,18 84,18" fill={colors.inkRaised} />
      <Polygon points="40,150 280,150 236,18 84,18" fill="none" stroke={colors.paper} strokeWidth={3} strokeLinejoin="round" />
      <Line x1={160} y1={150} x2={160} y2={18} stroke={colors.paper} strokeWidth={2.4} />
      <Line x1={63} y1={96} x2={257} y2={96} stroke={colors.paper} strokeWidth={2.4} />
      <Line x1={74} y1={52} x2={246} y2={52} stroke={colors.paper} strokeWidth={2.4} />
      <Circle cx={196} cy={74} r={9} fill={colors.sand} />
    </>
  );
}

function Coffee() {
  return (
    <>
      <Ellipse cx={160} cy={128} rx={86} ry={11} fill={colors.inkRaised} />
      <Path d="M112 70 H208 V98 Q208 128 160 128 Q112 128 112 98 Z" fill={colors.paper} />
      <Path d="M208 80 H224 Q240 80 240 96 Q240 112 222 112 H204" stroke={colors.paper} strokeWidth={9} fill="none" strokeLinecap="round" />
      <Ellipse cx={160} cy={70} rx={48} ry={9} fill={colors.blue} />
      <Path d="M138 52 Q128 40 138 28 Q148 16 138 6" stroke={colors.sand} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path d="M162 50 Q152 36 162 24 Q172 12 162 2" stroke={colors.sand} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path d="M186 52 Q176 40 186 28 Q196 16 186 6" stroke={colors.sand} strokeWidth={4} strokeLinecap="round" fill="none" />
    </>
  );
}

function Lights() {
  const poles = [70, 160, 250];
  return (
    <>
      {poles.map((x, i) => (
        <G key={x}>
          <Polygon points={`${x},44 ${x - 52},150 ${x + 52},150`} fill={colors.sand} opacity={i === 1 ? 0.28 : 0.18} />
          <Rect x={x - 2.5} y={44} width={5} height={106} fill={colors.paper} />
          <Rect x={x - 18} y={22} width={36} height={22} rx={3} fill={colors.paper} />
          {range(3).map((k) => (
            <Circle key={k} cx={x - 10 + k * 10} cy={33} r={3.6} fill={colors.sand} />
          ))}
        </G>
      ))}
      <Rect x={0} y={140} width={W} height={10} fill={colors.blue} />
    </>
  );
}

const ART: Record<AdArtKey, () => React.JSX.Element> = {
  strings: Strings,
  racket: RacketArt,
  court: Court,
  coffee: Coffee,
  lights: Lights,
};

export function AdArt({ art, height }: { art: AdArtKey; height: number }) {
  const Piece = ART[art];
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={W} height={H} fill={colors.ink} />
      <Piece />
    </Svg>
  );
}
