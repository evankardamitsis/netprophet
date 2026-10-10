import { Fragment, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { ResultItem, ResultName } from '../lib/results';
import { usePopIn, useSlamIn, useStgIn } from '../lib/motion';
import { colors, fonts } from '../theme';

/**
 * One finished match on Αποτελέσματα (prototype V2, result card): white, or ink for an upset.
 * Top row: «Ανατροπή» tag, «Το 69% έλεγε …», «Το ’πες · +10». Then the winner (big) and the loser
 * (smaller, faded) with sets won, and the set scores winner first.
 */
const STG_MS = 450;
const TAG_MS = 450;
const TAG_DELAY = 250;
const PILL_MS = 450;
const PILL_DELAY = 350;
/** prototype revName: a tapped name shows the surname for 4s */
const REVEAL_MS = 4000;

export function ResultRow({ item, index }: { item: ResultItem; index: number }) {
  // prototype ms(min(i, 4), 100): 50, 100 ... 250ms
  const enter = useStgIn(STG_MS, 50 + Math.min(index, 4) * 50);
  const hot = item.upset;
  const fg = hot ? colors.paper : colors.ink;
  return (
    <Animated.View style={[styles.card, { backgroundColor: hot ? colors.ink : colors.white }, enter]}>
      <View style={styles.top}>
        {item.tag ? <Tag text={item.tag} /> : null}
        <Text style={[styles.line, { color: fg }]}>{item.line ?? ''}</Text>
        {item.calledIt ? <Pill text={item.calledIt} /> : null}
      </View>
      <View style={styles.winner}>
        <Names people={item.winner} style={[styles.winName, { color: fg }]} />
        <Text style={[styles.winScore, { color: hot ? colors.lime : colors.ink }]}>{item.winnerSets}</Text>
      </View>
      <View style={styles.loser}>
        <Names people={item.loser} style={[styles.loseName, { color: fg }]} />
        <Text style={[styles.loseScore, { color: fg }]}>{item.loserSets}</Text>
      </View>
      <Text style={[styles.sets, { color: hot ? colors.mist : colors.inkSoft }]}>{item.score}</Text>
    </Animated.View>
  );
}

function Tag({ text }: { text: string }) {
  const slam = useSlamIn(TAG_MS, TAG_DELAY);
  return (
    <Animated.View style={[styles.tag, slam]}>
      <Text style={styles.tagText}>{text}</Text>
    </Animated.View>
  );
}

function Pill({ text }: { text: string }) {
  const pop = usePopIn(PILL_MS, PILL_DELAY);
  return (
    <Animated.View style={[styles.pill, pop]}>
      <Text style={styles.pillText} numberOfLines={1}>
        {text}
      </Text>
    </Animated.View>
  );
}

/** «Γιώργος Δ. & Ηλίας Μ.»: first name and the surname's initial; a tap shows the surname for 4s. */
function Names({ people, style }: { people: ResultName[]; style: object }) {
  return (
    <Text style={[styles.names, style]}>
      {people.map((p, i) => (
        <Fragment key={`${p.first}-${p.surname}-${i}`}>
          {i > 0 ? ' & ' : ''}
          <Name person={p} />
        </Fragment>
      ))}
    </Text>
  );
}

function Name({ person }: { person: ResultName }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const id = setTimeout(() => setOpen(false), REVEAL_MS);
    return () => clearTimeout(id);
  }, [open]);
  return (
    <Text onPress={() => setOpen((o) => !o)} suppressHighlighting>
      {person.first}{' '}
      {open ? <Text style={styles.surname}>{person.surname}</Text> : `${person.surname.slice(0, 1)}.`}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, gap: 6 },
  top: { minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  line: { flexShrink: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 17 },
  tag: { minHeight: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.lime, justifyContent: 'center' },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 14, letterSpacing: 0.48, color: colors.ink },
  pill: { minHeight: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.lime, justifyContent: 'center' },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 16, color: colors.ink },
  names: { flexShrink: 1 },
  // line heights at least the font size: iOS clips the tonos that rises above the line box
  winner: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  winName: { fontFamily: fonts.displayHeavy, fontSize: 36, lineHeight: 38 },
  winScore: { fontFamily: fonts.displayHeavy, fontSize: 36, lineHeight: 38 },
  loser: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, opacity: 0.7 },
  loseName: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30 },
  loseScore: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30 },
  // prototype .ns: the revealed surname is smaller and lighter
  surname: { fontSize: 21, fontFamily: fonts.bodySemi },
  sets: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17 },
});
