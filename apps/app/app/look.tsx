import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Baller, type BallerHandle } from '../src/components/Baller';
import { CardBackground } from '../src/components/CardBackground';
import { LookWardrobe, type WardrobeHandle } from '../src/components/LookWardrobe';
import { TOAST_MS, Toast } from '../src/components/Toast';
import { useCopy } from '../src/i18n';
import { DEFAULT_AVATARS } from '../src/lib/avatar';
import { useMyAvatar } from '../src/lib/data';
import type { LookPreview } from '../src/lib/look';
import { usePress } from '../src/lib/motion';
import { colors, fonts, text } from '../src/theme';

/**
 * Εμφάνιση as a dressing room (founder, 17 Oct: "full screen tryouts of stuff"): your Baller stands big under a soft
 * light and wears whatever you tap, with a spin (a win effect plays in full). The wardrobe below (tabs, a strip, the
 * one button) is shared with «Ο Baller σου»; swipe Baller for the next one. Nothing is bought until you press it.
 * Style only: it never changes level, votes or the Ladder.
 */
const BALLER = 200;
const STAGE_H = 300;
const SWIPE_PX = 36;

export default function LookScreen() {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const myAvatar = useMyAvatar();
  const who = myAvatar.avatar?.look ?? DEFAULT_AVATARS[0]!.look;
  const [preview, setPreview] = useState<LookPreview | null>(null);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const baller = useRef<BallerHandle>(null);
  const wardrobe = useRef<WardrobeHandle>(null);
  const back = usePress();

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) >= SWIPE_PX) wardrobe.current?.step(g.dx < 0 ? 1 : -1);
        },
      }),
    [],
  );
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/me'));

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" onPress={goBack} onPressIn={back.onPressIn} onPressOut={back.onPressOut} hitSlop={8}>
            <Animated.Text style={[styles.topLink, back.style]}>{t.look.back}</Animated.Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/baller')} hitSlop={8}>
            <Text style={styles.topLink}>{t.look.ballerLink}</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>{t.look.title}</Text>

        {preview ? (
          <>
            {/* the stage: the background you look at behind a soft light, Baller big in the middle */}
            <View style={styles.stage} {...swipe.panHandlers}>
              <CardBackground bg={preview.background} stage />
              <Baller ref={baller} look={who} size={BALLER} kit={preview.kit} gear={preview.gear} frame={preview.frame} effect={preview.effect} pokeable />
            </View>
            <Text style={styles.swipe}>{t.look.swipe}</Text>
          </>
        ) : null}
        <LookWardrobe
          ref={wardrobe}
          who={who}
          onPreview={setPreview}
          onPlay={(kind) => baller.current?.play(kind)}
          onToast={(line) => setToast({ text: line, n: Date.now() })}
        />
      </ScrollView>
      {toast ? <Toast key={toast.n} text={toast.text} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { paddingHorizontal: 20, gap: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 },
  topLink: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
  title: { ...text.title, color: colors.paper },
  stage: { height: STAGE_H, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: STAGE_H * 0.05, backgroundColor: colors.ink },
  swipe: { ...text.meta, color: colors.mist, textAlign: 'center', marginTop: -6 },
});
