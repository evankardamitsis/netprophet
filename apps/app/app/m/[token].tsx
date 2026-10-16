import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ConfirmationAnswer, LinkKudo, MatchLinkView } from '@netprophet/db';
import { BouncingLogo } from '../../src/components/BouncingLogo';
import { Primary } from '../../src/components/OnboardingControls';
import { TOAST_MS, Toast } from '../../src/components/Toast';
import { useCopy } from '../../src/i18n';
import { useAuth } from '../../src/lib/auth';
import { useApi, useMatchLink } from '../../src/lib/data';
import { daysLeft, fixChoices, linkLabel, titleFor, toWhom, who } from '../../src/lib/link';
import { clearPendingLink, linkBase, savePendingLink } from '../../src/lib/linkHost';
import { track } from '../../src/lib/analytics';
import { usePopIn, usePress, useRiseIn, useSlamIn, useStgIn } from '../../src/lib/motion';
import { useOnboardingGate } from '../../src/lib/onboardingGate';
import { fmt } from '../../src/lib/votes';
import { colors, fonts, text } from '../../src/theme';

/** big text: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;

const KUDOS: LinkKudo[] = ['serve', 'backhand', 'calm', 'feet', 'fair_play', 'company'];

type Step = 's1' | 's2' | 's3' | 'hide' | 'bye';
interface Bye {
  text: string;
  /** after «Κρύψε με», or a hidden player opening the link: «Θέλω να φαίνομαι ξανά» */
  unhide?: boolean;
}

/**
 * The opponent link /m/<token> (prototype V2, isOpv), for someone not in the app. No account needed.
 * s1  the match from their side: who logged it, the winner big, the sets in lime, «Έγινε έτσι;» with «Έτσι έγινε»
 *     (blue) or «Όχι ακριβώς» → «Πώς έληξε;» and «Δεν έπαιξα εγώ»; «Το link ισχύει N μέρες», «Κρύψε με».
 * s2  «Πες κι εσύ μια καλή κουβέντα»: six picks, or «Άλλη φορά».
 * s3  «Ο Βαγγέλης θα το δει.» and «Κράτα το ματς στο προφίλ σου» (sign in, then a short onboarding claims it).
 * hide / bye  «Θες να μη φαίνεσαι;» and the closing lines.
 */
export default function MatchLinkScreen() {
  const { token = '' } = useLocalSearchParams<{ token: string }>();
  const t = useCopy();
  const l = t.link;
  const insets = useSafeAreaInsets();
  const { view, answer, kudo, hide } = useMatchLink(token);
  const [step, setStep] = useState<Step>('s1');
  const [bye, setBye] = useState<Bye>({ text: '' });
  const [fixing, setFixing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const scroll = useRef<ScrollView>(null);

  const say = (text: string) => {
    setToast({ text, n: Date.now() });
    setTimeout(() => setToast(null), TOAST_MS);
  };
  const go = (s: Step, b?: Bye) => {
    if (b) setBye(b);
    setStep(s);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  // where an earlier visit left off
  useEffect(() => {
    if (!view || view === 'gone') return;
    if (view.player.hidden) go('bye', { text: l.bye.hidden, unhide: true });
    else if (view.player.claimed && view.state !== 'pending') go('bye', { text: l.bye.claimed });
    else if (view.state === 'confirmed') go('s3');
    else if (view.state !== 'pending') go('bye', { text: fmt(l.bye.disputed, { to: toWhom(logger(view)) }) });
    // once per loaded link
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  if (view === null) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  const onAnswer = async (a: ConfirmationAnswer) => {
    if (busy || view === 'gone') return;
    setBusy(true);
    const r = await answer(a);
    setBusy(false);
    const to = toWhom(logger(view));
    if (r === 'failed') say(l.failed);
    else if (r === 'confirmed') go('s2');
    else if (r === 'corrected') {
      go('s2');
      say(fmt(l.corrected, { who: who(logger(view)) }));
    } else go('bye', { text: fmt(a.answer === 'not_me' ? l.bye.notMe : l.bye.disputed, { to }) });
  };

  const onHide = async (hidden: boolean) => {
    setBusy(true);
    const ok = await hide(hidden);
    setBusy(false);
    if (!ok) return say(l.failed);
    if (hidden) go('bye', { text: l.bye.hidden, unhide: true });
    else go('s1');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView ref={scroll} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.bar}>
          <BouncingLogo height={16} />
          <Text style={styles.barText} numberOfLines={1}>
            {linkLabel(token, linkBase())}
          </Text>
        </View>
        {view === 'gone' ? (
          <ByeView text={l.gone} button={l.open} onPress={() => router.replace('/')} />
        ) : step === 's1' ? (
          <Ask view={view} fixing={fixing} busy={busy} onFix={() => setFixing(true)} onAnswer={onAnswer} onHide={() => go('hide')} />
        ) : step === 's2' ? (
          <Kudos
            view={view}
            onPick={(k) => {
              void kudo(k);
              go('s3');
            }}
            onSkip={() => go('s3')}
          />
        ) : step === 's3' ? (
          <Join view={view} token={token} onLater={() => go('bye', { text: l.bye.later })} />
        ) : step === 'hide' ? (
          <HideAsk busy={busy} onYes={() => onHide(true)} onNo={() => go('s1')} />
        ) : (
          <ByeView
            text={bye.text}
            button={bye.unhide ? l.show : l.open}
            onPress={bye.unhide ? () => onHide(false) : () => router.replace('/')}
          />
        )}
      </ScrollView>
      {toast ? <Toast key={toast.n} text={toast.text} /> : null}
    </View>
  );
}

const logger = (v: MatchLinkView) => v.logged_by ?? { player_id: '', first_name: '', surname: '', gender: null };

/** s1: the match and «Έγινε έτσι;» */
function Ask({
  view,
  fixing,
  busy,
  onFix,
  onAnswer,
  onHide,
}: {
  view: MatchLinkView;
  fixing: boolean;
  busy: boolean;
  onFix: () => void;
  onAnswer: (a: ConfirmationAnswer) => void;
  onHide: () => void;
}) {
  const t = useCopy();
  const l = t.link;
  const enter = useStgIn(400);
  const title = useRiseIn(500, 50);
  const line1 = useRiseIn(550, 150);
  const line2 = useRiseIn(550, 250);
  const score = usePopIn(450, 350);
  const firsts = (side: number | null) => (view.sides.find((s) => s.side === side)?.players ?? []).map((p) => p.first_name).join(' & ');
  const winner = view.winner_side ?? 1;
  const days = daysLeft(view.expires_at, new Date());
  return (
    <Animated.View style={[styles.step, enter]}>
      <View style={styles.card}>
        <Animated.Text style={[styles.cardTitle, title]}>{titleFor(view, t)}</Animated.Text>
        <Animated.Text style={[styles.cardLine, line1]}>{firsts(winner)}</Animated.Text>
        <Animated.Text style={[styles.cardScore, score]}>{view.score ?? ''}</Animated.Text>
        <Animated.Text style={[styles.cardLine, line2]}>{firsts(winner === 1 ? 2 : 1)}</Animated.Text>
        <View style={styles.rule} />
        <Text style={styles.cardAsk}>{l.ask}</Text>
      </View>
      {!fixing ? (
        <View style={styles.actions}>
          <Primary label={l.yes} busy={busy} onPress={() => onAnswer({ answer: 'yes' })} />
          <Plain label={l.no} onPress={onFix} />
        </View>
      ) : (
        <FixPicker view={view} onAnswer={onAnswer} />
      )}
      <View style={styles.foot}>
        <Text style={styles.footText}>{days === 1 ? l.valid.one : fmt(l.valid.many, { n: days })}</Text>
        <Pressable accessibilityRole="button" onPress={onHide} style={styles.footHit}>
          <Text style={styles.footLink}>{l.hide}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** «Πώς έληξε;»: the four scores, then «Δεν έπαιξα εγώ» */
function FixPicker({ view, onAnswer }: { view: MatchLinkView; onAnswer: (a: ConfirmationAnswer) => void }) {
  const l = useCopy().link;
  const enter = useStgIn(350);
  return (
    <Animated.View style={[styles.actions, enter]}>
      <Text style={styles.how}>{l.how}</Text>
      <View style={styles.grid}>
        {fixChoices(view).map((f) => (
          <View key={f.label} style={styles.half}>
            <Plain label={f.label} cell onPress={() => onAnswer({ answer: 'fix', fix: f.fix })} />
          </View>
        ))}
      </View>
      <Underlined label={l.notMe} onPress={() => onAnswer({ answer: 'not_me' })} />
    </Animated.View>
  );
}

/** s2: «Πες κι εσύ μια καλή κουβέντα» */
function Kudos({ view, onPick, onSkip }: { view: MatchLinkView; onPick: (k: LinkKudo) => void; onSkip: () => void }) {
  const l = useCopy().link;
  const enter = useStgIn(400);
  return (
    <Animated.View style={[styles.step, enter]}>
      <Text style={styles.h1}>{l.kudos.title}</Text>
      <Text style={styles.sub}>{fmt(l.kudos.ask, { to: toWhom(logger(view)) })}</Text>
      <View style={styles.grid}>
        {KUDOS.map((k, i) => (
          <KudoButton key={k} label={l.kudos.options[k]} delay={i * 60} onPress={() => onPick(k)} />
        ))}
      </View>
      <Underlined label={l.kudos.later} onPress={onSkip} />
    </Animated.View>
  );
}

function KudoButton({ label, delay, onPress }: { label: string; delay: number; onPress: () => void }) {
  const stg = useStgIn(350, delay);
  return (
    <Animated.View style={[styles.half, stg]}>
      <Plain label={label} onPress={onPress} tall cell />
    </Animated.View>
  );
}

/** s3: «Ο Βαγγέλης θα το δει.» and join */
function Join({ view, token, onLater }: { view: MatchLinkView; token: string; onLater: () => void }) {
  const t = useCopy();
  const j = t.link.join;
  const enter = useStgIn(400);
  const pill = useSlamIn(450, 200);
  const api = useApi();
  const { session } = useAuth();
  const gate = useOnboardingGate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    await savePendingLink(token);
    // signed in and past onboarding: claim here; otherwise sign-in and onboarding pick the token up
    if (session && api && gate.status === 'done') {
      setBusy(true);
      try {
        await api.claimViaLink(token);
        track('link_claimed', { result: 'ok' });
        await clearPendingLink();
        router.replace('/');
      } catch {
        track('link_claimed', { result: 'failed' });
        setError(t.link.claimTaken);
      } finally {
        setBusy(false);
      }
      return;
    }
    router.replace(session ? '/onboarding' : '/sign-in');
  };

  return (
    <Animated.View style={[styles.step, styles.grow, enter]}>
      <View style={[styles.card, styles.joinCard]}>
        <Animated.View style={[styles.pill, pill]}>
          <Text style={styles.pillText}>{j.pill}</Text>
        </Animated.View>
        <Text style={styles.joinHead}>{fmt(j.head, { who: who(logger(view)) })}</Text>
        <Text style={styles.joinSub}>{j.sub}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {view.player.claimed ? null : <Primary label={j.cta} busy={busy} onPress={join} />}
      <Underlined label={j.later} onPress={onLater} />
    </Animated.View>
  );
}

function HideAsk({ busy, onYes, onNo }: { busy: boolean; onYes: () => void; onNo: () => void }) {
  const h = useCopy().link.hideAsk;
  const enter = useStgIn(400);
  return (
    <Animated.View style={[styles.step, enter]}>
      <Text style={styles.h1}>{h.title}</Text>
      <Text style={styles.sub}>{h.sub}</Text>
      <Primary label={h.yes} busy={busy} onPress={onYes} />
      <Plain label={h.no} onPress={onNo} />
    </Animated.View>
  );
}

function ByeView({ text, button, onPress }: { text: string; button: string; onPress: () => void }) {
  const enter = useStgIn(400);
  return (
    <Animated.View style={[styles.step, styles.bye, enter]}>
      <Text style={styles.byeText}>{text}</Text>
      <Plain label={button} onPress={onPress} />
    </Animated.View>
  );
}

/** the prototype's white button on paper */
function Plain({ label, onPress, tall = false, cell = false }: { label: string; onPress: () => void; tall?: boolean; cell?: boolean }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={cell ? styles.fill : null}>
      <Animated.View style={[styles.plain, tall && styles.plainTall, press.style]}>
        <Text style={[styles.plainText, tall && styles.plainTallText]} numberOfLines={2}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function Underlined({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.underHit}>
      <Text style={styles.under}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1, paddingHorizontal: 16, gap: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.ink },
  barText: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 12, color: colors.mist },
  step: { gap: 12 },
  grow: { flexGrow: 1 },
  card: { padding: 24, borderRadius: 28, backgroundColor: colors.ink, gap: 12 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, color: colors.mist },
  cardLine: { fontFamily: fonts.displayHeavy, fontSize: 54, lineHeight: 54, paddingBottom: 11, marginBottom: -15, color: colors.paper, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  cardScore: { fontFamily: fonts.displayHeavy, fontSize: 64, lineHeight: 64, paddingBottom: 13, marginBottom: -19, color: colors.lime, alignSelf: 'flex-start', paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  rule: { height: 1, backgroundColor: colors.inkLine },
  cardAsk: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.paper },
  actions: { gap: 8 },
  how: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  half: { width: '48.5%', flexDirection: 'row' },
  fill: { flex: 1 },
  plain: { minHeight: 52, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  plainTall: { minHeight: 64 },
  plainText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  plainTallText: { fontSize: 16 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  footText: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft },
  footHit: { minHeight: 44, justifyContent: 'center' },
  footLink: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft, textDecorationLine: 'underline' },
  h1: { ...text.title },
  sub: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.inkSoft },
  underHit: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  under: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
  joinCard: { flexGrow: 1, justifyContent: 'flex-end', gap: 14, minHeight: 360 },
  pill: { alignSelf: 'flex-start', minHeight: 28, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.lime, justifyContent: 'center' },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  joinHead: { fontFamily: fonts.displayHeavy, fontSize: 64, lineHeight: 64, paddingBottom: 13, marginBottom: -19, color: colors.paper, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  joinSub: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 24, color: colors.mist },
  error: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  bye: { flexGrow: 1, justifyContent: 'center', gap: 16, minHeight: 420 },
  byeText: { fontFamily: fonts.displayHeavy, fontSize: 52, lineHeight: 52, paddingBottom: 10, marginBottom: -12, color: colors.ink, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
});
