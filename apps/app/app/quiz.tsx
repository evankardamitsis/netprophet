import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GetQuizResult, QuestRow } from '@netprophet/db';
import { greekCaps } from '@netprophet/copy';
import { Primary } from '../src/components/OnboardingControls';
import { QuestsSheet } from '../src/components/QuestsSheet';
import { QuizOption } from '../src/components/QuizOption';
import { TOAST_MS, Toast } from '../src/components/Toast';
import { useCopy } from '../src/i18n';
import { useQuests, useQuiz, type QuizErrorKind } from '../src/lib/data';
import { usePopIn, usePress, useStgIn } from '../src/lib/motion';
import { chipText, fraction, questTitle } from '../src/lib/quests';
import { cardView, firstUnanswered, verdict } from '../src/lib/quiz';
import { useUnlocks } from '../src/lib/unlocks';
import { colors, fonts } from '../src/theme';

/**
 * «Οι 6 της ημέρας» (prototype V2, isGame and isGameEnd): dots on top, the tag, the question, a clue box on
 * «Ποιος είναι;», the options, one line of verdict and «‹ Πίσω» / «Επόμενη ›». No auto-advance: «Επόμενη ›» waits
 * for an answer. Past the last card comes «Αυτά για σήμερα.» with the +30.
 */
export default function QuizScreen() {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<{ kind: QuizErrorKind; n: number } | null>(null);
  const { quiz, error, refresh, answer } = useQuiz((kind) => setNotice((p) => ({ kind, n: (p?.n ?? 0) + 1 })));
  const unlocks = useUnlocks();
  const quests = useQuests();
  const [questsOpen, setQuestsOpen] = useState(false);
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (index === null && quiz && quiz.cards.length > 0) setIndex(firstUnanswered(quiz.cards));
  }, [quiz, index]);
  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [notice]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const pad = { paddingTop: 18 + insets.top, paddingBottom: 24 + insets.bottom };
  const toast = notice ? <Toast key={notice.n} text={notice.kind === 'expired' ? t.quiz.expired : t.quiz.answerFailed} /> : null;

  const onAnswer = (cardId: string, option: number) => {
    void answer(cardId, option).then((res) => {
      if (!res) return;
      // quests count answers; the sixth one pays +30, so the header's points are read again
      void quests.refresh();
      if (res.awarded > 0) void unlocks.refresh();
    });
  };

  if (!quiz || index === null) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <View style={[styles.body, pad]}>
          {error || (quiz && quiz.cards.length === 0) ? (
            <>
              <Text style={styles.empty}>{t.quiz.error}</Text>
              <Pressable accessibilityRole="button" onPress={leave} style={styles.linkHit}>
                <Text style={styles.link}>{t.quiz.back}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.linkHit}>
                <Text style={styles.link}>{t.quiz.next}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
        {toast}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.body, pad]} showsVerticalScrollIndicator={false}>
        {index >= quiz.cards.length ? (
          <End
            quiz={quiz}
            daily={quests.quests?.daily ?? []}
            showQuests={unlocks.has('daily_quests')}
            showLadder={unlocks.has('ladder_friends')}
            showPro={unlocks.has('pro_sheet') && !quiz.pro}
            onQuests={() => setQuestsOpen(true)}
            onDone={leave}
          />
        ) : (
          <Game key={index} quiz={quiz} index={index} onAnswer={onAnswer} onPrev={() => (index > 0 ? setIndex(index - 1) : leave())} onNext={() => setIndex(index + 1)} />
        )}
      </ScrollView>
      {toast}
      {unlocks.has('daily_quests') ? <QuestsSheet open={questsOpen} quests={quests.quests} onClose={() => setQuestsOpen(false)} /> : null}
    </View>
  );
}

function Game({ quiz, index, onAnswer, onPrev, onNext }: { quiz: GetQuizResult; index: number; onAnswer: (cardId: string, option: number) => void; onPrev: () => void; onNext: () => void }) {
  const t = useCopy();
  const card = quiz.cards[index]!;
  const v = cardView(card);
  const answered = v.mine !== null;
  const tall = v.options.length <= 2;
  const enter = useStgIn(400);
  return (
    <Animated.View style={[styles.game, enter]}>
      <View style={styles.dots}>
        {quiz.cards.map((c, i) => (
          <View key={c.id} style={[styles.dot, i < index || (i === index && answered) ? styles.dotOn : styles.dotOff]} />
        ))}
      </View>
      <View style={styles.tagRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{greekCaps(v.tag)}</Text>
        </View>
        {v.week ? <Text style={styles.week}>{t.quiz.thisWeek}</Text> : null}
      </View>
      <Text style={styles.question}>{v.question}</Text>
      {v.clues.length > 0 ? (
        <View style={styles.clues}>
          {v.clues.map((c, i) => (
            <Text key={i} style={styles.clue}>
              {c}
            </Text>
          ))}
        </View>
      ) : null}
      {v.options.map((label, i) => {
        // «Ποιος είναι;» shows only the right answer, full width and ✓; a vote shows the split when the server has one
        const isQuiz = v.right !== null;
        const fill = !answered ? null : isQuiz ? (i === v.right ? 100 : null) : v.split ? v.split[i]! : null;
        const mark = !answered ? '' : isQuiz ? (i === v.right ? '✓' : '') : v.split ? `${v.split[i]}%` : '';
        return <QuizOption key={`${card.id}-${i}`} label={label} tall={tall} chosen={v.mine === i} fill={fill} mark={mark} disabled={answered} onPress={() => onAnswer(card.id, i + 1)} />;
      })}
      <Text style={styles.verdict}>{verdict(card, t)}</Text>
      <View style={styles.buttons}>
        <Step label={t.quiz.back} outline onPress={onPrev} />
        <Step label={t.quiz.next} disabled={!answered} onPress={onNext} />
      </View>
    </Animated.View>
  );
}

function Step({ label, outline, disabled, onPress }: { label: string; outline?: boolean; disabled?: boolean; onPress: () => void }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} onPress={() => !disabled && onPress()} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.stepHit}>
      <Animated.View style={[styles.step, outline ? styles.stepOutline : styles.stepInk, disabled && styles.stepOff, press.style]}>
        <Text style={[styles.stepText, outline ? styles.stepTextOutline : styles.stepTextInk]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function End({
  quiz,
  daily,
  showQuests,
  showLadder,
  showPro,
  onQuests,
  onDone,
}: {
  quiz: GetQuizResult;
  daily: QuestRow[];
  showQuests: boolean;
  showLadder: boolean;
  showPro: boolean;
  onQuests: () => void;
  onDone: () => void;
}) {
  const t = useCopy();
  const e = t.quiz.end;
  const enter = useStgIn(400);
  const pop = usePopIn(450, 200);
  return (
    <Animated.View style={[styles.game, enter]}>
      <Text style={styles.endTitle}>{e.title}</Text>
      {quiz.awarded ? (
        <View style={styles.bonus}>
          <Animated.Text style={[styles.bonusNum, pop]}>{t.quiz.bonus}</Animated.Text>
          <View style={styles.bonusSide}>
            <Text style={styles.bonusText}>{e.points}</Text>
            <Text style={styles.bonusText}>{quiz.pro ? e.nextPro : e.next}</Text>
          </View>
        </View>
      ) : null}
      {showQuests && daily.length > 0 ? (
        <View style={styles.quests}>
          <View style={styles.questsHead}>
            <Text style={styles.questsTitle}>{e.quests}</Text>
            <Pressable accessibilityRole="button" onPress={onQuests} style={styles.linkHit}>
              <Text style={styles.questsAll}>{e.allQuests}</Text>
            </Pressable>
          </View>
          <View style={styles.questRows}>
            {daily.map((q) => (
              <QuestLine key={q.key} row={q} />
            ))}
          </View>
        </View>
      ) : null}
      <Primary label={e.toVotes} onPress={onDone} tall />
      {showLadder ? (
        <Pressable accessibilityRole="button" onPress={() => router.replace('/ladder')} style={styles.linkHit}>
          <Text style={[styles.link, styles.underline]}>{e.toLadder}</Text>
        </Pressable>
      ) : null}
      {showPro ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/pro?from=daily_quiz')} style={styles.linkHit}>
          <Text style={styles.proLine}>{e.pro}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

function QuestLine({ row }: { row: QuestRow }) {
  const t = useCopy();
  return (
    <View style={styles.questLine}>
      <View style={styles.questTop}>
        <Text style={styles.questName}>{`${row.done ? '✓ ' : ''}${questTitle(row.key, t)}`}</Text>
        <View style={[styles.chip, row.done && styles.chipDone]}>
          <Text style={styles.chipText}>{chipText(row, t)}</Text>
        </View>
      </View>
      <View style={styles.barRow}>
        <View style={styles.track}>
          <View style={[styles.bar, { width: `${fraction(row) * 100}%` }]} />
        </View>
        <Text style={styles.count}>{`${row.progress}/${row.target}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  body: { paddingHorizontal: 20, flexGrow: 1 },
  game: { gap: 12 },
  empty: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft, textAlign: 'center', paddingTop: 40 },
  linkHit: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  underline: { textDecorationLine: 'underline' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { flex: 1, height: 5, borderRadius: 999 },
  dotOn: { backgroundColor: colors.ink },
  dotOff: { backgroundColor: colors.stone },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  week: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft },
  tag: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, backgroundColor: colors.lime },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.48, color: colors.ink },
  question: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 43, color: colors.ink },
  clues: { paddingVertical: 16, paddingHorizontal: 18, borderRadius: 22, backgroundColor: colors.ink, gap: 6 },
  clue: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.paper },
  verdict: { minHeight: 20, fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.ink, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 8 },
  stepHit: { flex: 1 },
  step: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepOutline: { borderWidth: 2, borderColor: colors.fog },
  stepInk: { backgroundColor: colors.ink },
  stepOff: { opacity: 0.45 },
  stepText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  stepTextOutline: { color: colors.ink },
  stepTextInk: { color: colors.paper },
  endTitle: { fontFamily: fonts.displayHeavy, fontSize: 64, lineHeight: 61, color: colors.ink },
  bonus: { padding: 22, borderRadius: 28, backgroundColor: colors.lime, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  bonusNum: { fontFamily: fonts.displayHeavy, fontSize: 96, lineHeight: 100, marginBottom: -16, color: colors.ink },
  bonusSide: { flexShrink: 1, alignItems: 'flex-end' },
  bonusText: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.ink, textAlign: 'right' },
  quests: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, backgroundColor: colors.white, gap: 10 },
  questsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  questsTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  questsAll: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  questRows: { gap: 9 },
  questLine: { gap: 5 },
  questTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  questName: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 18, color: colors.ink },
  chip: { minHeight: 22, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  chipDone: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { flex: 1, height: 5, borderRadius: 999, backgroundColor: colors.navLine, overflow: 'hidden' },
  bar: { height: 5, borderRadius: 999, backgroundColor: colors.ink },
  count: { minWidth: 30, textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  proLine: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft, textAlign: 'center' },
});
