import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { greekCaps } from '@netprophet/copy';
import type { ProOfferMoment } from '@netprophet/db';
import { useCopy } from '../i18n';
import type { HomeTournament, QuizCardView, ResultsLine, YoursNow } from '../lib/home';
import { tagLabel } from '../lib/home';
import type { MyMatchView } from '../lib/myMatch';
import { usePopIn, usePress, useStgIn } from '../lib/motion';
import { useOfferShown, useProOffer } from '../lib/purchase';
import { hasTime, timeOf } from '../lib/tournaments';
import { fmt } from '../lib/votes';
import { cardSurface, colors, fonts, motion, surfaceTints, text } from '../theme';
import { Logo } from './Logo';

/**
 * The cards of the home, Τουρνουά (mockup D, founder 22 Oct). Each is one idea; the screen (app/(tabs)/index.tsx)
 * decides which show and in what order. Blue is only the results card's «Δες τα ›»: the one primary action.
 */

const ENTER_MS = motion.revealDur;

/** a staggered entrance for a block of the home */
export function Reveal({ i, children }: { i: number; children: ReactNode }) {
  const enter = useStgIn(ENTER_MS, Math.min(i, 8) * motion.stagger);
  return <Animated.View style={enter}>{children}</Animated.View>;
}

/** a press that scales the child: every touch answers */
function Tap({ onPress, label, children, scale = 0.98 }: { onPress: () => void; label?: string; children: ReactNode; scale?: number }) {
  const press = usePress(scale);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={press.style}>{children}</Animated.View>
    </Pressable>
  );
}

/* ================= the page header ================= */

/** «Σήμερα» big on the left, today's date small and muted on the right, on one baseline (mockup A). Scrolls with the page. */
export function HomeHeader({ date }: { date: string }) {
  const t = useCopy();
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.headerTitle}>{t.home.title}</Text>
      <Text style={styles.headerDate}>{date}</Text>
    </View>
  );
}

/* ================= the results card ================= */

/** «Αποτελέσματα · 2 ✓ · 1 χαμένο · +30» on ink, with the one blue button; it opens the results one by one */
export function ResultsCard({ view, onOpen }: { view: ResultsLine; onOpen: () => void }) {
  const t = useCopy();
  const press = usePress();
  const pop = usePopIn(450, 150);
  return (
    <View style={styles.results}>
      <View style={styles.resultsText}>
        <Text style={styles.resultsTitle}>{view.title}</Text>
        <Text style={styles.resultsLine}>
          {view.line}
          {view.points > 0 ? (
            <>
              <Text>{' · '}</Text>
              <Text style={styles.resultsPoints}>{fmt(t.home.results.points, { n: view.points })}</Text>
            </>
          ) : null}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${t.home.results.take} ${view.title}`} onPress={onOpen} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.blue, press.style, pop]}>
          <Text style={styles.blueText}>{t.home.results.take}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

/* ================= «Οι δικοί σου» ================= */

export function YoursBlock({ children }: { children: ReactNode }) {
  const t = useCopy();
  return (
    <View style={styles.yours}>
      <Text style={styles.yoursTitle}>{t.home.yours.title}</Text>
      {children}
    </View>
  );
}

/** «Ο αγώνας σου», 18:00, with whom and where */
export function MyMatchRow({ match, onPress }: { match: MyMatchView; onPress: () => void }) {
  const t = useCopy();
  return (
    <Tap onPress={onPress} label={`${t.home.yours.myMatch}. ${match.line}`}>
      <View style={styles.yoursRow}>
        <View style={styles.timeCol}>
          {hasTime(match.startsAt) ? (
            <>
              <Text style={styles.timeText}>{timeOf(match.startsAt)}</Text>
              {match.today ? null : <Text style={styles.small}>{t.match.tomorrow}</Text>}
            </>
          ) : (
            <Text style={[styles.timeText, styles.center]}>{match.today ? t.match.today : t.match.tomorrow}</Text>
          )}
        </View>
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>{t.home.yours.myMatch}</Text>
          <Text numberOfLines={2} style={styles.small}>
            {[match.who, match.category].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </View>
    </Tap>
  );
}

/** one of your people today: «Τώρα» or the time, the name, with whom and where */
export function YoursRow({ row, onPress }: { row: YoursNow; onPress?: () => void }) {
  const t = useCopy();
  const body = (
    <View style={styles.yoursRow}>
      <View style={styles.timeCol}>
        {row.now ? <LiveTag /> : row.time ? <Text style={[styles.timeText, styles.center]}>{row.time}</Text> : null}
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {row.name}
        </Text>
        <Text numberOfLines={2} style={styles.small}>
          {row.line}
        </Text>
      </View>
      {onPress ? <Text style={styles.chev}>›</Text> : null}
    </View>
  );
  return onPress ? (
    <Tap onPress={onPress} label={`${row.now ? t.home.yours.now : row.time ?? ''} ${row.name}. ${row.line}`}>
      {body}
    </Tap>
  ) : (
    body
  );
}

/** «ΤΩΡΑ»: lime on ink, as in mockup D (something is happening right now) */
export function LiveTag() {
  const t = useCopy();
  return (
    <View style={styles.live}>
      <Text style={styles.liveText}>{greekCaps(t.home.yours.now)}</Text>
    </View>
  );
}

/* ================= the quiz ================= */

/** «Quiz της ημέρας»: how many, what the six give, «Παίξε ›»; once played the score, the +30 in lime */
export function QuizCard({ view, onPress }: { view: QuizCardView; onPress: () => void }) {
  const t = useCopy();
  const pop = usePopIn(450, 200);
  return (
    <Tap onPress={onPress} label={`${t.home.quiz.title}. ${view.line}`}>
      <View style={styles.quiz}>
        <View style={styles.quizNum}>
          <Text style={styles.quizNumText}>{view.done ? '✓' : String(view.n)}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.quizTitle}>{t.home.quiz.title}</Text>
          <Text style={styles.small}>{view.done ? `${view.line} · ${t.home.quiz.doneLine}` : view.line}</Text>
        </View>
        {view.done ? (
          view.earned ? (
            <Animated.View style={[styles.earned, pop]}>
              <Text style={styles.earnedText}>{t.home.quiz.earned}</Text>
            </Animated.View>
          ) : null
        ) : (
          <Text style={styles.go}>{view.answered > 0 ? t.quiz.resume : t.quiz.play}</Text>
        )}
      </View>
    </Tap>
  );
}

/* ================= Pro ================= */

/**
 * The dark Pro card, about what is near (ProNudge's moments): your match soon, «Ο αντίπαλός σου στις 18:00»; else
 * your stats. Pro sees the feature itself and opens it; never a buy prompt. Without Pro it shows only when the server
 * says an offer may show now (not in the first days, one a day; it counts the showing), the free week only if there is
 * one. It sells information, never points, ranking or outcomes.
 */
export function ProCard({ pro, myMatch }: { pro: boolean; myMatch: MyMatchView | null }) {
  const t = useCopy();
  const p = t.home.pro;
  const { offer } = useProOffer();
  const shown = useOfferShown();
  const counted = useRef(false);
  const moment: ProOfferMoment = myMatch ? 'before_match' : 'me';
  const canSell = !pro && offer !== null && offer.can_offer && !offer.pro;
  useEffect(() => {
    if (canSell && !counted.current) {
      counted.current = true;
      shown(moment);
    }
  }, [canSell, moment, shown]);
  if (!pro && !canSell) return null;
  const title = !myMatch
    ? p.statsTitle
    : hasTime(myMatch.startsAt)
      ? fmt(myMatch.today ? p.opponentToday : p.opponentTomorrow, { time: timeOf(myMatch.startsAt) })
      : myMatch.today
        ? p.opponentTodayNoTime
        : p.opponentTomorrowNoTime;
  const line = myMatch ? p.opponentLine : p.statsLine;
  const cta = myMatch ? (pro ? p.opponentOpen : p.opponentBuy) : pro ? p.statsOpen : p.statsBuy;
  const open = () => {
    if (!pro) router.push(`/pro?from=${moment}`);
    else if (myMatch) router.push(`/scout/${myMatch.matchId}`);
    else router.push('/match-stats');
  };
  return (
    <Tap onPress={open} label={`${title}. ${cta}`}>
      <View style={styles.pro}>
        <View style={styles.proTop}>
          <View style={styles.proTag}>
            <Text style={styles.proTagText}>{p.tag}</Text>
          </View>
          {!pro && offer?.trial_available ? <Text style={styles.proTrial}>{p.trial}</Text> : null}
        </View>
        <Text style={styles.proTitle}>{title}</Text>
        <Text style={styles.proLine}>{line}</Text>
        <Text style={styles.proCta}>{cta}</Text>
      </View>
    </Tap>
  );
}

/* ================= «Τουρνουά σήμερα» ================= */

export function TournamentCard({ item }: { item: HomeTournament }) {
  const t = useCopy();
  const tag = tagLabel(item.tag, t);
  return (
    <Tap onPress={() => router.push(`/tournament/${item.id}`)} label={[item.name, tag, item.live, item.next, item.count].filter(Boolean).join('. ')}>
      <View style={styles.tcard}>
        <View style={styles.tTop}>
          <View style={styles.tName}>
            {/* a real logo only: without one the Logo's letter («O» for Open) read as a stray «0» badge here */}
            {item.logo ? <Logo path={item.logo} name={item.name} size={24} /> : null}
            <Text style={styles.tNameText}>{item.name}</Text>
          </View>
          {tag ? (
            <View style={[styles.tag, item.tag === 'playing' && styles.tagInk]}>
              <Text style={[styles.tagText, item.tag === 'playing' && styles.tagTextInk]}>{tag}</Text>
            </View>
          ) : null}
        </View>
        {item.live ? (
          <View style={styles.tLive}>
            <LiveTag />
            <Text numberOfLines={1} style={styles.tLiveText}>
              {item.live}
            </Text>
          </View>
        ) : item.next ? (
          <Text style={styles.tLiveText}>{item.next}</Text>
        ) : null}
        {item.count ? <Text style={styles.small}>{item.count}</Text> : null}
      </View>
    </Tap>
  );
}

/**
 * The small heading over one tournament's vote rows: its name in the display font and «N ματς» muted on the right; a tap
 * opens the tournament (no `onPress` for «Φιλικά»).
 */
export function VoteGroupHeading({ title, count, onPress }: { title: string; count: string; onPress?: () => void }) {
  const body = (
    <View style={styles.vgHead}>
      <Text numberOfLines={1} style={styles.vgTitle}>
        {title}
      </Text>
      <Text style={styles.small}>{count}</Text>
    </View>
  );
  return onPress ? (
    <Tap onPress={onPress} label={`${title}. ${count}`} scale={0.99}>
      {body}
    </Tap>
  ) : (
    body
  );
}

/** a quiet ink text line that opens a page («Όλα τα τουρνουά ›», «Περισσότερα ›») */
export function QuietLink({ label, onPress }: { label: string; onPress: () => void }) {
  const press = usePress(0.97);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.quietHit}>
      <Animated.View style={press.style}>
        <Text style={styles.quiet}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** «+ Ματς»: log a match you played; a lime pill (blue is the results' action) */
export function AddMatchPill() {
  const t = useCopy();
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/add-match')} onPressIn={press.onPressIn} onPressOut={press.onPressOut} hitSlop={6}>
      <Animated.View style={[styles.add, press.style]}>
        <Text style={styles.addText}>{t.addMatch.cta}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 2 },
  small: { ...text.meta, fontSize: 13, lineHeight: 17 },
  center: { textAlign: 'center' },
  chev: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.inkSoft },
  // results
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  headerTitle: { ...text.title, flexShrink: 1 },
  headerDate: { ...text.meta, flexShrink: 0 },
  results: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.ink },
  resultsText: { flex: 1, gap: 2 },
  resultsTitle: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, color: colors.paper },
  resultsLine: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.mist },
  resultsPoints: { fontFamily: fonts.bodyBold, color: colors.lime },
  blue: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  blueText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },
  // yours
  yours: { padding: 12, borderRadius: 18, backgroundColor: colors.sand, gap: 8 },
  yoursTitle: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  yoursRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: cardSurface },
  timeCol: { width: 52, alignItems: 'center', justifyContent: 'center', gap: 2 },
  timeText: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 19, color: colors.ink },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  live: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6, backgroundColor: colors.ink },
  liveText: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4, color: colors.lime },
  // quiz
  // a cool tint (the hard-court surface's), so the quiz stands out from the white cards; ink text on it is above 10:1
  quiz: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: surfaceTints.hard.bg },
  quizNum: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  quizNumText: { fontFamily: fonts.displayHeavy, fontSize: 28, lineHeight: 30, paddingTop: 4, color: colors.paper },
  quizTitle: { ...text.heading, fontSize: 22, lineHeight: 24 },
  go: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  earned: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.lime },
  earnedText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  // pro
  pro: { padding: 16, borderRadius: 18, backgroundColor: colors.ink, gap: 8 },
  proTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proTag: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6, backgroundColor: colors.paper },
  proTagText: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, color: colors.ink },
  proTrial: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mist },
  proTitle: { ...text.heading, fontSize: 24, lineHeight: 26, color: colors.paper },
  proLine: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.mist },
  proCta: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
  // tournaments
  tcard: { padding: 14, borderRadius: 18, backgroundColor: cardSurface, gap: 8 },
  tTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  tName: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  vgHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingHorizontal: 4, paddingTop: 4 },
  vgTitle: { ...text.heading, fontSize: 18, lineHeight: 22, flexShrink: 1 },
  tNameText: { ...text.heading, fontSize: 22, lineHeight: 24, flexShrink: 1 },
  tag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.sand },
  tagInk: { backgroundColor: colors.lime },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  tagTextInk: { color: colors.ink },
  tLive: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tLiveText: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.ink },
  quietHit: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  quiet: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  add: { flexShrink: 0, minHeight: 40, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
});
