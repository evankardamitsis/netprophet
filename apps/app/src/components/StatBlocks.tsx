import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { greekCaps } from '@netprophet/copy';
import type { BarRow, BestWin, MonthBar, PersonRow, PressureTile, RoundRow, StatBlock, TournamentRow } from '../lib/matchStats';
import { HoldName } from '../lib/playerHold';
import { useFadeUpIn, useGrowIn, useGrowUpIn, useStgIn } from '../lib/motion';
import { alpha, colors, fonts, motion, surfaceTints } from '../theme';

/**
 * The Pro blocks of match numbers (sets and games, pressure moments, surfaces, categories, rounds, tournaments and
 * friendlies, the year, people, best wins, tournaments), each in its own form. Moved out of «Τα στατιστικά σου» so the
 * opponent scout shows the same blocks for the other player (founder, 22 Oct 2026).
 */

/** a bar that grows from the left as it lands */
function Bar({ value, height, trackColor, fillColor, border, delay }: { value: number; height: number; trackColor: string; fillColor: string; border?: string; delay: number }) {
  const grow = useGrowIn(motion.revealDur, delay);
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      {value > 0 ? (
        <Animated.View
          style={[{ width: `${Math.max(4, value * 100)}%`, height, borderRadius: 999, backgroundColor: fillColor, borderColor: border, borderWidth: border ? 1.5 : 0 }, grow]}
        />
      ) : null}
    </View>
  );
}

const LIME_BAR = { trackColor: alpha(colors.ink, 0.08), fillColor: colors.lime, border: colors.ink };
const INK_BAR = { trackColor: alpha(colors.ink, 0.08), fillColor: colors.ink };

/** one Pro block of match numbers, as «Τα στατιστικά σου» and the scout show them */
export function StatBlockCard({ block, i }: { block: StatBlock; i: number }) {
  const enter = useStgIn(motion.revealDur, motion.stagger * (i + 3));
  const delay = motion.stagger * (i + 3) + motion.revealDur / 2;
  const note = 'note' in block ? block.note : null;
  return (
    <Animated.View style={[styles.card, enter]}>
      <View style={styles.cardHead}>
        <Text style={styles.kicker}>{greekCaps(block.title)}</Text>
        {note ? <Text style={styles.cardNote}>{note}</Text> : null}
      </View>
      <BlockBody block={block} delay={delay} />
    </Animated.View>
  );
}

function BlockBody({ block, delay }: { block: StatBlock; delay: number }) {
  const at = (k: number) => delay + motion.stagger * k;
  switch (block.kind) {
    case 'sets':
      return (
        <View style={styles.stack}>
          {block.rows.map((r, k) => (
            <BigBarRow key={r.key} row={r} delay={at(k)} />
          ))}
        </View>
      );
    case 'pressure':
      return (
        <View style={styles.tiles}>
          {block.tiles.map((x, k) => (
            <Tile key={x.key} tile={x} delay={at(k)} />
          ))}
        </View>
      );
    case 'surface':
      return (
        <View style={styles.stack}>
          {block.rows.map((r, k) => (
            <SurfaceRow key={r.key} row={r} delay={at(k)} />
          ))}
        </View>
      );
    case 'splits':
      return (
        <View style={styles.stack}>
          {block.rows.map((r, k) => (
            <SplitRow key={r.key} row={r} delay={at(k)} />
          ))}
        </View>
      );
    case 'rounds':
      return (
        <View style={styles.stack}>
          {block.rows.map((r, k) => (
            <RoundLine key={r.key} row={r} delay={at(k)} />
          ))}
        </View>
      );
    case 'kinds':
      return (
        <View style={styles.halves}>
          {block.rows.map((r, k) => (
            <Half key={r.key} row={r} delay={at(k)} />
          ))}
        </View>
      );
    case 'months':
      return <MonthChart bars={block.bars} delay={delay} />;
    case 'people':
      return (
        <View>
          {block.rows.map((r, k) => (
            <PersonLine key={r.key} row={r} first={k === 0} delay={at(k)} />
          ))}
        </View>
      );
    case 'bestWins':
      return (
        <View style={styles.stack}>
          {block.wins.map((w) => (
            <WinCard key={w.key} win={w} />
          ))}
        </View>
      );
    case 'tournaments':
      return <Tournaments rows={block.rows} more={block.more} champion={block.champion} />;
  }
}

/** sets and games: the record big, the rate, a thick bar */
function BigBarRow({ row, delay }: { row: BarRow; delay: number }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={styles.bigValue}>{row.value}</Text>
        </View>
        {row.pct ? <Text style={styles.bigPct}>{row.pct}</Text> : null}
      </View>
      {row.share !== null ? <Bar value={row.share} height={14} {...LIME_BAR} delay={delay} /> : null}
      {row.note ? <Text style={styles.rowNote}>{row.note}</Text> : null}
    </View>
  );
}

/** one pressure moment: the number first, what it means under it */
function Tile({ tile, delay }: { tile: PressureTile; delay: number }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{tile.value}</Text>
      <Text style={styles.tileLabel}>{tile.label}</Text>
      {tile.share !== null ? <Bar value={tile.share} height={6} {...INK_BAR} delay={delay} /> : null}
      <Text style={styles.tileNote}>{tile.note}</Text>
    </View>
  );
}

/** a surface in its own tint: the pill, the record and a bar in the same colours */
function SurfaceRow({ row, delay }: { row: BarRow & { surface: string }; delay: number }) {
  const tint = (surfaceTints as Record<string, { bg: string; ink: string }>)[row.surface] ?? { bg: colors.sand, ink: colors.inkSoft };
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={[styles.surfacePill, { backgroundColor: tint.bg }]}>
          <Text style={[styles.surfaceText, { color: tint.ink }]}>{row.label}</Text>
        </View>
        <Text style={styles.rowValue}>
          {row.value}
          {row.pct ? <Text style={styles.rowPct}>{`  ${row.pct}`}</Text> : null}
        </Text>
      </View>
      {row.share !== null ? <Bar value={row.share} height={10} trackColor={tint.bg} fillColor={tint.ink} delay={delay} /> : null}
    </View>
  );
}

/** a category: label, record and rate, a slim bar */
function SplitRow({ row, delay }: { row: BarRow; delay: number }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={[styles.rowLabel, styles.rowText]}>{row.label}</Text>
        <Text style={styles.rowValue}>
          {row.value}
          {row.pct ? <Text style={styles.rowPct}>{`  ${row.pct}`}</Text> : null}
        </Text>
      </View>
      {row.share !== null ? <Bar value={row.share} height={8} {...LIME_BAR} delay={delay} /> : null}
    </View>
  );
}

/** a round as pips: a lime square per win, a stone one per loss (up to 24 drawn, the record says the rest) */
const MAX_PIPS = 24;
function RoundLine({ row, delay }: { row: RoundRow; delay: number }) {
  const wins = Math.min(row.won, MAX_PIPS);
  const losses = Math.max(0, Math.min(row.lost, MAX_PIPS - wins));
  const pips = [...Array<boolean>(wins).fill(true), ...Array<boolean>(losses).fill(false)];
  const enter = useFadeUpIn(motion.revealDur, delay, 8);
  return (
    <Animated.View style={[styles.roundRow, enter]}>
      <View style={styles.roundLabelBox}>
        <Text style={styles.rowLabel}>{row.label}</Text>
        <View style={styles.depth}>
          <View style={[styles.depthFill, { width: `${Math.max(8, row.depth * 100)}%` }]} />
        </View>
      </View>
      <View style={styles.pips}>
        {pips.map((w, k) => (
          <View key={k} style={[styles.pip, w ? styles.pipWin : styles.pipLoss]} />
        ))}
      </View>
      <Text style={styles.roundValue}>{row.value}</Text>
    </Animated.View>
  );
}

/** tournaments or friendlies: one half each */
function Half({ row, delay }: { row: BarRow; delay: number }) {
  return (
    <View style={styles.half}>
      <Text style={styles.tileLabel}>{row.label}</Text>
      <Text style={styles.tileValue}>{row.value}</Text>
      {row.pct ? <Text style={styles.rowPct}>{row.pct}</Text> : null}
      {row.share !== null ? <Bar value={row.share} height={8} {...LIME_BAR} delay={delay} /> : null}
    </View>
  );
}

/** the year as columns: wins (lime) stacked over losses (stone), the busiest month full height */
const CHART_H = 116;
function MonthChart({ bars, delay }: { bars: MonthBar[]; delay: number }) {
  return (
    <View style={styles.chart}>
      {bars.map((b, k) => (
        <MonthColumn key={b.key} bar={b} delay={delay + (motion.stagger / 2) * k} />
      ))}
    </View>
  );
}

function MonthColumn({ bar, delay }: { bar: MonthBar; delay: number }) {
  const grow = useGrowUpIn(motion.revealDur, delay);
  const h = Math.max(12, bar.height * CHART_H);
  return (
    <View style={styles.month}>
      <Text style={styles.monthNum}>{bar.won}</Text>
      <View style={styles.monthTrack}>
        <Animated.View style={[styles.monthCol, { height: h }, grow]}>
          {bar.won > 0 ? <View style={[styles.monthWon, { flex: bar.won }]} /> : null}
          {bar.lost > 0 ? <View style={[styles.monthLost, { flex: bar.lost }]} /> : null}
        </Animated.View>
      </View>
      <Text style={styles.monthLabel}>{bar.label}</Text>
    </View>
  );
}

/** a partner or an opponent: the initials ball, the name in full (wraps, never cut), the record and a thin bar */
function PersonLine({ row, first, delay }: { row: PersonRow; first: boolean; delay: number }) {
  return (
    <View style={[styles.person, !first && styles.divider]}>
      <View style={styles.ball}>
        <Text style={styles.ballText}>{row.initials}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>
          <HoldName tournamentId={null} playerId={row.playerId}>
            {row.name}
          </HoldName>
        </Text>
        <Text style={styles.rowNote}>{row.meta}</Text>
        {row.share !== null ? (
          <View style={styles.personBar}>
            <Bar value={row.share} height={6} {...INK_BAR} delay={delay} />
          </View>
        ) : null}
      </View>
      <Text style={styles.personValue}>{row.value}</Text>
    </View>
  );
}

/** a best win on ink: the score in lime (it happened, and it is yours) */
function WinCard({ win }: { win: BestWin }) {
  return (
    <View style={styles.win}>
      <Text style={styles.winScore}>{win.score}</Text>
      <Text style={styles.winNames}>{win.names}</Text>
      {win.partner ? <Text style={styles.winMeta}>{win.partner}</Text> : null}
      {win.meta ? <Text style={styles.winMeta}>{win.meta}</Text> : null}
    </View>
  );
}

function Tournaments({ rows, more, champion }: { rows: TournamentRow[]; more: string | null; champion: string }) {
  return (
    <View>
      {rows.map((r, k) => (
        <View key={r.key} style={[styles.tour, k > 0 && styles.divider]}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{r.name}</Text>
            <Text style={styles.rowNote}>{r.meta}</Text>
            {r.champion ? (
              <View style={styles.champion}>
                <Text style={styles.championText}>{champion}</Text>
              </View>
            ) : r.line ? (
              <Text style={styles.tourLine}>{r.line}</Text>
            ) : null}
          </View>
          <Text style={styles.personValue}>{r.value}</Text>
        </View>
      ))}
      {more ? <Text style={[styles.rowNote, styles.more]}>{more}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ball: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  ballText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.paper },
  bigPct: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 36, color: colors.inkSoft },
  bigValue: { fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 46, color: colors.ink },
  card: { padding: 18, borderRadius: 24, backgroundColor: colors.white, gap: 14 },
  cardHead: { gap: 4 },
  cardNote: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  champion: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.lime },
  championText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  depth: { height: 3, borderRadius: 999, backgroundColor: alpha(colors.ink, 0.08), overflow: 'hidden' },
  depthFill: { height: 3, borderRadius: 999, backgroundColor: colors.inkSoft },
  divider: { borderTopWidth: 1, borderTopColor: colors.navLine },
  half: { flex: 1, padding: 14, borderRadius: 18, backgroundColor: colors.paper, gap: 4 },
  halves: { flexDirection: 'row', gap: 10 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.inkSoft },
  month: { flex: 1, maxWidth: 36, alignItems: 'center', gap: 4 },
  monthCol: { width: '100%', gap: 2 },
  monthLabel: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, color: colors.inkSoft },
  monthLost: { backgroundColor: colors.stone, borderRadius: 8 },
  monthNum: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, color: colors.inkSoft },
  monthTrack: { height: CHART_H, width: '100%', justifyContent: 'flex-end' },
  monthWon: { backgroundColor: colors.lime, borderWidth: 1.5, borderColor: colors.ink, borderRadius: 8 },
  more: { paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.navLine },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  personBar: { marginTop: 4 },
  personValue: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 32, color: colors.ink },
  pip: { width: 14, height: 14, borderRadius: 4 },
  pipLoss: { backgroundColor: colors.stone },
  pipWin: { backgroundColor: colors.lime, borderWidth: 1.5, borderColor: colors.ink },
  pips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  roundLabelBox: { width: 116, gap: 4 },
  roundRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roundValue: { fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 28, color: colors.ink, minWidth: 40, textAlign: 'right' },
  row: { gap: 8 },
  rowLabel: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  rowNote: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  rowPct: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowValue: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 30, color: colors.ink },
  stack: { gap: 16 },
  surfacePill: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999 },
  surfaceText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  tile: { flexGrow: 1, flexBasis: '45%', padding: 14, borderRadius: 18, backgroundColor: colors.paper, gap: 4 },
  tileLabel: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18, color: colors.ink },
  tileNote: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  tileValue: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 40, color: colors.ink },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tour: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  tourLine: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18, color: colors.ink, marginTop: 2 },
  track: { borderRadius: 999, overflow: 'hidden' },
  win: { padding: 16, borderRadius: 20, backgroundColor: colors.ink, gap: 4 },
  winMeta: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.mist },
  winNames: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, color: colors.paper },
  winScore: { fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 38, color: colors.lime },
});
