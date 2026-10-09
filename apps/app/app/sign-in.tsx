import { useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../src/i18n';
import { AuthFailure, EMAIL_RE, useAuth, type AuthErrorKind } from '../src/lib/auth';
import { fmt } from '../src/lib/votes';
import { alpha, cardSurface, colors, fonts, motion, radii, spacing } from '../src/theme';

type Step = 'email' | 'code';
const CODE_LEN = 6;

export default function SignInScreen() {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKind | null>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof AuthFailure ? err.kind : 'generic');
      shake.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(0, { duration: 50 }),
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

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + spacing[6], paddingBottom: insets.bottom + spacing[4] }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.logo}>NetProphet</Text>

      {step === 'email' ? (
        <Animated.View key="email" entering={FadeInDown.duration(motion.revealDur)} style={styles.body}>
          <Text style={styles.title}>{t.auth.title}</Text>
          <Text style={styles.label}>{t.auth.emailLabel}</Text>
          <Animated.View style={shakeStyle}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t.auth.emailPlaceholder}
              placeholderTextColor={alpha(colors.ink, 0.35)}
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
          <Button kind="primary" onPress={send} disabled={busy || !EMAIL_RE.test(cleanEmail)} busy={busy}>
            {t.auth.sendCode}
          </Button>
          <Text style={styles.or}>{t.auth.or}</Text>
          <Button kind="secondary" onPress={() => run(auth.signInWithGoogle)} disabled={busy}>
            {t.auth.google}
          </Button>
        </Animated.View>
      ) : (
        <Animated.View key="code" entering={FadeInDown.duration(motion.revealDur)} style={styles.body}>
          <Text style={styles.title}>{t.auth.codeTitle}</Text>
          <Text style={styles.hint}>{fmt(t.auth.codeSent, { email: cleanEmail })}</Text>
          <Text style={styles.label}>{t.auth.codeLabel}</Text>
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
          <Button kind="primary" onPress={() => verify(code)} disabled={busy || code.length !== CODE_LEN} busy={busy}>
            {t.auth.verify}
          </Button>
          <View style={styles.links}>
            <TextLink onPress={() => run(() => auth.sendCode(cleanEmail))} disabled={busy}>
              {t.auth.resend}
            </TextLink>
            <TextLink
              onPress={() => {
                setError(null);
                setStep('email');
              }}
              disabled={busy}
            >
              {`‹ ${t.auth.changeEmail}`}
            </TextLink>
          </View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

function Button({
  kind,
  children,
  onPress,
  disabled,
  busy,
}: {
  kind: 'primary' | 'secondary';
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, motion.spring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring);
      }}
    >
      <Animated.View
        style={[styles.button, primary ? styles.primary : styles.secondary, disabled && !busy && styles.disabled, style]}
      >
        {busy ? (
          <ActivityIndicator color={colors.paper} />
        ) : (
          <Text style={[styles.buttonText, primary ? styles.primaryText : styles.secondaryText]}>{children}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

function TextLink({ children, onPress, disabled }: { children: ReactNode; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} hitSlop={12}>
      {({ pressed }) => <Text style={[styles.link, pressed && styles.linkPressed]}>{children}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: spacing[5] },
  logo: { color: colors.ink, fontFamily: fonts.displayHeavy, fontSize: 28 },
  body: { flex: 1, justifyContent: 'center', gap: spacing[3], maxWidth: 420, width: '100%', alignSelf: 'center' },
  title: { color: colors.ink, fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 46, marginBottom: spacing[2] },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, marginTop: -spacing[2] },
  label: { color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.5, marginTop: spacing[2] },
  input: {
    backgroundColor: cardSurface,
    borderWidth: 1,
    borderColor: alpha(colors.ink, 0.15),
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 18,
  },
  code: { fontFamily: fonts.displayHeavy, fontSize: 32, letterSpacing: 10, textAlign: 'center' },
  error: { color: colors.ink, fontFamily: fonts.bodySemi, fontSize: 14 },
  button: {
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
  primary: { backgroundColor: colors.blue },
  secondary: { borderWidth: 1.5, borderColor: colors.ink },
  disabled: { opacity: 0.4 },
  buttonText: { fontFamily: fonts.bodySemi, fontSize: 16 },
  primaryText: { color: colors.paper },
  secondaryText: { color: colors.ink },
  or: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[2] },
  link: { color: colors.ink, fontFamily: fonts.bodySemi, fontSize: 14, textDecorationLine: 'underline' },
  linkPressed: { opacity: 0.5 },
});
