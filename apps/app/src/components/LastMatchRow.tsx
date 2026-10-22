import { StyleSheet, Text, View } from 'react-native';
import { useCopy } from '../i18n';
import type { LastMatchLine } from '../lib/players';
import { colors, fonts } from '../theme';

/**
 * One row of «Τελευταία ματς» (founder, 22 Oct 2026: the old one-line row wrapped against a long day and category):
 * a lime ✓ for a win (an empty ring for a loss), who was across the net (the pair on doubles), the partner, the
 * score from this player's side on the right, and one quiet line with the day, the tournament, the category and
 * the round.
 */
export function LastMatchRow({ m, first }: { m: LastMatchLine; first: boolean }) {
  const t = useCopy();
  const said = [m.won ? t.players.won : t.players.lost, m.score, m.against, m.partner, m.meta].filter(Boolean).join(', ');
  return (
    <View accessible accessibilityLabel={said} style={[styles.row, !first && styles.line]}>
      <View style={[styles.mark, m.won ? styles.markWin : styles.markLoss]}>
        {m.won ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.against}>{m.against}</Text>
          {m.score ? <Text style={styles.score}>{m.score}</Text> : null}
        </View>
        {m.partner ? <Text style={styles.muted}>{m.partner}</Text> : null}
        {m.meta ? <Text style={styles.muted}>{m.meta}</Text> : null}
      </View>
    </View>
  );
}

const MARK = 26;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  line: { borderTopWidth: 1, borderTopColor: colors.navLine, paddingTop: 12 },
  mark: { width: MARK, height: MARK, borderRadius: MARK / 2, alignItems: 'center', justifyContent: 'center', marginTop: -1 },
  markWin: { backgroundColor: colors.lime },
  markLoss: { borderWidth: 2, borderColor: colors.fog },
  tick: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 18, color: colors.ink },
  body: { flex: 1, minWidth: 0, gap: 2 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  against: { flex: 1, minWidth: 0, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  score: { flexShrink: 0, maxWidth: '55%', textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  muted: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
});
