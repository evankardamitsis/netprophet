import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import type { BadgeRow } from '@netprophet/db';
import { greekCaps } from '@netprophet/copy';
import { BadgeDots, GrowBar } from '../../src/components/BadgeParts';
import { TOAST_MS, Toast } from '../../src/components/Toast';
import { useCopy } from '../../src/i18n';
import { badgeName, earned, leftLine, locked, moreLine, pct, pickSelected, ruleLine, tierOfLine, tierStyle, tileTierLine } from '../../src/lib/badges';
import { useBadges } from '../../src/lib/data';
import { usePress, useStgIn } from '../../src/lib/motion';
import { alpha, colors, fonts } from '../../src/theme';

/**
 * Badges (prototype V2): the selected badge in a big card (rule, tier, bar, «Βάλ' το στην κάρτα» for the four that
 * can be worn), then the earned ones and the locked ones in a grid. Tapping a tile selects it. Badges never give
 * points or change the level, and the footer says so.
 */
const STG_MS = 450;
const PAD = 20;
const GAP = 10;

export default function BadgesScreen() {
  const t = useCopy();
  const { key } = useLocalSearchParams<{ key?: string }>();
  const { badges, refresh, wear } = useBadges();
  const [picked, setPicked] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const back = usePress();

  useFocusEffect(
    useCallback(() => {
      void refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh]),
  );
  // a new `key` from the Εγώ tiles replaces the last pick
  useEffect(() => {
    setPicked(key ?? null);
  }, [key]);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const list = badges?.badges ?? [];
  const sel = pickSelected(list, picked ?? undefined);
  const select = (k: string) => {
    setPicked(k);
    scroll.current?.scrollTo({ y: 0, animated: true });
  };
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/me'));
  const colW = (width - PAD * 2 - GAP) / 2;
  const have = earned(list);
  const lockedList = locked(list);
  let n = 0;

  return (
    <View style={styles.screen}>
      <ScrollView ref={scroll} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={goBack} onPressIn={back.onPressIn} onPressOut={back.onPressOut} style={styles.backHit}>
          <Animated.Text style={[styles.back, back.style]}>{t.badges.back}</Animated.Text>
        </Pressable>
        <Text style={styles.title}>{t.badges.title}</Text>
        {sel ? (
          <SelectedCard
            b={sel}
            worn={badges?.worn === sel.key}
            onWear={() => void wear(sel.key).then((text) => text && setToast({ text, n: Date.now() }))}
          />
        ) : null}
        {have.length > 0 ? (
          <>
            <Text style={styles.kicker}>{greekCaps(t.badges.earned)}</Text>
            <View style={styles.grid}>
              {have.map((b) => (
                <GridCell key={b.key} width={colW} selected={sel?.key === b.key} i={n++} onPress={() => select(b.key)}>
                  <EarnedTile b={b} />
                </GridCell>
              ))}
            </View>
          </>
        ) : null}
        {lockedList.length > 0 ? (
          <>
            <Text style={styles.kicker}>{greekCaps(t.badges.locked)}</Text>
            <View style={styles.grid}>
              {lockedList.map((b) => (
                <GridCell key={b.key} width={colW} selected={sel?.key === b.key} i={n++} onPress={() => select(b.key)}>
                  <LockedTile b={b} />
                </GridCell>
              ))}
            </View>
          </>
        ) : null}
        {list.length > 0 ? <Text style={styles.footer}>{t.badges.footer}</Text> : null}
      </ScrollView>
      {toast ? <Toast key={toast.n} text={toast.text} /> : null}
    </View>
  );
}

/** the big card for the selected badge */
function SelectedCard({ b, worn, onWear }: { b: BadgeRow; worn: boolean; onWear: () => void }) {
  const t = useCopy();
  const st = tierStyle(b.tier);
  const enter = useStgIn(STG_MS, 80);
  const press = usePress();
  return (
    <Animated.View
      key={b.key}
      style={[styles.sel, { backgroundColor: b.tier === 0 ? colors.white : st.bg, borderColor: st.border, borderWidth: st.borderWidth, borderStyle: st.dashed ? 'dashed' : 'solid' }, enter]}
    >
      <Text style={styles.selName}>{badgeName(b.key, t)}</Text>
      <View style={styles.selTier}>
        <BadgeDots tier={b.tier} size={16} border={2} color={b.tier === 0 ? colors.muted : st.dot} gap={4} />
        <Text style={styles.selTierText}>{tierOfLine(b, t)}</Text>
      </View>
      <Text style={styles.selRule}>{ruleLine(b, t)}</Text>
      <GrowBar value={pct(b)} height={8} track={alpha(colors.ink, 0.14)} fill={colors.ink} delay={200} />
      <Text style={styles.selLeft}>{leftLine(b, t)}</Text>
      {b.on_card && b.tier > 0 ? (
        worn ? (
          <View style={[styles.wearBtn, styles.wearOn]}>
            <Text style={[styles.wearText, { color: colors.lime }]}>{t.badges.worn}</Text>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={onWear} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
            <Animated.View style={[styles.wearBtn, styles.wearOff, press.style]}>
              <Text style={[styles.wearText, { color: colors.white }]}>{t.badges.wear}</Text>
            </Animated.View>
          </Pressable>
        )
      ) : null}
    </Animated.View>
  );
}

/** a grid slot: a transparent frame that turns blue when selected, 2px off the tile */
function GridCell({ width, selected, i, onPress, children }: { width: number; selected: boolean; i: number; onPress: () => void; children: ReactNode }) {
  const enter = useStgIn(STG_MS, 150 + Math.min(i, 12) * 40);
  const press = usePress(0.96);
  return (
    <Animated.View style={[{ width }, enter]}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.cell, { borderColor: selected ? colors.blue : 'transparent' }, press.style]}>{children}</Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function EarnedTile({ b }: { b: BadgeRow }) {
  const t = useCopy();
  const st = tierStyle(b.tier);
  return (
    <View style={[styles.tile, { backgroundColor: st.bg, borderColor: st.border, borderWidth: st.borderWidth }]}>
      <Text style={[styles.tileName, { color: st.text }]}>{badgeName(b.key, t)}</Text>
      <View style={styles.tileFoot}>
        <BadgeDots tier={b.tier} size={11} border={2} color={st.dot} gap={3} />
        <Text style={[styles.tileTier, { color: st.text }]} numberOfLines={1}>
          {tileTierLine(b, t)}
        </Text>
      </View>
    </View>
  );
}

function LockedTile({ b }: { b: BadgeRow }) {
  const t = useCopy();
  const st = tierStyle(0);
  return (
    <View style={[styles.tile, { borderColor: st.border, borderWidth: st.borderWidth, borderStyle: 'dashed' }]}>
      <Text style={[styles.tileName, { color: st.text }]}>{badgeName(b.key, t)}</Text>
      <View style={styles.lockedFoot}>
        <GrowBar value={pct(b)} height={6} track={colors.navLine} fill={colors.muted} delay={300} />
        <Text style={styles.lockedLeft}>{moreLine(b, t)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingTop: 8, paddingHorizontal: PAD, paddingBottom: 32, gap: 12 },
  backHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  title: { fontFamily: fonts.displayHeavy, fontSize: 60, lineHeight: 60, paddingBottom: 12, marginBottom: -15, color: colors.ink },
  sel: { padding: 18, borderRadius: 26, gap: 10 },
  selName: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 44, paddingBottom: 9, marginBottom: -12, color: colors.ink },
  selTier: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selTierText: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  selRule: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.ink },
  selLeft: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  wearBtn: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 2 },
  wearOn: { backgroundColor: colors.ink },
  wearOff: { backgroundColor: colors.blue },
  wearText: { fontFamily: fonts.bodyBold, fontSize: 16 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.blue, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: { margin: -5, padding: 2, borderWidth: 3, borderRadius: 23 },
  tile: { minHeight: 108, padding: 12, borderRadius: 18, justifyContent: 'space-between', gap: 8 },
  tileName: { fontFamily: fonts.displayHeavy, fontSize: 21, lineHeight: 21, paddingBottom: 4, marginBottom: -4 },
  tileFoot: { gap: 4 },
  tileTier: { fontFamily: fonts.bodyBold, fontSize: 12 },
  lockedFoot: { gap: 6 },
  lockedLeft: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  footer: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft, marginTop: 6 },
});
