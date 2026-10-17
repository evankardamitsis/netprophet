import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LookCategory } from '@netprophet/db';
import { Baller, type BallerHandle } from '../src/components/Baller';
import { CardBackground } from '../src/components/CardBackground';
import { LookBuySheet } from '../src/components/LookBuySheet';
import { LookThumb } from '../src/components/LookParts';
import { TOAST_MS, Toast } from '../src/components/Toast';
import { useCopy } from '../src/i18n';
import { DEFAULT_AVATARS, type AvatarLook } from '../src/lib/avatar';
import { useLook, useMyAvatar } from '../src/lib/data';
import { buySheetOf, ctaOf, findTile, LOOK_TABS, ownedKeys, previewOf, tagOf, tileName, tilesFor, type BuySheet, type Tile, type Tone } from '../src/lib/look';
import { useLookSeen } from '../src/lib/lookSeen';
import { usePress, useStgIn } from '../src/lib/motion';
import { useUnlocks } from '../src/lib/unlocks';
import { colors, fonts, text } from '../src/theme';

/**
 * Εμφάνιση as a dressing room (founder, 17 Oct: "full screen tryouts of stuff"): your Baller stands big under a soft
 * light and wears whatever you tap, with a spin (a win effect plays in full). Tabs and a strip of things below; swipe
 * Baller for the next one. The one button says what happens: «Βάλ’ το», the price, or what earns it. Nothing is bought
 * until you press it. Style only: it never changes level, votes or the Ladder. Your style and name are on «Ο Baller σου».
 */
const BALLER = 200;
const STAGE_H = 300;
const SWIPE_PX = 36;
const STG_MS = 450;

export default function LookScreen() {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const { look, refresh, equip } = useLook();
  const { markSeen } = useLookSeen();
  const myAvatar = useMyAvatar();
  const who = myAvatar.avatar?.look ?? DEFAULT_AVATARS[0]!.look;
  const { has } = useUnlocks();
  const tabs = LOOK_TABS.filter((c) => c !== 'win_effect' || has('win_effect'));
  const [tab, setTab] = useState<LookCategory>('gear');
  /** per tab: the thing picked (undefined: the one you wear) */
  const [picks, setPicks] = useState<Partial<Record<LookCategory, string | null>>>({});
  const [sheet, setSheet] = useState<BuySheet | null>(null);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const baller = useRef<BallerHandle>(null);
  const back = usePress();
  const cta = usePress();

  useFocusEffect(
    useCallback(() => {
      void refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh]),
  );
  // looking at the screen is what clears «Νέο» on Εγώ
  useEffect(() => {
    if (look) markSeen(ownedKeys(look));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look === null]);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const tiles = look ? tilesFor(look, tab) : [];
  const sel = look ? findTile(look, tab, picks[tab]) : null;
  const preview = look && sel ? previewOf(look, tab, sel.key) : null;
  const action = look && sel ? ctaOf(sel, look, t) : null;
  const tag = sel ? tagOf(sel, t) : null;

  const pick = (tile: Tile) => {
    setPicks((p) => ({ ...p, [tile.category]: tile.key }));
    // a win effect is a celebration: Baller plays it in full; anything else it spins into
    baller.current?.play(tile.category === 'win_effect' && tile.key ? 'jump' : 'spin');
  };
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;
  const selRef = useRef(sel);
  selRef.current = sel;

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) < SWIPE_PX) return;
          const list = tilesRef.current;
          const at = list.findIndex((x) => x.key === selRef.current?.key);
          const next = list[(at + (g.dx < 0 ? 1 : -1) + list.length) % list.length];
          if (next) pickRef.current(next);
        },
      }),
    [],
  );

  const onCta = () => {
    if (!look || !sel || !action) return;
    if (action.kind === 'wear') {
      void equip(sel.category, sel.key).then((ok) => {
        if (ok) baller.current?.play('jump');
        setToast({ text: ok ? t.look.toast : t.look.error, n: Date.now() });
      });
    } else if (action.kind === 'buy' && sel.item) {
      setSheet(buySheetOf(sel.item, t));
    }
  };
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/me'));
  const label = !action ? '' : action.kind === 'wear' ? t.look.wear : action.kind === 'worn' ? t.look.worn : action.kind === 'buy' ? action.label : (tag?.text ?? '');

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

        {look && sel && preview ? (
          <>
            {/* the stage: the background you look at behind a soft light, Baller big in the middle */}
            <View style={styles.stage} {...swipe.panHandlers}>
              <CardBackground bg={preview.background} stage />
              <Baller ref={baller} look={who} size={BALLER} kit={preview.kit} gear={preview.gear} frame={preview.frame} effect={preview.effect} pokeable />
            </View>
            <View style={styles.named}>
              <Text style={styles.name}>{tileName(sel, t)}</Text>
              {tag && tag.text ? <Tag text={tag.text} tone={tag.tone} /> : null}
              <Text style={styles.swipe}>{t.look.swipe}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {tabs.map((c) => (
                <Pressable key={c} accessibilityRole="tab" accessibilityState={{ selected: tab === c }} onPress={() => setTab(c)} style={[styles.tab, tab === c && styles.tabOn]}>
                  <Text style={[styles.tabText, tab === c && styles.tabTextOn]}>{t.look.tabs[c]}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView key={tab} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {tiles.map((tile, i) => (
                <StripCell key={tile.key ?? 'none'} i={i} tile={tile} on={sel.key === tile.key} worn={(look.equipped[tab] ?? null) === tile.key} onPress={() => pick(tile)} who={who} />
              ))}
            </ScrollView>

            {action && label ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: action.kind === 'worn' || action.kind === 'none' }}
                disabled={action.kind === 'worn' || action.kind === 'none'}
                onPress={onCta}
                onPressIn={cta.onPressIn}
                onPressOut={cta.onPressOut}
              >
                <Animated.View style={[styles.cta, action.kind === 'worn' ? styles.ctaWorn : action.kind === 'none' ? styles.ctaEarn : styles.ctaBlue, cta.style]}>
                  <Text style={[styles.ctaText, action.kind === 'worn' && styles.ctaTextWorn, action.kind === 'none' && styles.ctaTextEarn]}>{label}</Text>
                </Animated.View>
              </Pressable>
            ) : null}
            <Text style={styles.footnote}>{t.look.footnote}</Text>
          </>
        ) : null}
      </ScrollView>
      {toast ? <Toast key={toast.n} text={toast.text} /> : null}
      <LookBuySheet
        sheet={sheet}
        onClose={() => setSheet(null)}
        owned={async (key) => {
          const fresh = await refresh();
          return fresh?.items.some((i) => i.key === key && i.owned) ?? false;
        }}
        onBought={() => {
          baller.current?.play('jump');
          setToast({ text: t.look.bought, n: Date.now() });
        }}
      />
    </View>
  );
}

const TONE: Record<Tone, { bg: string; fg: string; border: string; dashed?: boolean }> = {
  free: { bg: 'transparent', fg: colors.mist, border: colors.inkLine },
  earned: { bg: colors.lime, fg: colors.ink, border: colors.lime },
  bought: { bg: colors.inkRaised, fg: colors.lime, border: colors.inkRaised },
  price: { bg: 'transparent', fg: colors.paper, border: colors.paper },
  locked: { bg: 'transparent', fg: colors.mist, border: colors.muted, dashed: true },
};

function Tag({ text: label, tone }: { text: string; tone: Tone }) {
  const s = TONE[tone];
  return (
    <View style={[styles.tag, { backgroundColor: s.bg, borderColor: s.border, borderStyle: s.dashed ? 'dashed' : 'solid' }]}>
      <Text style={[styles.tagText, { color: s.fg }]}>{label}</Text>
    </View>
  );
}

function StripCell({ i, tile, on, worn, onPress, who }: { i: number; tile: Tile; on: boolean; worn: boolean; onPress: () => void; who: AvatarLook }) {
  const t = useCopy();
  const enter = useStgIn(STG_MS - 50, 60 + Math.min(i, 8) * 40);
  const press = usePress(0.94);
  return (
    <Animated.View style={enter}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={tileName(tile, t)} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.cell, on && styles.cellOn, press.style]}>
          <LookThumb tile={tile} who={who} />
          <Text style={styles.cellName} numberOfLines={1}>
            {tileName(tile, t)}
          </Text>
          {worn ? <View style={styles.wornDot} /> : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { paddingHorizontal: 20, gap: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 },
  topLink: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
  title: { ...text.title, color: colors.paper },
  stage: { height: STAGE_H, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: STAGE_H * 0.05, backgroundColor: colors.ink },
  named: { alignItems: 'center', gap: 6 },
  name: { ...text.heading, color: colors.paper, textAlign: 'center' },
  swipe: { ...text.meta, color: colors.mist },
  tag: { minHeight: 26, paddingVertical: 2, paddingHorizontal: 10, borderRadius: 999, borderWidth: 2, justifyContent: 'center' },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 15 },
  tabs: { gap: 6 },
  tab: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inkRaised },
  tabOn: { backgroundColor: colors.paper },
  tabText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.paper },
  tabTextOn: { color: colors.ink },
  strip: { gap: 10, paddingVertical: 2 },
  // the one you look at is whole and lifted; the rest wait a little dimmer
  cell: { width: 96, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 20, backgroundColor: colors.paper, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', gap: 6, opacity: 0.72 },
  cellOn: { opacity: 1, borderColor: colors.white, transform: [{ scale: 1.04 }] },
  cellName: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink, textAlign: 'center' },
  wornDot: { position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },
  cta: { minHeight: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ctaBlue: { backgroundColor: colors.blue },
  ctaWorn: { backgroundColor: colors.inkRaised },
  ctaEarn: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.inkLine },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white, textAlign: 'center' },
  ctaTextWorn: { color: colors.lime },
  ctaTextEarn: { color: colors.mist },
  footnote: { ...text.meta, color: colors.mist, textAlign: 'center' },
});
