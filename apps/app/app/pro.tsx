import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../src/i18n';
import { usePro } from '../src/lib/data';
import { usePopIn, usePress, useRiseIn, useStgIn } from '../src/lib/motion';
import { track } from '../src/lib/analytics';
import { activeLine, planCards, trialLine, type PlanCard } from '../src/lib/pro';
import { usePurchase, useProOffer } from '../src/lib/purchase';
import { legalUrl } from '../src/lib/legalLinks';
import { safeOpen } from '../src/lib/openUrl';
import { fmt } from '../src/lib/votes';
import { alpha, colors, fonts } from '../src/theme';

/**
 * Pro (founder, 17 Oct: "very attractive to players so they buy it"): one promise, «Ο βοηθός της σεζόν σου», three
 * outcomes the player feels, then the plans (the founding year until 31/12, or the year, and the month). The one blue
 * button buys the picked plan; while the free week is yours it starts with it (founder, 18 Oct: the store's trial,
 * with a card, charged on day 8 unless cancelled; the line under it says so plainly). Payments go through
 * RevenueCat; until its keys are set, buying keeps you on the list at the founding price. With Pro it says until when.
 */
const STG_MS = 450;
/** big text: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;

type Busy = null | 'buy';

export default function ProScreen() {
  const t = useCopy();
  const p = t.pro;
  const insets = useSafeAreaInsets();
  const { state, join, refresh } = usePro();
  const { offer, refresh: refreshOffer } = useProOffer();
  const purchase = usePurchase();
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [note, setNote] = useState<string | null>(null);
  const moment = String(useLocalSearchParams<{ from?: string }>().from ?? 'direct');
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
    if (busy || !plan) return;
    setBusy('buy');
    setNote(p.finishing);
    track('pro_cta_pressed', { price: canTrial ? `trial:${plan.price}` : plan.price, moment });
    const r = await purchase.buy(plan.productId, async () => {
      await refresh();
      return false;
    });
    setBusy(null);
    if (r === 'ok') await done(p.welcome);
    else if (r === 'cancelled') setNote(null);
    else if (r === 'unavailable') {
      await join();
      setNote(p.unavailable);
    } else setNote(p.failed);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 14 }]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>{p.title}</Text>
        <Animated.Text style={[styles.title, titleIn]}>{p.promise}</Animated.Text>
        <View style={styles.outcomes}>
          {p.outcomes.map((o, i) => (
            <Outcome key={o.title} title={o.title} sub={o.sub} index={i} />
          ))}
        </View>
        <Text style={styles.also}>{p.also}</Text>

        {active ? <Text style={styles.active}>{active}</Text> : null}
        {trialEnd ? <Text style={styles.active}>{fmt(p.trialOn, { date: `${trialEnd.getDate()}/${trialEnd.getMonth() + 1}` })}</Text> : null}

        {!paid && !onTrial && cards.length > 0 ? (
          <View style={styles.plans}>
            {cards.map((c, i) => (
              <Plan key={c.productId} card={c} on={plan?.productId === c.productId} index={i} bestLabel={p.plans.best} onPress={() => setPicked(c.productId)} />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        {note ? <Text style={styles.note}>{note}</Text> : null}
        {paid ? (
          <Button label={p.close} onPress={close} primary />
        ) : onTrial ? (
          <Button label={p.close} onPress={close} primary />
        ) : canTrial && plan ? (
          <>
            <Button label={busy === 'buy' ? p.finishing : p.trial} onPress={() => void onBuy()} primary />
            <Text style={styles.note}>{trialLine(plan, t)}</Text>
          </>
        ) : plan ? (
          <Button label={busy === 'buy' ? p.finishing : fmt(p.buy, { price: plan.price })} onPress={() => void onBuy()} primary />
        ) : null}
        {!paid && !onTrial ? <TextLink label={p.notNow} onPress={close} /> : null}
        <View style={styles.legal}>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => safeOpen(legalUrl('terms'), (u) => Linking.openURL(u))}>
            <Text style={styles.legalLink}>{p.terms}</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => safeOpen(legalUrl('privacy'), (u) => Linking.openURL(u))}>
            <Text style={styles.legalLink}>{p.privacy}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Outcome({ title, sub, index }: { title: string; sub: string; index: number }) {
  const enter = useStgIn(STG_MS, 250 + index * 70);
  return (
    <Animated.View style={[styles.outcome, enter]}>
      <Text style={styles.check}>✓</Text>
      <View style={styles.outcomeText}>
        <Text style={styles.outcomeTitle}>{title}</Text>
        <Text style={styles.outcomeSub}>{sub}</Text>
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
        {card.perMonth ? <Text style={styles.planPerMonth}>{card.perMonth}</Text> : null}
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
  outcomeSub: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.mist },
  also: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.mist },
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
  planPerMonth: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.mist },
  note: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.mist, textAlign: 'center' },
  actions: { gap: 10 },
  button: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primary: { backgroundColor: colors.blue },
  secondary: { backgroundColor: 'transparent' },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 17, textAlign: 'center' },
  primaryText: { color: colors.white },
  secondaryText: { color: colors.paper },
  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 2 },
  legalLink: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mist, textDecorationLine: 'underline', paddingVertical: 4 },
  legalDot: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mist },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper, textAlign: 'center', textDecorationLine: 'underline', paddingVertical: 4 },
});
