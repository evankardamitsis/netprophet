import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useCopy } from '../i18n';
import { useStgIn } from '../lib/motion';
import { HoldName } from '../lib/playerHold';
import { YoursDot } from './YoursDot';
import type { GroupMatchView, GroupTeamView, GroupView } from '../lib/tournaments';
import { colors, fonts } from '../theme';

/**
 * A round robin draw: one card per group, stacked. A compact table (place, the pair, wins/played), then every pair
 * as a small row with its set games (team a first, the winner bold). Names are the sheet's own text; a name matched
 * to a roster player opens their profile. Rows with me in them are drawn in ink, like the bracket.
 */
const REVEAL_MS = 600;
const STAGGER = 70;

interface Marks {
  /** «δικοί σου»: a dot and bold ink */
  yours?: Set<string>;
  /** one player's path: groups and matches without them step back («mine» marks theirs) */
  focus?: boolean;
  tournamentId?: string | null;
}

export function RoundRobin({ groups, yours, focus = false, tournamentId }: { groups: GroupView[] } & Marks) {
  const marks: Marks = { yours, focus, tournamentId };
  return (
    <View style={styles.stack}>
      {groups.map((g, i) => (
        <GroupCard key={`${g.name}-${i}`} g={g} i={i} marks={marks} />
      ))}
    </View>
  );
}

const ours = (team: GroupTeamView, yours: Set<string> | undefined) => !!yours && team.parts.some((p) => p.playerId !== null && yours.has(p.playerId));

function Names({ team, style, marks }: { team: GroupTeamView; style: StyleProp<TextStyle>; marks: Marks }) {
  const dot = ours(team, marks.yours);
  return (
    <View style={styles.namesRow}>
      {dot ? <YoursDot /> : null}
      <Text style={[styles.grow, style, dot && styles.nameMine]} numberOfLines={1}>
        {team.parts.map((p, j) => (
          <HoldName
            key={`${p.text}-${j}`}
            tournamentId={marks.tournamentId ?? null}
            playerId={p.playerId}
            onTap={p.playerId ? () => router.push(`/player/${p.playerId}`) : undefined}
          >
            {j > 0 ? ' / ' : ''}
            {p.text}
          </HoldName>
        ))}
      </Text>
    </View>
  );
}

function GroupCard({ g, i, marks }: { g: GroupView; i: number; marks: Marks }) {
  const d = useCopy().tournaments.detail;
  const enter = useStgIn(REVEAL_MS, Math.min(i, 8) * STAGGER);
  const away = marks.focus && !g.rows.some((r) => r.team.mine);
  return (
    <Animated.View style={[styles.card, away && styles.dim, enter]}>
      <Text style={styles.head}>{g.name}</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.place]}>#</Text>
        <View style={styles.grow} />
        <Text style={[styles.th, styles.wins]}>{d.wins}</Text>
      </View>
      {g.rows.map((r) => (
        <View key={r.team.pos} style={[styles.row, r.team.mine && styles.mine]}>
          <Text style={[styles.cell, styles.place]}>{r.place}</Text>
          <Names team={r.team} marks={marks} style={[styles.name, r.team.mine && styles.nameMine]} />
          {r.champion ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>✓</Text>
            </View>
          ) : null}
          <Text style={[styles.cell, styles.wins, styles.num]}>{r.record}</Text>
        </View>
      ))}
      <View style={styles.rule} />
      {g.matches.map((m) => (
        <MatchLine key={m.key} m={m} marks={marks} />
      ))}
    </Animated.View>
  );
}

function MatchLine({ m, marks }: { m: GroupMatchView; marks: Marks }) {
  const t = useCopy();
  const d = t.tournaments.detail;
  const score = m.sets.length > 0 ? m.sets.map((s) => `${s[0]}-${s[1]}`).join('  ') : m.walkover ? t.results.walkover : null;
  return (
    <View style={[styles.match, m.mine && styles.mine, marks.focus && !m.mine && styles.dim]}>
      <View style={styles.sideLine}>
        <Names team={m.a} marks={marks} style={[m.winner === 1 ? styles.nameWin : styles.name, m.winner === 2 && styles.lost]} />
      </View>
      <View style={styles.sideLine}>
        <Names team={m.b} marks={marks} style={[m.winner === 2 ? styles.nameWin : styles.name, m.winner === 1 && styles.lost]} />
      </View>
      <Text style={[styles.score, !m.played && styles.soon]}>{m.played ? score ?? '' : d.notPlayed}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  card: { padding: 14, borderRadius: 24, backgroundColor: colors.white, gap: 4 },
  head: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 30, color: colors.ink, paddingBottom: 5, marginBottom: -1 },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  th: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.3, color: colors.muted },
  row: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent' },
  mine: { borderColor: colors.ink },
  cell: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
  num: { fontVariant: ['tabular-nums'], textAlign: 'right' },
  place: { width: 16 },
  wins: { width: 40, textAlign: 'right' },
  grow: { flex: 1, minWidth: 0 },
  namesRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dim: { opacity: 0.32 },
  name: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
  nameMine: { fontFamily: fonts.bodyBold },
  nameWin: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  lost: { color: colors.muted },
  chip: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 10, lineHeight: 12, color: colors.ink },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.mist, marginVertical: 6 },
  match: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent', gap: 1 },
  sideLine: { flexDirection: 'row', alignItems: 'center' },
  score: { marginTop: 2, fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkSoft, fontVariant: ['tabular-nums'] },
  soon: { color: colors.muted },
});
