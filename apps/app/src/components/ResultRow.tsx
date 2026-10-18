import { Fragment, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { ResultItem, ResultName } from '../lib/results';
import { usePopIn, useSlamIn, useStgIn } from '../lib/motion';
import { useUnlocks } from '../lib/unlocks';
import { colors, fonts, motion } from '../theme';
import { useCopy } from '../i18n';
import { FitText } from './FitText';
import { ReactionChips } from './ReactionChips';

/**
 * One finished match on Αποτελέσματα: white, or ink for an upset. Cleared out (founder, 14 Oct: "result cards look a
 * bit cluttered"): the card is the winner and the score. The «Ανατροπή» tag and the lime «Το ’πες · +10» sit on top
 * only when there is one. Under the names one quiet line: the set scores and «Το 69% έλεγε …». The reactions and
 * «Πες κάτι στον …» wait behind the «+» at the end of that line (or a tap on the card). Your own win shows
 * «Μοιράσου τη νίκη ›» (Pro «Η σεζόν σου»: the win card).
 */
const STG_MS = 450;
const TAG_MS = 450;
const TAG_DELAY = 250;
const PILL_MS = 450;
const PILL_DELAY = 350;
/** prototype revName: a tapped name opens for 4s */
const REVEAL_MS = 4000;

export function ResultRow({ item, index, onLongPress }: { item: ResultItem; index: number; onLongPress?: (matchId: string) => void }) {
  // prototype ms(min(i, 4), 100): 50, 100 ... 250ms
  const enter = useStgIn(STG_MS, 50 + Math.min(index, 4) * 50);
  const t = useCopy();
  const hot = item.upset;
  const { has } = useUnlocks();
  const reactionsOpen = has('reactions');
  const kudosOpen = has('kudos');
  const fg = hot ? colors.paper : colors.ink;
  const soft = hot ? colors.mist : colors.inkSoft;
  const showReactions = !!item.reactions && reactionsOpen;
  const showThank = !!item.thank && kudosOpen;
  const more = showReactions || showThank;
  const [open, setOpen] = useState(false);
  const meta = [item.score, item.line].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityState={more ? { expanded: open } : undefined}
      onPress={more ? () => setOpen((o) => !o) : undefined}
      onLongPress={onLongPress ? () => onLongPress(item.id) : undefined}
      delayLongPress={450}
    >
      <Animated.View style={[styles.card, { backgroundColor: hot ? colors.ink : colors.white }, enter]}>
        {item.tag || item.calledIt || item.review ? (
          <View style={styles.top}>
            {item.review ? <Tag text={item.review} quiet /> : item.tag ? <Tag text={item.tag} /> : <View />}
            {item.calledIt ? <Pill text={item.calledIt} /> : null}
          </View>
        ) : null}
        <View style={styles.winner}>
          <View style={styles.nameBox}>
            <Names people={item.winner} style={[styles.winName, { color: fg }]} />
          </View>
          <Text style={[styles.winScore, { color: hot ? colors.lime : colors.ink }]}>{item.winnerSets}</Text>
        </View>
        <View style={styles.loser}>
          <View style={styles.nameBox}>
            <Names people={item.loser} style={[styles.loseName, { color: fg }]} />
          </View>
          <Text style={[styles.loseScore, { color: fg }]}>{item.loserSets}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.sets, { color: soft }]} numberOfLines={2}>
            {meta}
          </Text>
          {more ? <More open={open} color={soft} /> : null}
        </View>
        {item.myWin ? (
          <Pressable
            accessibilityRole="button"
            style={styles.thankHit}
            onPress={() => router.push({ pathname: '/win-card', params: { match: item.id, from: 'results' } })}
          >
            <Text style={[styles.thank, { color: hot ? colors.lime : colors.blue }]}>{t.winCard.open}</Text>
          </Pressable>
        ) : null}
        {open && showReactions ? <ReactionChips matchId={item.id} initial={item.reactions!} dark={hot} /> : null}
        {open && showThank ? (
          <Pressable
            accessibilityRole="button"
            style={styles.thankHit}
            onPress={() =>
              router.push({
                pathname: '/kudos',
                params: { match: item.id, to: item.thank!.playerId, first: item.thank!.first, gender: item.thank!.gender ?? '' },
              })
          }
          >
            <Text style={[styles.thank, { color: hot ? colors.lime : colors.blue }]}>{item.thank!.label}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/** «+» marks that the card opens (the whole card is the button); it turns to × while open */
function More({ open, color }: { open: boolean; color: string }) {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withSpring(open ? 1 : 0, motion.spring);
  }, [open, turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 45}deg` }] }));
  return (
    <View style={styles.moreHit}>
      <Animated.Text style={[styles.more, { color }, style]}>+</Animated.Text>
    </View>
  );
}

/** `quiet`: «Σε έλεγχο», nothing has happened yet, so it is not lime */
function Tag({ text, quiet }: { text: string; quiet?: boolean }) {
  const slam = useSlamIn(TAG_MS, TAG_DELAY);
  return (
    <Animated.View style={[styles.tag, quiet ? styles.tagQuiet : null, slam]}>
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

/**
 * «Δεσύπρης Γ. & Μέμμος Η.»: the surname large, as on the feed cards, and the first name's initial;
 * a tap shows the first name for 4s (founder, 10 Oct; the prototype had it the other way round).
 */
function Names({ people, style }: { people: ResultName[]; style: StyleProp<TextStyle> }) {
  // measured as shown collapsed: «Δεσύπρης Γ. & Μέμμος Η.»
  const shown = people.map((p) => `${p.surname} ${p.first.slice(0, 1)}.`).join(' & ');
  return (
    <FitText text={shown} style={[styles.names, style]}>
      {people.map((p, i) => (
        <Fragment key={`${p.first}-${p.surname}-${i}`}>
          {i > 0 ? ' & ' : ''}
          <Name person={p} />
        </Fragment>
      ))}
    </FitText>
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
      {person.surname}{' '}
      {open ? <Text style={styles.firstName}>{person.first}</Text> : `${person.first.slice(0, 1)}.`}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, gap: 2 },
  top: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  moreHit: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  more: { fontFamily: fonts.bodyBold, fontSize: 22, lineHeight: 26 },
  tag: { minHeight: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.lime, justifyContent: 'center' },
  tagQuiet: { backgroundColor: colors.mist },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 14, letterSpacing: 0.48, color: colors.ink },
  pill: { minHeight: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.lime, justifyContent: 'center' },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 16, color: colors.ink },
  names: {},
  nameBox: { flex: 1, minWidth: 0 },
  // line heights at least the font size: iOS clips the tonos that rises above the line box
  // compact (founder, 16 Oct): the winner bold, the loser lighter, both one size so the eye reads down the scores
  winner: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  winName: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 26, paddingTop: 5, marginTop: -5, paddingBottom: 5, marginBottom: -5 },
  winScore: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 26, paddingTop: 5, marginTop: -5, paddingBottom: 5, marginBottom: -5 },
  loser: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, opacity: 0.65 },
  loseName: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, paddingTop: 5, marginTop: -5, paddingBottom: 5, marginBottom: -5 },
  loseScore: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, paddingTop: 5, marginTop: -5, paddingBottom: 5, marginBottom: -5 },
  // the revealed first name is smaller and lighter (prototype .ns)
  firstName: { fontSize: 16, fontFamily: fonts.bodySemi },
  sets: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17 },
  thankHit: { minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 2 },
  thank: { fontFamily: fonts.bodyBold, fontSize: 13 },
});
