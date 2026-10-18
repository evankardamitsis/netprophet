import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../i18n';
import { DEFAULT_AVATARS, type DefaultAvatar } from '../lib/avatar';
import { cleanName, nameProblem, suggestedName } from '../lib/ballerName';
import type { BallerSave } from '../lib/data';
import type { LookPreview } from '../lib/look';
import { usePress } from '../lib/motion';
import { colors, fonts, text } from '../theme';
import { Baller, type BallerHandle } from './Baller';
import { CardBackground } from './CardBackground';
import { LookWardrobe } from './LookWardrobe';
import { TOAST_MS, Toast } from './Toast';

/**
 * «Γνώρισε τον Baller σου» (founder, 17 Oct: full-screen presentations, Baller as the trademark). Baller drops in and
 * waves; swipe it or use ‹ › to try the twelve styles, each change a spin; then «Πώς τον λένε;» with a name ready.
 * «Συνέχεια» (the screen's one blue) saves the style and the name, Baller jumps, and the screen hands back.
 * Opened again for a Baller that has a name (founder, 17 Oct), there is nothing to confirm: a new style saves as you
 * pick it, the name stays as it is with «Μετονομασία», and only renaming shows a blue «Αποθήκευση».
 * Used at the end of onboarding and from the profile. From the profile Εμφάνιση sits below as well (founder, 18 Oct:
 * "it makes sense to see everything there"): Baller stands on the background you look at and wears what you tap.
 */
const SIZE = 210;
/** a swipe this far sideways changes the style */
const SWIPE_PX = 36;
/** the jump plays before the screen hands back */
const DONE_MS = 900;

interface Props {
  /** who you are, for the ready name */
  userId: string;
  lang: 'el' | 'en';
  /** the style you have now */
  current: DefaultAvatar | null;
  /** the name you gave, if any */
  name: string | null;
  kit: string;
  gear: string | null;
  frame: string | null;
  pickAvatar: (key: string) => Promise<boolean>;
  saveName: (name: string) => Promise<BallerSave>;
  onDone: () => void;
  /** «Αργότερα» (or `laterLabel`) when present */
  onLater?: () => void;
  laterLabel?: string;
}

export function MeetBaller({ userId, lang, current, name, kit, gear, frame, pickAvatar, saveName, onDone, onLater, laterLabel }: Props) {
  const t = useCopy();
  const b = t.baller;
  const insets = useSafeAreaInsets();
  const baller = useRef<BallerHandle>(null);
  const start = Math.max(0, DEFAULT_AVATARS.findIndex((a) => a.key === current?.key));
  const [i, setI] = useState(start);
  const [value, setValue] = useState(name ?? suggestedName(userId, lang));
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // a Baller with a name: no «Συνέχεια», style saves on its own, the field opens only to rename
  const [profile] = useState(name !== null);
  const [saved, setSaved] = useState(name);
  const [renaming, setRenaming] = useState(name === null);
  const press = usePress();
  const rename = usePress();
  const style = DEFAULT_AVATARS[i]!;
  const savedStyle = useRef(current?.key ?? null);
  const [preview, setPreview] = useState<LookPreview | null>(null);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);
  const dressed = profile && preview !== null;

  // on the profile a picked style is kept a moment after the last swipe
  useEffect(() => {
    if (!profile || style.key === savedStyle.current) return undefined;
    const timer = setTimeout(() => {
      void pickAvatar(style.key).then((ok) => {
        if (ok) savedStyle.current = style.key;
        else setProblem(b.problems.failed);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [profile, style.key, pickAvatar, b.problems.failed]);

  /** «Αποθήκευση»: the new name, then the field closes and Baller jumps */
  const saveRename = async () => {
    const p = nameProblem(value);
    if (p) {
      setProblem(b.problems[p]);
      return;
    }
    const clean = cleanName(value);
    setBusy(true);
    setProblem(null);
    const r = clean === saved ? 'ok' : await saveName(clean);
    setBusy(false);
    if (r !== 'ok') {
      setProblem(r === 'notAllowed' ? b.problems.notAllowed : r === 'bad' ? b.problems.chars : b.problems.failed);
      return;
    }
    setSaved(clean);
    setRenaming(false);
    baller.current?.play('jump');
  };

  const step = (d: number) => {
    setI((n) => (n + d + DEFAULT_AVATARS.length) % DEFAULT_AVATARS.length);
    baller.current?.play('spin');
  };
  const stepRef = useRef(step);
  stepRef.current = step;

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > SWIPE_PX) stepRef.current(g.dx < 0 ? 1 : -1);
        },
      }),
    [],
  );

  const go = async () => {
    const p = nameProblem(value);
    if (p) {
      setProblem(b.problems[p]);
      return;
    }
    setBusy(true);
    setProblem(null);
    if (style.key !== current?.key && !(await pickAvatar(style.key))) {
      setBusy(false);
      setProblem(b.problems.failed);
      return;
    }
    const r = await saveName(cleanName(value));
    if (r !== 'ok') {
      setBusy(false);
      setProblem(r === 'notAllowed' ? b.problems.notAllowed : r === 'bad' ? b.problems.chars : b.problems.failed);
      return;
    }
    baller.current?.play('jump');
    setTimeout(onDone, DONE_MS);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        {onLater ? (
          <Pressable accessibilityRole="button" onPress={onLater} hitSlop={10} style={[styles.later, laterLabel ? styles.back : null]}>
            <Text style={styles.laterText}>{laterLabel ?? b.later}</Text>
          </Pressable>
        ) : null}
        <View style={styles.head}>
          <Text style={styles.title}>{profile ? b.edit : b.meet}</Text>
          <Text style={styles.sub}>{b.meetSub}</Text>
        </View>

        <View style={[styles.stage, dressed && styles.stageDressed]}>
          {dressed ? <CardBackground bg={preview.background} stage /> : <View style={styles.glow} pointerEvents="none" />}
          <Arrow label={b.prev} glyph="‹" onPress={() => step(-1)} />
          <View {...swipe.panHandlers} style={styles.ball}>
            <Baller
              ref={baller}
              look={style.look}
              size={SIZE}
              kit={dressed ? preview.kit : kit}
              gear={dressed ? preview.gear : gear}
              frame={dressed ? preview.frame : frame}
              effect={dressed ? preview.effect : null}
              enter="drop"
              pokeable
            />
          </View>
          <Arrow label={b.next} glyph="›" onPress={() => step(1)} />
        </View>
        <Text style={styles.swipe}>{b.swipe}</Text>

        <View style={styles.name}>
          {!renaming && saved ? (
            <View style={styles.named}>
              <Text style={styles.namedText} numberOfLines={1}>
                {saved}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => setRenaming(true)} onPressIn={rename.onPressIn} onPressOut={rename.onPressOut} hitSlop={8}>
                <Animated.View style={[styles.renamePill, rename.style]}>
                  <Text style={styles.renameText}>{b.rename}</Text>
                </Animated.View>
              </Pressable>
            </View>
          ) : (
            <>
          <Text style={styles.nameTitle}>{b.nameTitle}</Text>
          <TextInput
            value={value}
            onChangeText={(v) => {
              setValue(v);
              setProblem(null);
            }}
            maxLength={20}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => void (profile ? saveRename() : go())}
            autoFocus={profile}
            style={styles.input}
            accessibilityLabel={b.nameTitle}
          />
          <Text style={problem ? styles.problem : styles.hint}>{problem ?? b.nameHint}</Text>
            </>
          )}
          {!renaming && problem ? <Text style={styles.problem}>{problem}</Text> : null}
        </View>

        {!profile || renaming ? (
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void (profile ? saveRename() : go())} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
            <Animated.View style={[styles.cta, busy && styles.ctaBusy, press.style]}>
              <Text style={styles.ctaText}>{busy ? b.saving : profile ? b.save : b.go}</Text>
            </Animated.View>
          </Pressable>
        ) : null}

        {profile && !renaming ? (
          <View style={styles.look}>
            <Text style={styles.lookTitle}>{t.look.title}</Text>
            <LookWardrobe
              who={style.look}
              onPreview={setPreview}
              onPlay={(kind) => baller.current?.play(kind)}
              onToast={(line) => setToast({ text: line, n: Date.now() })}
            />
          </View>
        ) : null}
      </ScrollView>
      {toast ? <Toast key={toast.n} text={toast.text} /> : null}
    </KeyboardAvoidingView>
  );
}

function Arrow({ label, glyph, onPress }: { label: string; glyph: string; onPress: () => void }) {
  const press = usePress(0.9);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} hitSlop={8}>
      <Animated.View style={[styles.arrow, press.style]}>
        <Text style={styles.arrowText}>{glyph}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { flexGrow: 1, paddingHorizontal: 20, gap: 18 },
  later: { alignSelf: 'flex-end', minHeight: 32, justifyContent: 'center' },
  // «‹ Πίσω» sits where back always sits
  back: { alignSelf: 'flex-start' },
  laterText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.mist },
  head: { gap: 8 },
  title: { ...text.title, color: colors.paper },
  sub: { ...text.subtitle, color: colors.mist },
  stage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  // dressed: the background you look at, as on Εμφάνιση
  stageDressed: { borderRadius: 28, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 20 },
  look: { gap: 14, marginTop: 8 },
  lookTitle: { ...text.heading, color: colors.paper },
  glow: { position: 'absolute', alignSelf: 'center', left: '50%', marginLeft: -150, width: 300, height: 300, borderRadius: 150, backgroundColor: colors.paper, opacity: 0.06 },
  ball: { width: SIZE, height: SIZE },
  arrow: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.inkLine, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontFamily: fonts.bodyBold, fontSize: 24, lineHeight: 26, color: colors.paper },
  swipe: { ...text.meta, color: colors.mist, textAlign: 'center', marginTop: -8 },
  name: { gap: 8 },
  nameTitle: { ...text.heading, color: colors.paper },
  named: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  namedText: { ...text.heading, flex: 1, color: colors.paper },
  renamePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: colors.inkLine },
  renameText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.paper },
  input: {
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.paper,
    fontFamily: fonts.displayHeavy,
    fontSize: 26,
    color: colors.ink,
  },
  hint: { ...text.meta, color: colors.mist },
  problem: { ...text.meta, fontFamily: fonts.bodyBold, color: colors.paper },
  cta: { minHeight: 54, marginTop: 'auto', borderRadius: 999, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  ctaBusy: { opacity: 0.7 },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
});
