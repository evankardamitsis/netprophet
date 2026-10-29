import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../src/i18n';
import { useApi, usePro } from '../src/lib/data';
import { usePopIn, usePress, useRiseIn, useStgIn } from '../src/lib/motion';
import { track } from '../src/lib/analytics';
import { activeLine, buyLine, buyNote, planCards, restoreLine, trialLine, type PlanCard } from '../src/lib/pro';
import { usePurchase, useProOffer, useRestore } from '../src/lib/purchase';
import { buyLineFor } from '../src/lib/storeTypes';
import { legalUrl } from '../src/lib/legalLinks';
import { safeOpen } from '../src/lib/openUrl';
import { fmt } from '../src/lib/votes';
import { ProTour } from '../src/components/ProTour';
import { ProWelcome } from '../src/components/ProWelcome';
import { alpha, colors, fonts } from '../src/theme';

/**
 * Pro (founder, 17 Oct: "very attractive to players so they buy it"): one promise, «Ο βοηθός της σεζόν σου», three
 * outcomes the player feels, then the plans (founding until 31/12: 49,99€ the first year, then 69,99€ a year; or the
 * year, and the month). Under the button it says what is charged, when, and that it renews by itself. The one blue
 * button buys the picked plan; while the free week is yours it starts with it (founder, 18 Oct: the store's trial,
 * with a card, charged on day 8 unless cancelled; the line under it says so plainly). Payments go through
 * RevenueCat; until its keys are set, buying keeps you on the list at the founding price. With Pro it says until when.
 */
const STG_MS = 450;
/** big text: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;

type Busy = null | 'buy' | 'restore';
/** a paid purchase our server has not heard of yet: asked again every LATE_MS, LATE_TRIES times (two minutes) */
const LATE_MS = 5000;
const LATE_TRIES = 24;

export default function ProScreen() {
  const t = useCopy();
  const p = t.pro;
  const insets = useSafeAreaInsets();
  const { state, join, refresh } = usePro();
  const { offer, failed: offerFailed, refresh: refreshOffer } = useProOffer();
  const purchase = usePurchase();
  const restorePurchases = useRestore();
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  /** what the blue button says while buying: the store's sheet on its way, then our server turning Pro on */
  const [stage, setStage] = useState<'opening' | 'activating'>('opening');
  /** paid, Pro not on yet: the plans give way to one line, and the welcome comes when it lands */
  const [awaiting, setAwaiting] = useState(false);
  const api = useApi();
  const [note, setNote] = useState<string | null>(null);
  /** the full-screen welcome, only after buying (not after restoring), then the guide to what opened */
  const [welcome, setWelcome] = useState(false);
  const [tour, setTour] = useState(false);
  const params = useLocalSearchParams<{ from?: string; preview?: string }>();
  const moment = String(params.from ?? 'direct');
  // development only: /pro?preview=welcome opens the welcome and the guide without buying
  useEffect(() => {
    if (__DEV__ && params.preview === 'welcome') setWelcome(true);
  }, [params.preview]);
  useEffect(() => track('pro_sheet_viewed', { moment }), [moment]);
  const titleIn = useRiseIn(550, 50);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const cards = offer ? planCards(offer.plans, t) : [];
  const plan = cards.find((c) => c.productId === picked) ?? cards[0] ?? null;
  const onTrial = state?.pro === true && state.current?.source === 'trial';
  const paid = state?.pro === true && !onTrial;
  const active = paid && state ? activeLine(state, t) : null;
  const trialEnd = onTrial && state?.current?.ends_at ? new Date(state.current.ends_at) : null;
  const canTrial = offer?.trial_available === true && state?.pro !== true;

  const done = async (line: string) => {
    setNote(line);
    await Promise.all([refresh(), refreshOffer()]);
  };

  const onBuy = async () => {
    if (busy || awaiting || !plan) return;
    setBusy('buy');
    setStage('opening');
    setNote(null);
    track('pro_cta_pressed', { price: canTrial ? `trial:${plan.price}` : plan.price, moment });
    const r = await purchase.buy(
      plan.productId,
      async () => (api ? (await api.getPro())?.pro === true : true),
      () => setStage('activating'),
    );
    if (r.result === 'ok') {
      await Promise.all([refresh(), refreshOffer()]);
      setBusy(null);
      // the welcome only once Pro is really on; a late webhook gets a plain line and the screen keeps asking
      if (r.landed === false) {
        setNote(p.paidLate);
        setAwaiting(true);
      } else setWelcome(true);
      return;
    }
    // the founding list only while payments are not open (no key in this build), and only if the list took you
    if (buyLineFor(r) === 'waitlist') setNote((await join()) ? p.unavailable : p.notDone);
    else setNote(buyNote(r, t));
    setBusy(null);
  };

  useEffect(() => {
    if (!awaiting) return;
    if (state?.pro) {
      setAwaiting(false);
      setNote(null);
      setWelcome(true);
      return;
    }
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      void refresh();
      if (n >= LATE_TRIES) clearInterval(id);
    }, LATE_MS);
    return () => clearInterval(id);
  }, [awaiting, state?.pro, refresh]);

  /** App Store 3.1.1: the store gives back what this store account bought, then the server is asked again */
  const onRestore = async () => {
    if (busy) return;
    setBusy('restore');
    const r = await restorePurchases();
    setBusy(null);
    if (r === 'restored') await done(p.restored);
    else setNote(restoreLine(r, t));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 14 }]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>{p.title}</Text>
        <Animated.Text style={[styles.title, titleIn]}>{p.promise}</Animated.Text>
        {/* one line each (founder, 29 Oct: "too complicated, too much copy"); ProWelcome keeps the longer lines */}
        <View style={styles.outcomes}>
          {p.outcomes.map((o, i) => (
            <Outcome key={o.title} title={o.title} index={i} />
          ))}
        </View>

        {active ? <Text style={styles.active}>{active}</Text> : null}
        {trialEnd ? <Text style={styles.active}>{fmt(p.trialOn, { date: `${trialEnd.getDate()}/${trialEnd.getMonth() + 1}` })}</Text> : null}

        {!paid && !onTrial && !awaiting && cards.length > 0 ? (
          <View style={styles.plans}>
            {cards.map((c, i) => (
              <Plan key={c.productId} card={c} on={plan?.productId === c.productId} index={i} bestLabel={p.plans.best} onPress={() => setPicked(c.productId)} />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        {note ? <Text style={styles.note}>{note}</Text> : null}
        {paid || awaiting ? (
          <Button label={p.close} onPress={close} primary />
        ) : onTrial ? (
          <Button label={p.close} onPress={close} primary />
        ) : canTrial && plan ? (
          <>
            <Button label={busy === 'buy' ? p[stage] : p.trial} onPress={() => void onBuy()} primary />
            <Text style={styles.note}>{`${trialLine(plan, t)} ${p.renewal}`}</Text>
          </>
        ) : plan ? (
          <>
            <Button label={busy === 'buy' ? p[stage] : fmt(p.buy, { price: plan.price })} onPress={() => void onBuy()} primary />
            <Text style={styles.note}>{`${buyLine(plan, t)} ${p.renewal}`}</Text>
          </>
        ) : offerFailed ? (
          <>
            <Text style={styles.note}>{p.plansFailed}</Text>
            <Button label={p.retry} onPress={() => void refreshOffer()} primary />
          </>
        ) : null}
        {!paid && !onTrial && !awaiting ? <TextLink label={p.notNow} onPress={close} /> : null}
        {/* App Store 3.1.2: the price, the period and the renewal sit in the line under the button; 3.1.1: restoring,
            next to the two links */}
        <View style={styles.legal}>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => safeOpen(legalUrl('terms'), (u) => Linking.openURL(u))}>
            <Text style={styles.legalLink}>{p.terms}</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => safeOpen(legalUrl('privacy'), (u) => Linking.openURL(u))}>
            <Text style={styles.legalLink}>{p.privacy}</Text>
          </Pressable>
          {!paid && !onTrial ? (
            <>
              <Text style={styles.legalDot}>·</Text>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => void onRestore()}>
                <Text style={styles.legalLink}>{busy === 'restore' ? p.restoring : p.restore}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
      {welcome && !tour ? <ProWelcome trialEnd={trialEnd} onDone={() => setTour(true)} /> : null}
      {tour ? <ProTour onDone={close} /> : null}
    </View>
  );
}

function Outcome({ title, index }: { title: string; index: number }) {
  const enter = useStgIn(STG_MS, 250 + index * 70);
  return (
    <Animated.View style={[styles.outcome, enter]}>
      <Text style={styles.check}>✓</Text>
      <View style={styles.outcomeText}>
        <Text style={styles.outcomeTitle}>{title}</Text>
      </View>
    </Animated.View>
  );
}

function Plan({ card, on, index, bestLabel, onPress }: { card: PlanCard; on: boolean; index: number; bestLabel: string; onPress: () => void }) {
  const press = usePress(0.98);
  const pop = usePopIn(450, 500 + index * 70);
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.plan, on && styles.planOn, press.style, pop]}>
        <View style={styles.planHead}>
          <Text style={styles.planTitle}>{card.title}</Text>
          {card.best ? (
            <View style={styles.bestPill}>
              <Text style={styles.bestText}>{bestLabel}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.planPriceRow}>
          <Text style={styles.planPrice}>{card.price}</Text>
          <Text style={styles.planNote}>{card.note}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function Button({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.button, primary ? styles.primary : styles.secondary, press.style]}>
        <Text style={[styles.buttonText, primary ? styles.primaryText : styles.secondaryText]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} hitSlop={6}>
      <Animated.Text style={[styles.link, press.style]}>{label}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: 20 },
  scroll: { gap: 14, paddingBottom: 12 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 14, letterSpacing: 1, color: colors.mist },
  title: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 46, paddingBottom: 8, marginBottom: -8, color: colors.paper, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  outcomes: { gap: 10, marginTop: 4 },
  outcome: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  // the ticks are what Pro gives: lime, as earned
  check: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 24, color: colors.lime },
  outcomeText: { flex: 1, gap: 2 },
  outcomeTitle: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 23, color: colors.paper },
  active: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.lime },
  plans: { gap: 10, marginTop: 6 },
  plan: { borderRadius: 18, borderWidth: 2, borderColor: colors.inkLine, backgroundColor: colors.inkDeep, paddingVertical: 14, paddingHorizontal: 16, gap: 4 },
  planOn: { borderColor: colors.paper, backgroundColor: alpha(colors.paper, 0.06) },
  planHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  planTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.paper },
  bestPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1.5, borderColor: colors.paper },
  bestText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.paper },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  planPrice: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 34, color: colors.paper },
  planNote: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.mist },
  note: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.mist, textAlign: 'center' },
  actions: { gap: 10 },
  button: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primary: { backgroundColor: colors.blue },
  secondary: { backgroundColor: 'transparent' },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 17, textAlign: 'center' },
  primaryText: { color: colors.white },
  secondaryText: { color: colors.paper },
  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingTop: 2 },
  legalLink: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mist, textDecorationLine: 'underline', paddingVertical: 4 },
  legalDot: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mist },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper, textAlign: 'center', textDecorationLine: 'underline', paddingVertical: 4 },
});
