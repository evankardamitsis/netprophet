import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import type { LookCategory } from '@netprophet/db';
import { LookBuySheet } from './LookBuySheet';
import { LookThumb } from './LookParts';
import { useCopy } from '../i18n';
import type { AvatarLook } from '../lib/avatar';
import { useLook } from '../lib/data';
import { buySheetOf, ctaOf, findTile, LOOK_TABS, markerOf, ownedKeys, previewOf, tagOf, tileName, tilesFor, type BuySheet, type LookPreview, type Tile, type Tone } from '../lib/look';
import { useLookSeen } from '../lib/lookSeen';
import { usePress, useStgIn } from '../lib/motion';
import { useUnlocks } from '../lib/unlocks';
import { colors, fonts, text } from '../theme';

/**
 * The wardrobe of Εμφάνιση: the tabs, a strip of things, the name and tag of the one you look at, and the one button
 * («Βάλ’ το», the price, or what earns it). The screen around it owns the stage: it gets the preview to dress Baller
 * in, a cue to spin or jump, and the toasts to show. Used by Εμφάνιση and by «Ο Baller σου» (founder, 18 Oct: "it makes
 * sense to see everything there").
 */
const STG_MS = 450;
/** after a purchase the webhook was slow: ask the wardrobe again this often, this many times (two minutes) */
const LATE_MS = 5000;
const LATE_TRIES = 24;

export interface WardrobeHandle {
  /** the next (1) or previous (-1) thing in the open tab, for a swipe on the stage */
  step: (d: number) => void;
}

interface Props {
  who: AvatarLook;
  onPreview: (preview: LookPreview | null) => void;
  onPlay: (kind: 'spin' | 'jump') => void;
  onToast: (text: string) => void;
}

export const LookWardrobe = forwardRef<WardrobeHandle, Props>(function LookWardrobe({ who, onPreview, onPlay, onToast }, ref) {
  const t = useCopy();
  const { look, refresh, equip } = useLook();
  const { markSeen } = useLookSeen();
  const { has } = useUnlocks();
  const tabs = LOOK_TABS.filter((c) => c !== 'win_effect' || has('win_effect'));
  const [tab, setTab] = useState<LookCategory>('gear');
  /** per tab: the thing picked (undefined: the one you wear) */
  const [picks, setPicks] = useState<Partial<Record<LookCategory, string | null>>>({});
  const [sheet, setSheet] = useState<BuySheet | null>(null);
  /** what the open sheet sells, to put on once it is bought */
  const buying = useRef<{ category: LookCategory; key: string } | null>(null);
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (waiting.current) clearTimeout(waiting.current);
  }, []);
  const cta = usePress();

  useFocusEffect(
    useCallback(() => {
      void refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh]),
  );
  // looking at the wardrobe is what clears «Νέο» on Εγώ
  useEffect(() => {
    if (look) markSeen(ownedKeys(look));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look === null]);

  const tiles = look ? tilesFor(look, tab) : [];
  const sel = look ? findTile(look, tab, picks[tab]) : null;
  const preview = look && sel ? previewOf(look, tab, sel.key) : null;
  const action = look && sel ? ctaOf(sel, look, t) : null;
  const tag = sel ? tagOf(sel, t) : null;

  const previewKey = preview ? JSON.stringify(preview) : '';
  useEffect(() => {
    onPreview(preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  const pick = (tile: Tile) => {
    setPicks((p) => ({ ...p, [tile.category]: tile.key }));
    // a win effect is a celebration: Baller plays it in full; anything else it spins into
    onPlay(tile.category === 'win_effect' && tile.key ? 'jump' : 'spin');
  };
  const latest = useRef({ tiles, sel, pick });
  latest.current = { tiles, sel, pick };
  useImperativeHandle(ref, () => ({
    step: (d: number) => {
      const { tiles: list, sel: on, pick: go } = latest.current;
      const at = list.findIndex((x) => x.key === on?.key);
      const next = list[(at + d + list.length) % list.length];
      if (next) go(next);
    },
  }));

  const onCta = () => {
    if (!look || !sel || !action) return;
    if (action.kind === 'wear') {
      void equip(sel.category, sel.key).then((ok) => {
        if (ok) onPlay('jump');
        onToast(ok ? t.look.toast : t.look.error);
      });
    } else if (action.kind === 'buy' && sel.item) {
      buying.current = { category: sel.category, key: sel.key ?? '' };
      setSheet(buySheetOf(sel.item, t));
    }
  };
  const label = !action ? '' : action.kind === 'wear' ? t.look.wear : action.kind === 'worn' ? t.look.worn : action.kind === 'buy' ? action.label : (tag?.text ?? '');

  if (!look || !sel) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.named}>
        <Text style={styles.name}>{tileName(sel, t)}</Text>
        {tag && tag.text ? <Tag text={tag.text} tone={tag.tone} /> : null}
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

      <LookBuySheet
        sheet={sheet}
        onClose={() => setSheet(null)}
        owned={async (key) => {
          const fresh = await refresh();
          return fresh?.items.some((i) => i.key === key && i.owned) ?? false;
        }}
        onBought={(landed) => {
          const item = buying.current;
          if (!item) return;
          // bought means worn: Baller puts it on the moment the wardrobe has it (founder, 29 Oct)
          const putOn = () =>
            void equip(item.category, item.key).then((ok) => {
              onPlay('jump');
              onToast(ok ? t.look.boughtOn : t.look.bought);
            });
          if (landed) return putOn();
          onToast(t.look.boughtLate);
          let tries = 0;
          const again = async () => {
            const fresh = await refresh().catch(() => null);
            if (fresh?.items.some((i) => i.key === item.key && i.owned)) return putOn();
            if (++tries < LATE_TRIES) waiting.current = setTimeout(() => void again(), LATE_MS);
          };
          waiting.current = setTimeout(() => void again(), LATE_MS);
        }}
      />
    </View>
  );
});

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
  // what it is to you, without tapping: ✓ yours, «Δωρεάν», «Κέρδισέ το», or the price
  const mark = markerOf(tile, t);
  const name = tileName(tile, t);
  return (
    <Animated.View style={enter}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={mark ? `${name}, ${mark.text}` : name} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.cell, on && styles.cellOn, press.style]}>
          <LookThumb tile={tile} who={who} />
          <Text style={styles.cellName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.mark, mark?.kind === 'price' && styles.markPrice]} numberOfLines={1}>
            {mark && mark.kind !== 'owned' ? mark.text : ' '}
          </Text>
          {mark?.kind === 'owned' ? (
            <View style={styles.ownedBadge}>
              <Text style={styles.ownedGlyph}>✓</Text>
            </View>
          ) : null}
          {worn ? <View style={styles.wornDot} /> : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  named: { alignItems: 'center', gap: 6 },
  name: { ...text.heading, color: colors.paper, textAlign: 'center' },
  tag: { minHeight: 26, paddingVertical: 2, paddingHorizontal: 10, borderRadius: 999, borderWidth: 2, justifyContent: 'center' },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 15 },
  tabs: { gap: 6 },
  tab: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inkRaised },
  tabOn: { backgroundColor: colors.paper },
  tabText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.paper },
  tabTextOn: { color: colors.ink },
  strip: { gap: 10, paddingVertical: 2 },
  // the one you look at is whole and lifted; the rest wait a little dimmer
  cell: { width: 96, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 20, backgroundColor: colors.paper, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', gap: 6, opacity: 0.72 },
  cellOn: { opacity: 1, borderColor: colors.white, transform: [{ scale: 1.04 }] },
  cellName: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink, textAlign: 'center' },
  // the status line under the name: quiet for «Δωρεάν» and «Κέρδισέ το», ink for a price
  mark: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14, color: colors.slate, textAlign: 'center', marginTop: -4 },
  markPrice: { fontFamily: fonts.bodyBold, color: colors.ink },
  // yours: a small lime ✓ (lime is earned or "what happened"), opposite the worn dot
  ownedBadge: { position: 'absolute', top: 6, left: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.lime, borderWidth: 1.5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  ownedGlyph: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 13, color: colors.ink },
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
