import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, Switch, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BadgeDots, GrowBar } from '../../src/components/BadgeParts';
import { QuestsSheet } from '../../src/components/QuestsSheet';
import { FitText } from '../../src/components/FitText';
import { namePlate } from '../../src/components/CardFrame';
import { FlipCard } from '../../src/components/FlipCard';
import { useCopy } from '../../src/i18n';
import { useAuth } from '../../src/lib/auth';
import { useOnboardingGate } from '../../src/lib/onboardingGate';
import { useSoundsOn } from '../../src/lib/sound';
import { useApi, useBaller, useBadges, useBlocks, useLook, useMyLevel, useMePage, usePro, useQuests, useMyAvatar } from '../../src/lib/data';
import { hasNewLook, levelBackOf, type LevelBack } from '../../src/lib/look';
import { useLookSeen } from '../../src/lib/lookSeen';
import { greekCaps } from '@netprophet/copy';
import { LEVEL_MATCHES, LEVEL_VOTES, type MeView } from '../../src/lib/me';
import { badgeName, earned, leftLine, moreLine, nextBadge, pct, tierStyle, tileTierLine } from '../../src/lib/badges';
import { activeLine } from '../../src/lib/pro';
import { meSections, mePageOf } from '../../src/lib/meSections';
import { setNewPlayer, useNewPlayer } from '../../src/lib/newPlayer';
import { useUnlocks } from '../../src/lib/unlocks';
import { usePopIn, usePress, useStgIn } from '../../src/lib/motion';
import type { BadgeRow, GetBadgesResult } from '@netprophet/db';
import { alpha, colors, ease, fonts } from '../../src/theme';
import { Lit } from '../../src/components/Lit';
import { Baller } from '../../src/components/Baller';
import { CardBackground } from '../../src/components/CardBackground';
import type { AvatarLook } from '../../src/lib/avatar';
import { PLAYER_LEVEL_SHOWN } from '../../src/lib/levelShown';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BALLER_OFFERED_KEY, shouldOfferBaller } from '../../src/lib/ballerOffer';
import { useMoments } from '../../src/lib/useMoments';

/** opening Εγώ is the player's own calm moment to meet Baller: it comes this long after the page settles */
const MEET_BALLER_ON_ME_MS = 900;

/**
 * Εγώ (prototype V2, isMeScr), opened from the header's initials. M1 scope: the hero (level, σερί, πόντοι μήνα,
 * name), the σερί with its freezes, «Το σκορ σου», «Οι ψήφοι σου», «Τα ματς σου», «Οι φίλοι σου» and Ρυθμίσεις
 * with Αποσύνδεση, plus «Τι λένε για σένα» (M2) and the «Αποστολές» row (M3). Avatar, stats flip, Εμφάνιση, freeze purchase and badges, then «Πώς σε βλέπουν» (M3).
 * «Πού κερδίζεις», Απολογισμός and Τουρνουά come with their milestones (M2 to M5).
 *
 * Calm pass (founder, 19 Oct): the main page is `meSections` (Baller and name, Level, Αποστολές, «Τα νούμερά σου ›»,
 * Εμφάνιση, a quiet Pro row, Ρυθμίσεις). «Τα νούμερά σου» is ?page=stats: «Τα στατιστικά σου ›», «Η σεζόν σου ›»,
 * then «Οι προβλέψεις σου» (badges, σερί, score, votes, friends).
 */
const STG_MS = 450;
const STAGGER = 70;
/** big text: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;

export default function MeScreen() {
  const t = useCopy();
  const { view, loading, error, refresh } = useMePage();
  const meSeen = useRef(false);
  const quests = useQuests();
  const badges = useBadges();
  const look = useLook();
  const myLevel = useMyLevel();
  const { seen } = useLookSeen();
  const [questsOpen, setQuestsOpen] = useState(false);
  const unlocks = useUnlocks();
  const { has } = unlocks;
  useFocusEffect(
    useCallback(() => {
      void quests.refresh();
      void badges.refresh();
      void look.refresh();
      void myLevel.refresh();
      // σερί, πόντοι and level: the newest get_me, shared with the header (it updates too)
      if (meSeen.current) void refresh(true);
      meSeen.current = true;
      // a vote or a moment may have opened something since last time
      void unlocks.refresh({ afterMoment: true });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quests.refresh, badges.refresh, look.refresh, myLevel.refresh, unlocks.refresh, refresh]),
  );
  // «Τα νούμερά σου» is the same screen with ?page=stats (founder, 14 Oct: Εγώ down to a few rows; 19 Oct: one row)
  const { page } = useLocalSearchParams<{ page?: string }>();
  const statsPage = mePageOf(page) === 'numbers';
  const sections = meSections({
    levelBar: has('level_bar'),
    quests: has('daily_quests'),
    look: has('frames') || has('backgrounds'),
    proOpen: has('pro_sheet'),
  });
  const myAvatar = useMyAvatar();
  const avatarRefresh = myAvatar.refresh;
  useFocusEffect(
    useCallback(() => {
      void avatarRefresh();
    }, [avatarRefresh]),
  );
  useMeetBallerHere(!statsPage);
  const back = usePress();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(statsPage ? '/me' : '/'));
  let n = 0;
  const next = () => n++;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && view !== null} onRefresh={refresh} tintColor={colors.ink} />}
      >
        <Pressable accessibilityRole="button" onPress={goBack} onPressIn={back.onPressIn} onPressOut={back.onPressOut} style={styles.backHit}>
          <Animated.Text style={[styles.back, back.style]}>‹ {t.common.back}</Animated.Text>
        </Pressable>
        {view && !statsPage
          ? sections.map((s, i) => (
              <Section key={s} i={i}>
                {s === 'hero' ? (
                  <HeroCard v={view} badges={badges.badges} bg={look.look?.equipped.background ?? null} frame={look.look?.equipped.frame ?? null} level={levelBackOf(myLevel.level, t)} avatar={myAvatar.avatar?.look ?? null} kit={look.look?.equipped.kit ?? 'kit_green'} gear={look.look?.equipped.gear ?? null} effect={look.look?.equipped.win_effect ?? null} />
                ) : s === 'level' ? (
                  <GameLevelTile v={view} />
                ) : s === 'quests' ? (
                  <QuestsRow done={quests.quests?.daily.filter((q) => q.done).length ?? 0} onPress={() => setQuestsOpen(true)} />
                ) : s === 'numbers' ? (
                  <NavRow title={t.me.numbers} sub={t.me.numbersLine} onPress={() => router.push('/me?page=stats')} />
                ) : s === 'look' ? (
                  <LookRow isNew={hasNewLook(look.look, seen ?? new Set(look.look?.items.map((it) => it.key) ?? []))} />
                ) : s === 'pro' ? (
                  <ProRow />
                ) : (
                  <Settings />
                )}
              </Section>
            ))
          : null}
        {view && statsPage ? (
          <>
            <Section i={next()}>
              <Text style={styles.statsTitle}>{t.me.numbers}</Text>
            </Section>
            <Section i={next()}>
              <NavRow title={t.me.statsPage} sub={t.me.statsLine} onPress={() => router.push('/match-stats?from=me')} />
            </Section>
            <Section i={next()}>
              <NavRow title={t.season.title} sub={t.season.sub} onPress={() => router.push('/season?from=me')} />
            </Section>
            <Section i={next()}>
              <Text style={styles.predictionsKicker}>{greekCaps(t.me.predictionsPage)}</Text>
            </Section>
            {has('badges_shelf') && badges.badges && earned(badges.badges.badges).length > 0 ? (
              <Section i={next()}>
                <BadgesCard data={badges.badges} />
              </Section>
            ) : null}
            <Section i={next()}>
              <StreakBox v={view} />
            </Section>
            {view.isNew ? (
              <Section i={next()}>
                <Progress v={view} />
              </Section>
            ) : null}
            <Section i={next()}>
              <Score v={view} />
            </Section>
            <Section i={next()}>
              <Friends v={view} />
            </Section>
          </>
        ) : null}
        {!loading && error && !view ? <Text style={styles.empty}>{t.me.error}</Text> : null}
      </ScrollView>
      {has('daily_quests') ? <QuestsSheet open={questsOpen} quests={quests.quests} onClose={() => setQuestsOpen(false)} /> : null}
    </View>
  );
}

/**
 * A white row with a title, a quiet line under it and «›»: «Τα νούμερά σου» on Εγώ, «Τα στατιστικά σου» (/match-stats)
 * and «Η σεζόν σου» (/season) on «Τα νούμερά σου».
 */
function NavRow({ title, sub, onPress }: { title: string; sub?: string; onPress: () => void }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={sub ? `${title}. ${sub}` : title} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.lookRow, press.style]}>
        <View style={styles.lookText}>
          <Text style={styles.lookTitle}>{title}</Text>
          {sub ? <Text style={styles.lookSub}>{sub}</Text> : null}
        </View>
        <Text style={styles.lookMark}>›</Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * «Pro ›», one quiet row after the player's own things (founder, 19 Oct: Pro reachable, not competing). Without Pro
 * it says what Pro sends you; with Pro, until when it runs. The only Pro entry on Εγώ (it left Ρυθμίσεις).
 */
function ProRow() {
  const t = useCopy();
  const { state } = usePro();
  const active = state ? activeLine(state, t) : null;
  return <NavRow title={t.pro.title} sub={active ?? t.pro.settingsLine} onPress={() => router.push('/pro?from=me')} />;
}

/** «Αποστολές  1/3 ›»: today's quests done, opens the sheet */
function QuestsRow({ done, onPress }: { done: number; onPress: () => void }) {
  const t = useCopy();
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.questsRow, press.style]}>
        <Text style={styles.questsTitle}>{t.quests.meRow}</Text>
        <Text style={styles.questsCount}>{t.quests.meCount.replace('{n}', String(done))}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** the badge worn on the card, under the name: a lime outline, its name and the tier dots; it slams in late */
function WornPill({ data }: { data: GetBadgesResult | null }) {
  const t = useCopy();
  const row = data?.badges.find((b) => b.key === data.worn);
  const scale = useSharedValue(1.4);
  const opacity = useSharedValue(0);
  useEffect(() => {
    scale.value = 1.4;
    opacity.value = 0;
    scale.value = withDelay(1200, withTiming(1, { duration: 500, easing: ease }));
    opacity.value = withDelay(1200, withTiming(1, { duration: 500, easing: ease }));
  }, [scale, opacity, row?.key]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  if (!row || row.tier === 0) return null;
  return (
    <Animated.View style={[styles.worn, style]} accessibilityLabel={badgeName(row.key, t)}>
      <Text style={styles.wornText}>{badgeName(row.key, t)}</Text>
      <BadgeDots tier={row.tier} size={7} border={1.5} color={colors.lime} gap={3} />
    </Animated.View>
  );
}

/** «BADGES  Δες τα όλα ›», a row of earned tiles, and the badge closest to its next tier */
function BadgesCard({ data }: { data: GetBadgesResult }) {
  const t = useCopy();
  const list = earned(data.badges);
  const nb = nextBadge(data.badges);
  const all = usePress();
  return (
    <View style={styles.badgesCard}>
      <View style={styles.badgesHead}>
        <Text style={styles.kicker}>{greekCaps(t.badges.title)}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/badges')} onPressIn={all.onPressIn} onPressOut={all.onPressOut} style={styles.seeAllHit}>
          <Animated.Text style={[styles.seeAll, all.style]}>{t.badges.seeAll}</Animated.Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tileRow}>
        {list.map((b, i) => (
          <BadgeTile key={b.key} b={b} i={i} />
        ))}
      </ScrollView>
      {nb ? <NextBadge b={nb} /> : null}
    </View>
  );
}

function BadgeTile({ b, i }: { b: BadgeRow; i: number }) {
  const t = useCopy();
  const st = tierStyle(b.tier);
  const press = usePress(0.96);
  const enter = useStgIn(STG_MS, 150 + i * 40);
  return (
    <Animated.View style={enter}>
      <Pressable accessibilityRole="button" onPress={() => router.push(`/badges?key=${b.key}`)} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.badgeTile, { backgroundColor: st.bg, borderColor: st.border, borderWidth: st.borderWidth }, press.style]}>
          <Text style={[styles.badgeTileName, { color: st.text }]}>{badgeName(b.key, t)}</Text>
          <View style={styles.badgeTileFoot}>
            <BadgeDots tier={b.tier} size={11} border={2} color={st.dot} gap={3} />
            <Text style={[styles.badgeTileTier, { color: st.text }]}>
              {tileTierLine(b, t)}
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** the next tier within reach: name, «Ακόμα N» and a bar */
function NextBadge({ b }: { b: BadgeRow }) {
  const t = useCopy();
  return (
    <View style={styles.nextBadge} accessibilityLabel={`${badgeName(b.key, t)}. ${leftLine(b, t)}`}>
      <View style={styles.rowBetween}>
        <Text style={styles.nextBadgeName}>{badgeName(b.key, t)}</Text>
        <Text style={styles.nextBadgeLeft}>{moreLine(b, t)}</Text>
      </View>
      <GrowBar value={pct(b)} height={8} track={colors.navLine} fill={colors.lime} fillBorder={colors.ink} fillBorderWidth={2} delay={400} />
    </View>
  );
}

function Section({ i, children }: { i: number; children: ReactNode }) {
  const enter = useStgIn(STG_MS, 50 + Math.min(i, 6) * STAGGER);
  return <Animated.View style={enter}>{children}</Animated.View>;
}

/** «Εμφάνιση  Κορνίζες, φόντα, ρούχα και ρακέτα  [Νέο] ›» */
function LookRow({ isNew }: { isNew: boolean }) {
  const t = useCopy();
  const press = usePress();
  const pop = usePopIn(450, 0);
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/look')} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.lookRow, press.style]}>
        <View style={styles.lookText}>
          <Text style={styles.lookTitle}>{t.look.title}</Text>
          <Text style={styles.lookSub}>{t.look.sub}</Text>
        </View>
        <View style={styles.lookEnd}>
          {isNew ? (
            <Animated.View style={[styles.newPill, pop]}>
              <Text style={styles.newPillText}>{t.look.isNew}</Text>
            </Animated.View>
          ) : null}
          <Text style={styles.lookMark}>›</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}


/**
 * The hero card: the ink card with your background and frame, level, σερί, πόντοι μήνα and the name on the front.
 * «Δες τα στατιστικά ›» (once the stats are open) turns it over to the level in detail.
 */
function HeroCard({
  v,
  badges,
  bg,
  frame,
  level,
  avatar,
  kit,
  gear,
  effect,
}: {
  v: MeView;
  badges: GetBadgesResult | null;
  bg: string | null;
  frame: string | null;
  level: LevelBack | null;
  avatar: AvatarLook | null;
  kit: string;
  gear: string | null;
  effect: string | null;
}) {
  const t = useCopy();
  const { has } = useUnlocks();
  const [flipped, setFlipped] = useState(false);
  const flip = usePress();
  const canFlip = PLAYER_LEVEL_SHOWN && has('stats') && level !== null;
  return (
    <View style={styles.hero}>
      {avatar ? <BallerStage look={avatar} bg={bg} kit={kit} gear={gear} effect={effect} frame={frame} /> : null}
    <FlipCard
      bg={null}
      flipped={flipped}
      front={
        <>
          <Name v={v} frame={frame} />
          {v.isNew && PLAYER_LEVEL_SHOWN ? <NewTop /> : <Chips v={v} />}
          {canFlip ? (
            <Pressable accessibilityRole="button" onPress={() => setFlipped(true)} onPressIn={flip.onPressIn} onPressOut={flip.onPressOut} style={styles.flipHit}>
              <Animated.View style={[styles.flipPill, flip.style]}>
                <Text style={styles.flipPillText}>{t.look.stats.open}</Text>
              </Animated.View>
            </Pressable>
          ) : null}
          <WornPill data={badges} />
        </>
      }
      back={<StatsBack level={level} onBack={() => setFlipped(false)} />}
    />
    </View>
  );
}

/**
 * Your Baller, full width on its own background (founder, 17 Oct: "him full screen with his background and then below
 * my name and info"): the frame ring around it, its name under it. A tap opens «Γνώρισε τον Baller σου»; drag it to
 * throw it.
 */
function BallerStage({
  look,
  bg,
  kit,
  gear,
  effect,
  frame,
}: {
  look: AvatarLook;
  bg: string | null;
  kit: string;
  gear: string | null;
  effect: string | null;
  frame: string | null;
}) {
  const t = useCopy();
  const press = usePress(0.98);
  const share = usePress();
  const pop = usePopIn(500, 250);
  const baller = useBaller();
  const { width } = useWindowDimensions();
  const height = Math.min(width - 40, 380);
  const size = Math.round(height * 0.66);
  // a tap makes Baller jump first, then its screen opens
  const [jump, setJump] = useState(0);
  const open = () => {
    setJump((n) => n + 1);
    setTimeout(() => router.push('/baller'), 380);
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={baller.name ?? 'Baller'} onPress={open} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.stage, { height, paddingBottom: height * 0.05 }, press.style]}>
        <CardBackground bg={bg} stage />
        <Animated.View style={pop}>
          <Baller look={look} size={size} kit={kit} gear={gear} effect={effect} frame={frame} jump={jump} throwable />
        </Animated.View>
        {baller.name ? (
          <View style={styles.ballerTag} pointerEvents="none">
            <Text style={styles.ballerTagText} numberOfLines={1}>
              {baller.name}
            </Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/share-baller')}
          onPressIn={share.onPressIn}
          onPressOut={share.onPressOut}
          style={styles.shareHit}
        >
          <Animated.View style={[styles.sharePill, share.style]}>
            <Text style={styles.sharePillText}>{t.baller.share.open}</Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

/**
 * The player's level on the card, when levels are shown. σερί and πόντοι μήνα left the card (19 Oct): the header
 * shows σερί already, and both are told in full on «Τα νούμερά σου».
 */
function Chips({ v }: { v: MeView }) {
  const t = useCopy();
  const { has } = useUnlocks();
  if (!(PLAYER_LEVEL_SHOWN && has('level_bar') && v.level)) return null;
  return (
    <View style={styles.chips}>
      <View style={styles.chip}>
        <Text style={styles.chipBig}>{v.level}</Text>
        <View>
          <Text style={styles.chipSmall}>{t.level.label}</Text>
          <Text style={styles.chipSmallBold}>{`${v.direction.arrow} ${v.direction.word}`}</Text>
        </View>
      </View>
    </View>
  );
}

/** no level yet: what it takes */
function NewTop() {
  const t = useCopy();
  return (
    <View style={styles.newTop}>
      <Text style={styles.newTitle}>{t.me.noLevel}</Text>
      <Text style={styles.heroSub}>{t.me.noLevelSub}</Text>
    </View>
  );
}

/** the back of the card: your level in detail. The exact value and the gap to the next half are Pro. */
function StatsBack({ level, onBack }: { level: LevelBack | null; onBack: () => void }) {
  const t = useCopy();
  const s = t.look.stats;
  const { has } = useUnlocks();
  const back = usePress();
  const pro = usePress();
  return (
    <>
      <View style={styles.backTop}>
        <View style={styles.backPill}>
          <Text style={styles.backPillText}>{s.pill}</Text>
        </View>
        {level?.pro ? (
          <View style={styles.proTag}>
            <Text style={styles.proTagText}>{s.pro}</Text>
          </View>
        ) : null}
      </View>
      {level?.state === 'active' ? (
        <View style={styles.backLevel}>
          <Text style={styles.backNum}>{level.level}</Text>
          <View>
            <Text style={styles.backWord}>{t.level.label}</Text>
            <Text style={styles.backDir}>{`${level.arrow} ${level.word}`}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.backPending}>{s.pending}</Text>
      )}
      {level ? <Text style={styles.backCounts}>{level.counts}</Text> : null}
      {level?.state === 'active' && level.pro && level.value ? (
        <View style={styles.backValueBox}>
          <Text style={styles.backValue}>{level.value}</Text>
          {level.toNext ? <Text style={styles.backToNext}>{level.toNext}</Text> : null}
        </View>
      ) : null}
      {level?.state === 'active' && !level.pro ? (
        <View style={styles.lockedBox}>
          <View style={styles.lockBar} />
          <View style={[styles.lockBar, styles.lockBarShort]} />
        </View>
      ) : null}
      <View style={styles.backActions}>
        {level?.state === 'active' && !level.pro && has('pro_sheet') ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/pro?from=level_stats')} onPressIn={pro.onPressIn} onPressOut={pro.onPressOut}>
            <Animated.View style={[styles.primary, pro.style]}>
              <Text style={styles.primaryText}>{s.pro}</Text>
            </Animated.View>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={onBack} onPressIn={back.onPressIn} onPressOut={back.onPressOut} style={styles.backLinkHit}>
          <Animated.Text style={[styles.backLink, back.style]}>{s.back}</Animated.Text>
        </Pressable>
      </View>
    </>
  );
}

function Name({ v, frame }: { v: MeView; frame: string | null }) {
  const plate = namePlate(frame);
  return (
    <View style={styles.nameBox}>
      <View style={plate?.box}>
        <Text style={[styles.first, plate ? { color: plate.color } : null]}>{v.first}</Text>
        <FitText text={v.surname} style={[styles.surname, plate ? { color: plate.color } : null]} />
      </View>
      {v.sub ? <Text style={styles.heroSub}>{v.sub}</Text> : null}
    </View>
  );
}

/** σερί with ΠΡ, and the freeze slots (= ready, dashed empty) */
/** your game level from points (founder, 14 Oct): «Level 3», a lime bar for how far into it, what is missing for the next */
function GameLevelTile({ v }: { v: MeView }) {
  return (
    <View style={styles.card} accessible accessibilityLabel={`${v.game.title}. ${v.game.line}`}>
      <Text style={styles.levelTitle}>{v.game.title}</Text>
      <GrowBar value={v.game.fill} height={12} track={colors.silver} fill={colors.lime} fillBorder={colors.ink} fillBorderWidth={2} delay={300} ms={700} />
      <Text style={styles.muted}>{v.game.line}</Text>
    </View>
  );
}

function StreakBox({ v }: { v: MeView }) {
  const t = useCopy();
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.streakLeft}>
          <Text style={styles.streakNum}>{v.streak}</Text>
          <View>
            <Text style={styles.streakWord}>{t.me.streak}</Text>
            <Text style={styles.muted}>{v.best}</Text>
          </View>
        </View>
        <View style={styles.freezes}>
          {v.freezes.slots.map((s, i) => (
            <Freeze key={i} ready={s.ready} label={s.label} index={i} />
          ))}
        </View>
      </View>
      <Text style={styles.muted}>{v.freezes.line}</Text>
    </View>
  );
}

function Freeze({ ready, label, index }: { ready: boolean; label: string; index: number }) {
  const pop = usePopIn(450, 400 + index * 120);
  return (
    <Animated.View accessibilityRole="image" accessibilityLabel={label} style={[styles.freeze, ready ? styles.freezeReady : styles.freezeEmpty, ready ? pop : null]}>
      {ready ? <Text style={styles.freezeMark}>=</Text> : null}
    </Animated.View>
  );
}

/** «Ματς · 1 από 3» slots and «Ψήφοι · 4 από 10» ticks, then the one blue button */
function Progress({ v }: { v: MeView }) {
  const press = usePress();
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{v.progress.matchesLabel}</Text>
      <View style={styles.slots}>
        {Array.from({ length: LEVEL_MATCHES }, (_, i) => (
          <Slot key={i} on={i < v.progress.matches} delay={600 + i * 180} />
        ))}
      </View>
      <Text style={styles.label}>{v.progress.votesLabel}</Text>
      <View style={styles.ticks}>
        {Array.from({ length: LEVEL_VOTES }, (_, i) => (
          <Tick key={i} on={i < v.progress.votes} delay={600 + i * 70} />
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/add-match')} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.primary, press.style]}>
          <Text style={styles.primaryText}>{v.progress.cta}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

function Slot({ on, delay }: { on: boolean; delay: number }) {
  const pop = usePopIn(500, delay);
  return <Animated.View style={[styles.slot, on ? styles.slotOn : styles.slotOff, on ? pop : null]}>{on ? <Text style={styles.slotMark}>✓</Text> : null}</Animated.View>;
}

function Tick({ on, delay }: { on: boolean; delay: number }) {
  const pop = usePopIn(450, delay);
  return <Animated.View style={[styles.tick, on ? styles.tickOn : styles.tickOff, on ? pop : null]} />;
}

/** «Το σκορ σου» tiles, then «Οι ψήφοι σου» back to the feed */
function Score({ v }: { v: MeView }) {
  const t = useCopy();
  const press = usePress();
  return (
    <View style={styles.block}>
      <Text style={styles.heading}>{t.me.score}</Text>
      <View style={styles.tiles}>
        {v.stats.map((s) => (
          <View key={s.label} style={styles.tile}>
            <Text style={styles.tileValue}>{s.value}</Text>
            <Text style={styles.tileLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/')} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.votes, press.style]}>
          <Text style={styles.votesKicker}>{t.me.votes.title}</Text>
          <Text style={styles.votesTitle}>{v.votes.title}</Text>
          <Text style={styles.votesSub}>{v.votes.sub}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

/** «Οι φίλοι σου»: fanned initials and the count, to Παίκτες */
function Friends({ v }: { v: MeView }) {
  const t = useCopy();
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.navigate('/players')} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.card, styles.friends, press.style]}>
        {v.friends.count > 0 ? (
          <>
            <View style={styles.fan}>
              {v.friends.initials.map((ini, i) => (
                <View key={i} style={[styles.avatar, { marginLeft: i === 0 ? 0 : -10 }]}>
                  <Lit />
                  <Text style={styles.avatarText}>{ini}</Text>
                </View>
              ))}
            </View>
            <View style={styles.friendsText}>
              <Text style={styles.friendsTitle}>{t.me.friends.title}</Text>
              <Text style={styles.friendsCount}>{`${v.friends.count} ›`}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.friendsTitle}>{t.me.friends.empty}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** «Ρυθμίσεις», closed until tapped, at the bottom: sounds, blocked people, Αποσύνδεση and deleting the account */
function Settings() {
  const t = useCopy();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const gate = useOnboardingGate();
  const blocks = useBlocks();
  const newPlayer = useNewPlayer();
  const mockMode = useApi() === null;
  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} style={styles.rowBetween}>
        <Text style={styles.settingsTitle}>{t.me.settings}</Text>
        <Text style={[styles.settingsMark, open && styles.markOpen]}>+</Text>
      </Pressable>
      {open ? (
        <>
          <SoundsRow />
          {blocks.list.length > 0 ? (
            <View style={styles.blocks}>
              <Text style={styles.blocksTitle}>{t.safety.list}</Text>
              {blocks.list.map((b) => (
                <View key={b.user_id} style={styles.rowBetween}>
                  <Text style={styles.blockName}>{[b.first_name, b.surname].filter(Boolean).join(' ')}</Text>
                  <Pressable accessibilityRole="button" onPress={() => void blocks.unblock(b.user_id)} style={styles.linkHit}>
                    <Text style={styles.unblock}>{t.safety.unblock}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          {__DEV__ ? (
            <Pressable accessibilityRole="button" onPress={gate.replay} style={styles.linkHit}>
              <Text style={styles.signOut}>{t.me.replayOnboarding}</Text>
            </Pressable>
          ) : null}
          {__DEV__ ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/avatars')} style={styles.linkHit}>
              <Text style={styles.signOut}>{t.me.avatarsDev}</Text>
            </Pressable>
          ) : null}
          {__DEV__ && mockMode ? (
            <Pressable accessibilityRole="button" onPress={() => setNewPlayer(!newPlayer.on)} style={styles.linkHit}>
              <Text style={styles.signOut}>{newPlayer.on ? t.me.newPlayerOn : t.me.newPlayer}</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.linkHit}>
            <Text style={styles.signOut}>{t.auth.signOut}</Text>
          </Pressable>
          <DeleteAccount />
        </>
      ) : null}
    </View>
  );
}

/** «Ήχοι»: Baller's sounds on or off, on this phone */
function SoundsRow() {
  const t = useCopy();
  const [on, setOn] = useSoundsOn();
  return (
    <View style={styles.soundsRow}>
      <View style={styles.proText}>
        <Text style={styles.proTitle}>{t.me.sounds}</Text>
        <Text style={styles.muted}>{t.me.soundsLine}</Text>
      </View>
      <Switch value={on} onValueChange={setOn} trackColor={{ false: colors.navLine, true: colors.ink }} thumbColor={colors.white} accessibilityLabel={t.me.sounds} />
    </View>
  );
}

/**
 * «Διαγραφή λογαριασμού» (App Store 5.1.1(v), 16 Oct): a confirm step that says exactly what goes, a busy state while
 * it runs, then sign out. In sample mode there is no account to delete, so it only signs out.
 */
function DeleteAccount() {
  const t = useCopy();
  const api = useApi();
  const { signOut } = useAuth();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const confirm = async () => {
    setBusy(true);
    setFailed(false);
    try {
      if (api) await api.deleteMyAccount();
      await signOut();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };
  if (!asking) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setAsking(true)} style={styles.linkHit}>
        <Text style={styles.deleteLink}>{t.auth.deleteAccount}</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.deleteBox}>
      <Text style={styles.deleteTitle}>{t.auth.deleteTitle}</Text>
      <Text style={styles.muted}>{t.auth.deleteLine}</Text>
      {failed ? <Text style={styles.deleteError}>{t.auth.deleteFailed}</Text> : null}
      <View style={styles.deleteRow}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void confirm()} style={[styles.deleteYes, busy && styles.busy]}>
          {busy ? <ActivityIndicator color={colors.paper} /> : null}
          <Text style={styles.deleteYesText}>{busy ? t.auth.deleting : t.auth.deleteYes}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setAsking(false)} style={styles.linkHit}>
          <Text style={styles.signOut}>{t.auth.deleteNo}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: 2 },
  blocksTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  blockName: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  unblock: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' },
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  backHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  empty: { paddingTop: 4, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  lime: { color: colors.lime },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.inkRaised, gap: 2 },
  chipBig: { fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 34, paddingBottom: 6, marginBottom: -6, color: colors.paper },
  chipSmall: { fontFamily: fonts.body, fontSize: 12, lineHeight: 15, color: colors.mist },
  chipSmallBold: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 15, color: colors.paper },
  newTop: { gap: 6 },
  newTitle: { fontFamily: fonts.displayHeavy, fontSize: 36, lineHeight: 36, paddingBottom: 7, marginBottom: -7, color: colors.paper, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  nameBox: { gap: 2 },
  first: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, paddingBottom: 5, marginBottom: -5, color: colors.paper },
  surname: { fontFamily: fonts.displayHeavy, fontSize: 52, lineHeight: 52, paddingBottom: 10, marginBottom: -10, color: colors.paper, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  heroSub: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.mist },
  // 44pt to tap around the 40pt pill; the negative margin keeps the layout
  flipHit: { alignSelf: 'flex-start', minHeight: 44, marginVertical: -2, justifyContent: 'center' },
  flipPill: { minHeight: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 2, borderColor: colors.mist, backgroundColor: alpha(colors.ink, 0.68), alignItems: 'center', justifyContent: 'center' },
  flipPillText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.paper },
  backTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  backPill: { minHeight: 28, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  backPillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  proTag: { minHeight: 26, paddingHorizontal: 10, borderRadius: 999, borderWidth: 2, borderColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  proTagText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.lime },
  backLevel: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backNum: { fontFamily: fonts.displayHeavy, fontSize: 84, lineHeight: 84, paddingBottom: 17, marginBottom: -17, color: colors.lime, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  backWord: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 30, paddingBottom: 6, marginBottom: -6, color: colors.paper },
  backDir: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.lime },
  backPending: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 34, paddingBottom: 7, marginBottom: -7, color: colors.paper, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  backCounts: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.paper },
  backValueBox: { gap: 4 },
  backValue: { fontFamily: fonts.displayHeavy, fontSize: 48, lineHeight: 48, paddingBottom: 10, marginBottom: -10, color: colors.lime, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  backToNext: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.mist },
  lockedBox: { gap: 8 },
  lockBar: { height: 38, borderRadius: 12, backgroundColor: colors.inkRaised },
  lockBarShort: { width: '62%' },
  backActions: { gap: 6 },
  backLinkHit: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  backLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.paper, textDecorationLine: 'underline' },
  lookRow: { minHeight: 60, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  lookText: { flexShrink: 1, gap: 1 },
  lookTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  lookSub: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft },
  lookEnd: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lookMark: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  newPill: { minHeight: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  newPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink },
  questsRow: { minHeight: 56, paddingHorizontal: 18, borderRadius: 24, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questsTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  questsCount: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  worn: { alignSelf: 'flex-start', minHeight: 26, paddingHorizontal: 10, borderRadius: 999, borderWidth: 2, borderColor: colors.lime, flexDirection: 'row', alignItems: 'center', gap: 6 },
  wornText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.lime },
  badgesCard: { paddingVertical: 16, paddingLeft: 18, paddingRight: 0, borderRadius: 24, backgroundColor: colors.white, gap: 10, overflow: 'hidden' },
  badgesHead: { paddingRight: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAllHit: { minHeight: 44, justifyContent: 'center' },
  seeAll: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  tileRow: { gap: 8, paddingRight: 18 },
  badgeTile: { width: 136, minHeight: 104, paddingTop: 12, paddingHorizontal: 12, paddingBottom: 10, borderRadius: 18, justifyContent: 'space-between', gap: 8 },
  badgeTileName: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 26, paddingBottom: 5, marginBottom: -6 },
  badgeTileFoot: { gap: 4 },
  badgeTileTier: { fontFamily: fonts.bodyBold, fontSize: 12 },
  nextBadge: { paddingRight: 18, gap: 6 },
  nextBadgeName: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  nextBadgeLeft: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  card: { padding: 16, borderRadius: 22, backgroundColor: colors.white, gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakNum: { fontFamily: fonts.displayHeavy, fontSize: 48, lineHeight: 48, paddingBottom: 10, marginBottom: -10, color: colors.ink },
  levelTitle: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 36, paddingBottom: 6, marginBottom: -6, color: colors.ink },
  hero: { gap: 10 },
  // Baller stands on the court: at the bottom of the stage, its shadow in the pool of light
  stage: { borderRadius: 28, overflow: 'hidden', backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'flex-end' },
  ballerTag: { position: 'absolute', bottom: 14, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 999, backgroundColor: alpha(colors.ink, 0.75) },
  // «Μοιράσου ›»: quiet, so the screen's blue stays elsewhere
  // 44pt to tap around the pill; top 8 keeps the pill where it was (14pt from the edge)
  shareHit: { position: 'absolute', top: 8, right: 14, minHeight: 44, justifyContent: 'center' },
  sharePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: alpha(colors.paper, 0.5), backgroundColor: alpha(colors.ink, 0.55) },
  sharePillText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 16, color: colors.paper },
  ballerTagText: { fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 26, color: colors.paper },
  statsTitle: { fontFamily: fonts.displayHeavy, fontSize: 48, lineHeight: 52, paddingTop: 6, color: colors.ink },
  // «ΟΙ ΠΡΟΒΛΕΨΕΙΣ ΣΟΥ» over σερί, score and votes on «Τα νούμερά σου»
  predictionsKicker: { paddingTop: 12, fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.inkSoft },
  streakWord: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  muted: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  freezes: { flexDirection: 'row', gap: 8 },
  freeze: { width: 34, height: 34, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  freezeReady: { backgroundColor: colors.lime, borderColor: colors.ink },
  freezeEmpty: { borderColor: colors.fog, borderStyle: 'dashed' },
  freezeMark: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 20, color: colors.ink },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  slots: { flexDirection: 'row', gap: 8 },
  slot: { flex: 1, height: 44, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  slotOn: { backgroundColor: colors.lime, borderColor: colors.ink },
  slotOff: { borderColor: colors.fog, borderStyle: 'dashed' },
  slotMark: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  ticks: { flexDirection: 'row', gap: 4 },
  tick: { flex: 1, height: 12, borderRadius: 999, borderWidth: 2 },
  tickOn: { backgroundColor: colors.lime, borderColor: colors.ink },
  tickOff: { borderColor: colors.stone },
  primary: { minHeight: 52, borderRadius: 16, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 4 },
  primaryText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
  block: { gap: 8 },
  heading: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 30, paddingBottom: 6, marginBottom: -6, color: colors.ink, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '48.5%', padding: 14, borderRadius: 18, backgroundColor: colors.white, gap: 2 },
  tileValue: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 36, paddingBottom: 7, marginBottom: -7, color: colors.ink },
  tileLabel: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  votes: { padding: 16, borderRadius: 22, backgroundColor: colors.ink, gap: 4 },
  votesKicker: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.mist },
  votesTitle: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 28, paddingBottom: 5, marginBottom: -5, color: colors.paper },
  votesSub: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.lime },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  matchLine: { borderTopWidth: 1, borderTopColor: colors.navLine, paddingTop: 10 },
  letter: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  letterWin: { backgroundColor: colors.lime },
  letterLoss: { backgroundColor: colors.ink },
  letterText: { fontFamily: fonts.displayHeavy, fontSize: 18, lineHeight: 20, paddingBottom: 4, marginBottom: -4 },
  matchText: { flex: 1, minWidth: 0 },
  matchAgainst: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  nextBox: { gap: 4 },
  nextText: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, color: colors.ink },
  linkHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  deleteLink: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.inkSoft },
  deleteBox: { gap: 8, padding: 14, borderRadius: 18, borderWidth: 2, borderColor: colors.ink },
  deleteTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  deleteError: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  deleteYes: { minHeight: 44, paddingHorizontal: 18, borderRadius: 999, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteYesText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
  busy: { opacity: 0.85 },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
  friends: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fan: { flexDirection: 'row' },
  avatar: { width: 38, height: 38, borderRadius: 999, borderWidth: 2, borderColor: colors.white, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.lime },
  friendsText: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  friendsTitle: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  friendsCount: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  soundsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  settingsTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  settingsMark: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  // open: the «+» turns to a cross, as on the result cards (the glyph set has no minus)
  markOpen: { transform: [{ rotate: '45deg' }] },
  signOut: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.inkSoft },
  wlRows: { gap: 6 },
  wlLocked: { opacity: 0.3 },
  wlRow: { minHeight: 48, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  wlLabel: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  wlValue: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 28, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  wlDown: { color: colors.inkSoft },
  unlock: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  scoutRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  proPill: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: colors.ink },
  proPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.lime },
  proText: { flex: 1, minWidth: 0, gap: 2 },
  proTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
});

/**
 * A player from before Baller had a name meets it on Εγώ, its home, if this visit has not had its moment yet
 * (founder, 18 Oct). Opening Εγώ is asked for, so it needs no vote first; leaving before it comes cancels it.
 */
function useMeetBallerHere(on: boolean) {
  const baller = useBaller();
  const { claim } = useMoments();
  const met = baller.met;
  useFocusEffect(
    useCallback(() => {
      if (!on || met !== false) return undefined;
      let cancelled = false;
      const id = setTimeout(() => {
        AsyncStorage.getItem(BALLER_OFFERED_KEY)
          .catch(() => null)
          .then((offered) => {
            if (cancelled || !shouldOfferBaller(met, offered) || !claim('baller', { asked: true })) return;
            AsyncStorage.setItem(BALLER_OFFERED_KEY, '1').catch(() => undefined);
            router.push('/baller?first=1');
          });
      }, MEET_BALLER_ON_ME_MS);
      return () => {
        cancelled = true;
        clearTimeout(id);
      };
    }, [on, met, claim]),
  );
}
