import { useRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useCopy } from '../i18n';
import { CARD_H, CONN_W, HEADER_H, layoutBracket, startRound, championOf } from '../lib/bracket';
import { useStgIn } from '../lib/motion';
import type { BracketMatch, SideView } from '../lib/tournaments';
import { colors, fonts } from '../theme';

/**
 * A knockout draw as a tree, the way sports apps draw it: a column per round, a compact card per match, thin
 * connectors from each pair of feeders into the next card, the champion at the far right. Scrolls sideways
 * and snaps to the columns; the page scrolls it up and down.
 */
const REVEAL_MS = 600;
const STAGGER = 70;
const PAGE_PAD = 20;
const CHAMP_W = 150;

export function BracketTree({ rounds, me }: { rounds: { name: string; matches: BracketMatch[] }[]; me: string | null }) {
  const { width: screen } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const placed = useRef(false);
  const colW = Math.round(Math.min(Math.max(screen * 0.7, 220), 300));
  const champion = championOf(rounds);
  const layout = layoutBracket(rounds.map((r) => r.matches.length), colW, champion ? CHAMP_W : 0);
  const step = colW + CONN_W;
  const first = startRound(rounds);
  // start on the earliest round still to play; once the content has a size (and again if it grows, until placed)
  const onSize = (w: number) => {
    if (placed.current || w <= 0) return;
    placed.current = true;
    setTimeout(() => scroller.current?.scrollTo({ x: first * step, animated: false }), 0);
  };
  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={step}
      snapToAlignment="start"
      decelerationRate="fast"
      onContentSizeChange={(w) => onSize(w)}
      contentOffset={{ x: first * step, y: 0 }}
      style={styles.bleed}
      contentContainerStyle={{ paddingHorizontal: PAGE_PAD }}
    >
      <View style={{ width: layout.width, height: HEADER_H + layout.height }}>
        {rounds.map((r, ri) => (
          <Column key={r.name} x={layout.columns[ri]!} w={colW} i={ri} height={HEADER_H + layout.height}>
            <Text style={styles.head} numberOfLines={1}>{r.name}</Text>
            {layout.cards
              .filter((c) => c.round === ri)
              .map((c) => (
                <View key={r.matches[c.index]!.key} style={{ position: 'absolute', left: 0, top: HEADER_H + c.y, width: c.w, height: c.h }}>
                  <Card m={r.matches[c.index]!} me={me} />
                </View>
              ))}
          </Column>
        ))}
        {layout.connectors.map((b, k) => (
          <View key={k} pointerEvents="none" style={[styles.line, { left: b.x, top: HEADER_H + b.y, width: b.w, height: b.h }]} />
        ))}
        {champion && layout.champion ? (
          <Column x={layout.champion.x} w={CHAMP_W} i={rounds.length} height={HEADER_H + layout.height}>
            <Champion side={champion} top={HEADER_H + layout.champion.cy - CARD_H / 2} />
          </Column>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Column({ x, w, i, height, children }: { x: number; w: number; i: number; height: number; children: ReactNode }) {
  const enter = useStgIn(REVEAL_MS, Math.min(i, 8) * STAGGER);
  return <Animated.View style={[{ position: 'absolute', left: x, top: 0, width: w, height }, enter]}>{children}</Animated.View>;
}

const mineIn = (s: SideView, me: string | null) => me !== null && s.parts.some((p) => p.playerId === me);

function Card({ m, me }: { m: BracketMatch; me: string | null }) {
  const mine = mineIn(m.sides[0], me) || mineIn(m.sides[1], me);
  return (
    <View style={[styles.card, mine && styles.cardMine, m.note ? styles.cardWithNote : null]}>
      <Row side={m.sides[0]} n={1} m={m} me={me} />
      <Row side={m.sides[1]} n={2} m={m} me={me} />
      {m.note ? (
        <View style={styles.noteBox} pointerEvents="none">
          <Text style={styles.note} numberOfLines={2}>
            {m.note}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Row({ side, n, m, me }: { side: SideView; n: 1 | 2; m: BracketMatch; me: string | null }) {
  const d = useCopy().tournaments.detail;
  if (side.bye) {
    return (
      <View style={styles.row}>
        <Text style={styles.bye}>{d.bye}</Text>
      </View>
    );
  }
  const won = m.winner === n;
  const lost = m.winner !== null && !won;
  const mineRow = mineIn(side, me);
  const nameStyle = [styles.name, won && styles.nameWin, lost && styles.nameLost, mineRow && !lost && styles.nameMine];
  return (
    <View style={styles.row}>
      <Text style={styles.seed}>{side.seed ?? ''}</Text>
      <Text style={nameStyle} numberOfLines={1}>
        {side.parts.map((p, j) => (
          <Text key={`${p.text}-${j}`} onPress={p.playerId ? () => router.push(`/player/${p.playerId}`) : undefined} suppressHighlighting>
            {j > 0 ? ' / ' : ''}
            {p.text}
          </Text>
        ))}
      </Text>
      {won ? (
        <View style={styles.chip}>
          <Text style={styles.chipText}>✓</Text>
        </View>
      ) : null}
      <View style={styles.games}>
        {m.sets.map((s, k) => (
          <Text key={k} style={[styles.game, won && styles.gameWin, lost && styles.nameLost]}>
            {s[n - 1]}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Champion({ side, top }: { side: SideView; top: number }) {
  const c = useCopy().tournaments.detail;
  return (
    <View style={[styles.champ, { top }]}>
      <Text style={styles.champLabel}>{c.champion}</Text>
      <View style={styles.champRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>✓</Text>
        </View>
        <Text style={styles.champName} numberOfLines={2}>
          {side.parts.map((p, j) => (
            <Text key={`${p.text}-${j}`} onPress={p.playerId ? () => router.push(`/player/${p.playerId}`) : undefined} suppressHighlighting>
              {j > 0 ? ' / ' : ''}
              {p.text}
            </Text>
          ))}
        </Text>
      </View>
    </View>
  );
}

const ROW_H = 26;

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -PAGE_PAD },
  head: { height: HEADER_H, paddingTop: 8, fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.3, color: colors.inkSoft },
  line: { position: 'absolute', backgroundColor: colors.stone },
  card: { height: CARD_H, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.mist, backgroundColor: colors.white, paddingHorizontal: 10, paddingTop: 6, overflow: 'hidden' },
  cardMine: { borderWidth: 1.5, borderColor: colors.ink },
  row: { height: ROW_H, flexDirection: 'row', alignItems: 'center', gap: 6 },
  seed: { width: 14, fontFamily: fonts.bodySemi, fontSize: 10, color: colors.muted, textAlign: 'right' },
  name: { flex: 1, minWidth: 0, fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
  nameWin: { fontFamily: fonts.bodyBold },
  nameLost: { color: colors.muted },
  nameMine: { fontFamily: fonts.bodyBold, color: colors.ink },
  chip: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 10, lineHeight: 12, color: colors.ink },
  games: { flexDirection: 'row', gap: 6, minWidth: 0 },
  game: { minWidth: 10, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkSoft, fontVariant: ['tabular-nums'] },
  gameWin: { fontFamily: fonts.bodyBold, color: colors.ink },
  bye: { marginLeft: 20, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, color: colors.muted },
  cardWithNote: { paddingRight: 64 },
  noteBox: { position: 'absolute', right: 10, top: 0, bottom: 0, width: 52, justifyContent: 'center' },
  note: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 13, color: colors.muted, textAlign: 'right' },
  champ: { position: 'absolute', left: 0, width: CHAMP_W, height: CARD_H, borderRadius: 12, backgroundColor: colors.ink, paddingHorizontal: 12, justifyContent: 'center', gap: 6 },
  champLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.5, color: colors.mist },
  champRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  champName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.paper },
});
