import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import type { LookCategory } from '@netprophet/db';
import { CardBackground } from '../../src/components/CardBackground';
import { CardFrame, namePlate } from '../../src/components/CardFrame';
import { LookBuySheet } from '../../src/components/LookBuySheet';
import { KitSwatch, LookThumb } from '../../src/components/LookParts';
import { TOAST_MS, Toast } from '../../src/components/Toast';
import { useCopy } from '../../src/i18n';
import { useLook, useMePage, useMyAvatar } from '../../src/lib/data';
import { Avatar } from '../../src/components/Avatar';
import { DEFAULT_AVATARS } from '../../src/lib/avatar';
import { buySheetOf, ctaOf, findTile, LOOK_TABS, ownedKeys, previewOf, tagOf, tileName, tilesFor, type BuySheet, type Tile, type Tone } from '../../src/lib/look';
import { useLookSeen } from '../../src/lib/lookSeen';
import { usePress, useStgIn } from '../../src/lib/motion';
import { colors, fonts } from '../../src/theme';

/**
 * Εμφάνιση (prototype V2, the look screen): a preview of your card, the selected item with its tag and button, three
 * tabs (Κορνίζες, Φόντα, Ρούχα & ρακέτα) and a grid. Tapping a tile previews it; «Βάλ' το» puts it on. Earned items
 * you do not have show what earns them; bought ones show their price and open a sheet (buying comes with the payment
 * provider). Style only: it never changes level, votes or the Ladder.
 */
const STG_MS = 450;
const PAD = 20;
const GAP = 10;
const PREVIEW_H = 230;

export default function LookScreen() {
  const t = useCopy();
  const { look, refresh, equip } = useLook();
  const { view } = useMePage();
  const { markSeen } = useLookSeen();
  // «Παίκτης» (your drawn avatar) comes first; the Εγώ card's picture opens it directly
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<LookCategory | 'avatar'>(params.tab === 'avatar' ? 'avatar' : 'frame');
  const myAvatar = useMyAvatar();
  /** per tab: the tile picked (undefined: the one you wear) */
  const [picks, setPicks] = useState<Partial<Record<LookCategory, string | null>>>({});
  const [sheet, setSheet] = useState<BuySheet | null>(null);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const back = usePress();
  const { width } = useWindowDimensions();
  const colW = (width - PAD * 2 - GAP) / 2;

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

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/me'));
  const lookTab: LookCategory = tab === 'avatar' ? 'frame' : tab;
  const sel = look ? findTile(look, lookTab, picks[lookTab]) : null;
  const preview = look && sel ? previewOf(look, lookTab, sel.key) : null;
  const cta = look && sel ? ctaOf(sel, look, t) : null;
  const tag = sel ? tagOf(sel, t) : null;
  const onCta = () => {
    if (!look || !sel || !cta) return;
    if (cta.kind === 'wear') {
      void equip(sel.category, sel.key).then((ok) => setToast({ text: ok ? t.look.toast : t.look.error, n: Date.now() }));
    } else if (cta.kind === 'buy' && sel.item) {
      setSheet(buySheetOf(sel.item, t));
    }
  };
  const first = view?.first ?? '';
  const name = first ? `${first}${view?.surname ? ` ${view.surname[0]}.` : ''}` : '';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={goBack} onPressIn={back.onPressIn} onPressOut={back.onPressOut} style={styles.backHit}>
          <Animated.Text style={[styles.back, back.style]}>{t.look.back}</Animated.Text>
        </Pressable>
        <Text style={styles.title}>{t.look.title}</Text>
        {look && sel && preview && cta ? (
          <>
            {tab === 'avatar' ? null : (
              <>
                <PreviewCard frame={preview.frame} bg={preview.background} kit={preview.kit} level={view?.level ?? null} name={name} />
                <SelectedCard sel={sel} tag={tag} cta={cta} onCta={onCta} />
              </>
            )}
            <View style={styles.seg}>
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'avatar' }} onPress={() => setTab('avatar')} style={[styles.segBtn, tab === 'avatar' && styles.segOn]}>
                <Text style={[styles.segText, tab === 'avatar' && styles.segTextOn]}>{t.look.avatarTab}</Text>
              </Pressable>
              {LOOK_TABS.map((c) => (
                <Pressable key={c} accessibilityRole="tab" accessibilityState={{ selected: tab === c }} onPress={() => setTab(c)} style={[styles.segBtn, tab === c && styles.segOn]}>
                  <Text style={[styles.segText, tab === c && styles.segTextOn]}>{t.look.tabs[c]}</Text>
                </Pressable>
              ))}
            </View>
            {tab === 'avatar' ? (
              <AvatarPicker
                width={width - PAD * 2}
                current={myAvatar.avatar?.key ?? null}
                kit={look.equipped.kit}
                onPick={(key) => void myAvatar.pick(key).then((ok) => setToast({ text: ok ? t.look.toast : t.look.error, n: Date.now() }))}
              />
            ) : (
            <View key={tab} style={styles.grid}>
              {tilesFor(look, tab).map((tile, i) => (
                <GridCell
                  key={tile.key ?? 'none'}
                  width={colW}
                  i={i}
                  tile={tile}
                  selected={sel.key === tile.key}
                  worn={look.equipped[tab] === tile.key}
                  onPress={() => setPicks((p) => ({ ...p, [tab]: tile.key }))}
                />
              ))}
            </View>
            )}
            <Text style={styles.footnote}>{t.look.footnote}</Text>
          </>
        ) : null}
      </ScrollView>
      {toast ? <Toast key={toast.n} text={toast.text} /> : null}
      <LookBuySheet sheet={sheet} onClose={() => setSheet(null)} />
    </View>
  );
}

/** «Παίκτης»: the 12 drawn players, yours ringed; a tap puts it on your card at once */
function AvatarPicker({ width, current, kit, onPick }: { width: number; current: string | null; kit: string; onPick: (key: string) => void }) {
  const t = useCopy();
  const size = Math.floor((width - GAP * 3) / 4);
  return (
    <View style={styles.avatarWrap}>
      <Text style={styles.footnote}>{t.look.avatarLine}</Text>
      <View style={styles.grid}>
        {DEFAULT_AVATARS.map((a, i) => (
          <AvatarCell key={a.key} i={i} size={size} on={a.key === current} onPress={() => onPick(a.key)}>
            <Avatar look={a.look} size={size} kit={kit} />
          </AvatarCell>
        ))}
      </View>
    </View>
  );
}

function AvatarCell({ i, size, on, onPress, children }: { i: number; size: number; on: boolean; onPress: () => void; children: ReactNode }) {
  const press = usePress();
  const enter = useStgIn(STG_MS, 60 + Math.min(i, 8) * 40);
  return (
    <Animated.View style={enter}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.avatarCell, { width: size, height: size }, on && styles.avatarOn, press.style]}>{children}</Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** the Εγώ card in miniature, wearing what is picked (the level and the name as on Εγώ) */
function PreviewCard({ frame, bg, kit, level, name }: { frame: string | null; bg: string | null; kit: string; level: string | null; name: string }) {
  const t = useCopy();
  const enter = useStgIn(STG_MS, 100);
  const plate = namePlate(frame);
  return (
    <Animated.View style={[styles.preview, enter]}>
      <CardBackground bg={bg} k={0.62} scrim />
      {level ? (
        <View style={styles.pvLevel}>
          <Text style={styles.pvNum}>{level}</Text>
          <Text style={styles.pvWord}>{t.level.label}</Text>
        </View>
      ) : null}
      <View style={styles.pvKit}>
        <KitSwatch kit={kit} size={64} />
      </View>
      {name ? (
        <View style={styles.pvNameWrap}>
          <View style={plate?.box}>
            <Text style={[styles.pvName, plate ? { color: plate.color } : null]}>{name}</Text>
          </View>
        </View>
      ) : null}
      <CardFrame frame={frame} k={0.62} radius={26} animated />
    </Animated.View>
  );
}

const TONE: Record<Tone, { bg: string; fg: string; border: string; dashed?: boolean }> = {
  free: { bg: 'transparent', fg: colors.inkSoft, border: colors.navLine },
  earned: { bg: colors.lime, fg: colors.ink, border: colors.lime },
  bought: { bg: colors.ink, fg: colors.lime, border: colors.ink },
  price: { bg: 'transparent', fg: colors.ink, border: colors.ink },
  locked: { bg: 'transparent', fg: colors.inkSoft, border: colors.muted, dashed: true },
};

function Tag({ text, tone }: { text: string; tone: Tone }) {
  const s = TONE[tone];
  return (
    <View style={[styles.tag, { backgroundColor: s.bg, borderColor: s.border, borderStyle: s.dashed ? 'dashed' : 'solid' }]}>
      <Text style={[styles.tagText, { color: s.fg }]}>{text}</Text>
    </View>
  );
}

/** the selected item: its name, its tag, and the one button */
function SelectedCard({ sel, tag, cta, onCta }: { sel: Tile; tag: { text: string; tone: Tone } | null; cta: ReturnType<typeof ctaOf>; onCta: () => void }) {
  const t = useCopy();
  const enter = useStgIn(STG_MS, 150);
  const press = usePress();
  const worn = cta.kind === 'worn';
  const label = cta.kind === 'wear' ? t.look.wear : cta.kind === 'worn' ? t.look.worn : cta.kind === 'buy' ? cta.label : '';
  return (
    <Animated.View style={[styles.sel, enter]}>
      <View style={styles.selText}>
        <Text style={styles.selName}>{tileName(sel, t)}</Text>
        {tag && tag.text ? <Tag text={tag.text} tone={tag.tone} /> : null}
      </View>
      {cta.kind !== 'none' ? (
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: worn }} disabled={worn} onPress={onCta} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
          <Animated.View style={[styles.cta, worn ? styles.ctaWorn : styles.ctaBlue, press.style]}>
            <Text style={[styles.ctaText, worn && styles.ctaTextWorn]}>{label}</Text>
          </Animated.View>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

function GridCell({ width, i, tile, selected, worn, onPress }: { width: number; i: number; tile: Tile; selected: boolean; worn: boolean; onPress: () => void }) {
  const t = useCopy();
  const enter = useStgIn(STG_MS - 50, 120 + Math.min(i, 10) * 40);
  const press = usePress(0.96);
  const tag = tagOf(tile, t);
  return (
    <Animated.View style={[{ width }, enter]}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.tile, { borderColor: selected ? colors.ink : 'transparent' }, press.style]}>
          <LookThumb tile={tile} />
          <Text style={styles.tileName}>{tileName(tile, t)}</Text>
          {tag && tag.text ? <Tag text={tag.text} tone={tag.tone} /> : null}
          {worn ? (
            <View style={styles.wornPill}>
              <Text style={styles.wornText}>{t.look.worn}</Text>
            </View>
          ) : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingTop: 8, paddingHorizontal: PAD, paddingBottom: 32, gap: 12 },
  backHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  title: { fontFamily: fonts.displayHeavy, fontSize: 60, lineHeight: 60, paddingBottom: 12, marginBottom: -15, color: colors.ink },
  preview: { height: PREVIEW_H, borderRadius: 26, backgroundColor: colors.ink, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pvLevel: { position: 'absolute', top: 14, left: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pvNum: { fontFamily: fonts.displayHeavy, fontSize: 52, lineHeight: 52, paddingBottom: 10, marginBottom: -10, color: colors.lime },
  pvWord: { fontFamily: fonts.displayHeavy, fontSize: 22, paddingBottom: 4, marginBottom: -4, color: colors.paper },
  pvKit: { marginBottom: 20 },
  pvNameWrap: { position: 'absolute', left: 0, right: 0, bottom: 20, alignItems: 'center' },
  pvName: { fontFamily: fonts.displayHeavy, fontSize: 38, lineHeight: 42, paddingBottom: 8, marginBottom: -8, color: colors.paper, paddingHorizontal: 4 },
  sel: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  selText: { flexShrink: 1, gap: 6 },
  selName: { fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 32, paddingBottom: 6, marginBottom: -6, color: colors.ink, paddingTop: 8, marginTop: -8 },
  tag: { alignSelf: 'flex-start', minHeight: 26, paddingVertical: 2, paddingHorizontal: 10, borderRadius: 999, borderWidth: 2, justifyContent: 'center' },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 15 },
  cta: { minHeight: 48, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaBlue: { backgroundColor: colors.blue },
  ctaWorn: { backgroundColor: colors.ink },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },
  ctaTextWorn: { color: colors.lime },
  seg: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 18, backgroundColor: colors.white },
  segBtn: { flex: 1, minHeight: 48, paddingHorizontal: 4, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.ink },
  segText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 15, textAlign: 'center', color: colors.ink },
  segTextOn: { color: colors.paper },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  avatarWrap: { gap: 12 },
  avatarCell: { borderRadius: 999, overflow: 'hidden', borderWidth: 2, borderColor: colors.mist },
  avatarOn: { borderWidth: 4, borderColor: colors.ink },
  tile: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 22, backgroundColor: colors.white, borderWidth: 3, alignItems: 'center', gap: 8 },
  tileName: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 17, textAlign: 'center', color: colors.ink },
  wornPill: { position: 'absolute', top: 8, right: 8, minHeight: 22, paddingHorizontal: 8, borderRadius: 999, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  wornText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.lime },
  footnote: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
});
