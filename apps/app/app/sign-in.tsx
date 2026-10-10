import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../src/i18n';
import { AuthFailure, EMAIL_RE, useAuth, type AuthErrorKind } from '../src/lib/auth';
import { usePopIn, usePress } from '../src/lib/motion';
import { fmt } from '../src/lib/votes';
import { cardSurface, colors, ease, fonts } from '../src/theme';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOGO = require('../assets/logo-on-ink.svg');
/** brand/logo/lockup-on-ink-tight.svg: 426.4 × 80 */
const LOGO_RATIO = 426.4 / 80;

type Step = 'welcome' | 'email' | 'code';
/** «Άλλη φορά»: after the email code, go straight to the feed and skip claim, area and Ποιους ξέρεις */
export const SKIP_ONBOARDING_KEY = 'np.skipOnboarding';
const CODE_LEN = 6;
/** prototype .sw: a 1em box (70px), words slide by 110% */
const SWAP_H = 70;
const SWAP_SHIFT = SWAP_H * 1.1;
/** bottom padding on phones without a home indicator */
const BOTTOM_MIN = 12;
/** «Άλλη φορά» is a 44pt tap area with 14px text, so it can sit this far into the home-indicator inset */
const LATER_SLACK = 14;
/**
 * The hero title's line height (62) is below its size (70): iOS clips what rises above the line box,
 * the tonos on «Μάθε» and «τένις». Extra top padding, cancelled by a negative margin, keeps it drawn.
 */
const ACCENT_PAD = 10;

/**
 * Signed-out flow. Welcome is prototype V2's first screen, copied as is.
 * Email and code are not in the prototype; they use its claim screen («Είσαι ήδη εδώ;») styles.
 */
export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('welcome');
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        // bottom: only the home-indicator area; «Άλλη φορά» already carries a 44pt tap area of its own
        contentContainerStyle={[styles.scroll, { paddingTop: 18 + insets.top, paddingBottom: Math.max(BOTTOM_MIN, insets.bottom - LATER_SLACK) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 'welcome' ? (
          <Welcome
            onNext={() => {
              AsyncStorage.removeItem(SKIP_ONBOARDING_KEY).catch(() => undefined);
              setStep('email');
            }}
            onLater={() => {
              AsyncStorage.setItem(SKIP_ONBOARDING_KEY, '1').catch(() => undefined);
              setStep('email');
            }}
          />
        ) : (
          <Auth step={step} setStep={setStep} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------- welcome (prototype isWelcome) ---------- */

function Welcome({ onNext, onLater }: { onNext: () => void; onLater: () => void }) {
  const t = useCopy();
  const card = useInA(500, 12);
  const cta = usePopIn(450, 1500);
  return (
    <View style={styles.welcome}>
      <Animated.View style={[styles.hero, card]}>
        <Image source={LOGO} style={styles.heroLogo} contentFit="contain" accessibilityLabel="NetProphet" />
        <Rise delay={80} duration={550}>
          <Text style={[styles.heroTitle, styles.accentRoom]}>{t.welcome.title}</Text>
          <Swap words={t.welcome.sports} />
        </Rise>
        <View>
          {t.welcome.points.map((p, i) => (
            <Rise key={p} delay={350 + i * 250} duration={500}>
              <View style={[styles.point, i === t.welcome.points.length - 1 && styles.pointLast]}>
                <View style={styles.dot} />
                <Text style={styles.pointText}>{p}</Text>
              </View>
            </Rise>
          ))}
          <Rise delay={1200} duration={500}>
            <Text style={styles.tagline}>{t.welcome.tagline}</Text>
          </Rise>
        </View>
      </Animated.View>
      <Animated.View style={cta}>
        <Button kind="hero" onPress={onNext}>
          {t.welcome.cta}
        </Button>
      </Animated.View>
      <Later onPress={onLater}>{t.welcome.later}</Later>
    </View>
  );
}

/** The sport word: s1 shows for 40%, slides up; s2 slides in from below (5s loop, prototype .sw). */
function Swap({ words }: { words: readonly string[] }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 2000 }),
        withTiming(1, { duration: 500, easing: ease }),
        withTiming(1, { duration: 2000 }),
        withTiming(2, { duration: 500, easing: ease }),
      ),
      -1,
    );
  }, [p]);
  const a = useAnimatedStyle(() => {
    const v = p.value <= 1 ? p.value : 2 - p.value; // 0 → 1 → 0
    return { opacity: 1 - v, transform: [{ translateY: -v * SWAP_SHIFT }] };
  });
  const b = useAnimatedStyle(() => {
    const v = p.value <= 1 ? p.value : 2 - p.value;
    return { opacity: v, transform: [{ translateY: (1 - v) * SWAP_SHIFT }] };
  });
  return (
    <View style={styles.swap}>
      <Animated.Text style={[styles.heroTitle, styles.lime, styles.swapText, a]}>{words[0]}</Animated.Text>
      <Animated.Text style={[styles.heroTitle, styles.lime, styles.swapText, styles.swapB, b]}>{words[1] ?? words[0]}</Animated.Text>
    </View>
  );
}

/* ---------- email and code (claim screen styles) ---------- */

function Auth({ step, setStep }: { step: 'email' | 'code'; setStep: (s: Step) => void }) {
  const t = useCopy();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKind | null>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const enter = useInA(400, 12, step);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof AuthFailure ? err.kind : 'generic');
      // prototype rvshake: -9, 8, -5, 3
      shake.value = withSequence(
        withTiming(-9, { duration: 60 }),
        withTiming(8, { duration: 70 }),
        withTiming(-5, { duration: 70 }),
        withTiming(3, { duration: 70 }),
        withTiming(0, { duration: 60 }),
      );
    } finally {
      setBusy(false);
    }
  };

  const cleanEmail = email.trim().toLowerCase();
  const send = () =>
    run(async () => {
      await auth.sendCode(cleanEmail);
      setCode('');
      setStep('code');
    });
  const verify = (value: string) => run(() => auth.verifyCode(cleanEmail, value));
  const onCode = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, CODE_LEN);
    setCode(digits);
    if (digits.length === CODE_LEN && !busy) void verify(digits);
  };

  if (step === 'email') {
    return (
      <Animated.View style={[styles.form, enter]}>
        <Text style={styles.h1}>{t.auth.title}</Text>
        <Text style={styles.lead}>{t.auth.subtitle}</Text>
        <Animated.View style={shakeStyle}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t.auth.emailPlaceholder}
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={() => EMAIL_RE.test(cleanEmail) && void send()}
            editable={!busy}
            accessibilityLabel={t.auth.emailLabel}
          />
        </Animated.View>
        {error ? <Text style={styles.error}>{t.auth.errors[error]}</Text> : null}
        <Button kind="hero" onPress={send} disabled={busy || !EMAIL_RE.test(cleanEmail)} busy={busy}>
          {t.auth.sendCode}
        </Button>
        <Button kind="outline" onPress={() => run(auth.signInWithGoogle)} disabled={busy}>
          {t.auth.google}
        </Button>
        <Back onPress={() => setStep('welcome')}>{`‹ ${t.common.back}`}</Back>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.form, enter]}>
      <Text style={styles.h1}>{t.auth.codeTitle}</Text>
      <Text style={styles.lead}>{fmt(t.auth.codeSent, { email: cleanEmail })}</Text>
      <Animated.View style={shakeStyle}>
        <TextInput
          style={[styles.input, styles.code]}
          value={code}
          onChangeText={onCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={CODE_LEN}
          autoFocus
          editable={!busy}
          accessibilityLabel={t.auth.codeLabel}
        />
      </Animated.View>
      {error ? <Text style={styles.error}>{t.auth.errors[error]}</Text> : null}
      <Button kind="hero" onPress={() => verify(code)} disabled={busy || code.length !== CODE_LEN} busy={busy}>
        {t.auth.verify}
      </Button>
      <Button kind="outline" onPress={() => run(() => auth.sendCode(cleanEmail))} disabled={busy}>
        {t.auth.resend}
      </Button>
      <Back
        onPress={() => {
          setError(null);
          setStep('email');
        }}
      >
        {`‹ ${t.auth.changeEmail}`}
      </Back>
    </Animated.View>
  );
}

/* ---------- pieces ---------- */

/** inA: fade in from `dy` px below; replays when `key` changes. */
function useInA(duration: number, dy: number, key?: unknown) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = 0;
    p.value = withTiming(1, { duration, easing: ease });
  }, [p, duration, key]);
  return useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * dy }] }));
}

/** rise: fade in from 40px below after `delay`. */
function Rise({ delay, duration, children }: { delay: number; duration: number; children: ReactNode }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration, easing: ease }));
  }, [p, delay, duration]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 40 }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function Button({
  kind,
  children,
  onPress,
  disabled,
  busy,
}: {
  kind: 'hero' | 'outline';
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const press = usePress();
  const hero = kind === 'hero';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={[hero ? styles.hero60 : styles.outline, disabled && !busy && styles.disabled, press.style]}>
        {busy ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={hero ? styles.heroText : styles.outlineText}>{children}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** «Άλλη φορά»: 44px, underlined, secondary ink (prototype welcome) */
function Later({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.laterHit}>
      <Animated.Text style={[styles.later, press.style]}>{children}</Animated.Text>
    </Pressable>
  );
}

function Back({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.backHit}>
      <Animated.Text style={[styles.back, press.style]}>{children}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },

  // welcome
  welcome: { flexGrow: 1, gap: 14 },
  hero: {
    flexGrow: 1,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 22,
    borderRadius: 28,
    backgroundColor: colors.ink,
    justifyContent: 'space-between',
    gap: 18,
  },
  heroLogo: { height: 30, width: 30 * LOGO_RATIO },
  heroTitle: { fontFamily: fonts.displayHeavy, fontSize: 70, lineHeight: 62, color: colors.paper },
  lime: { color: colors.lime },
  accentRoom: { paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  swap: { height: SWAP_H + ACCENT_PAD, marginTop: -ACCENT_PAD, overflow: 'hidden' },
  swapText: { paddingTop: ACCENT_PAD },
  swapB: { position: 'absolute', left: 0, top: 0 },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.inkLine,
  },
  pointLast: { borderBottomWidth: 1, borderBottomColor: colors.inkLine },
  dot: { width: 10, height: 10, borderRadius: 999, backgroundColor: colors.lime },
  pointText: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 19, lineHeight: 22.8, color: colors.paper },
  tagline: { paddingTop: 14, fontFamily: fonts.bodyBold, fontSize: 17, color: colors.lime },

  // email and code
  form: { gap: 12 },
  h1: { fontFamily: fonts.displayHeavy, fontSize: 60, lineHeight: 57, color: colors.ink },
  lead: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20.25, color: colors.inkSoft },
  input: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: cardSurface,
    fontFamily: fonts.bodySemi,
    fontSize: 17,
    color: colors.ink,
  },
  code: { fontFamily: fonts.displayHeavy, fontSize: 30, letterSpacing: 8, textAlign: 'center' },
  error: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20.25, color: colors.ink },

  // buttons
  hero60: { minHeight: 60, borderRadius: 18, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  heroText: { fontFamily: fonts.bodyBold, fontSize: 19, color: colors.white },
  outline: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  disabled: { opacity: 0.4 },
  backHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  laterHit: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  later: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft, textDecorationLine: 'underline' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
});
