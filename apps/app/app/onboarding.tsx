import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GoSplash, IntroSlideView } from '../src/components/IntroSlides';
import { Back, Chip, Dashed, KnownRow, Primary, Segmented } from '../src/components/OnboardingControls';
import { useCopy } from '../src/i18n';
import { useAuth } from '../src/lib/auth';
import { useOnboardingApi, useRegionAreas, type ClaimRow } from '../src/lib/data';
import { usePress, useStgIn } from '../src/lib/motion';
import { areasOf, introNumber, knownButton, KNOWN_MIN, primarySport, REGIONS, splitName, stepsFor, type IntroSlide, type Region, type SportChoice, type Step } from '../src/lib/onboarding';
import type { PlayerRow } from '../src/lib/players';
import { fmt } from '../src/lib/votes';
import { colors, ease, fonts } from '../src/theme';
import { useOnboardingGate } from '../src/lib/onboardingGate';

/**
 * Onboarding (prototype V2, after the welcome screen): your name, your player on the roster («Είσαι
 * ήδη εδώ;»), how you play (new players only), where you play, who you know, then the four intro
 * slides and the «Ας ξεκινήσουμε» splash. No header or tab bar, one blue button per screen.
 */
const IN_MS = 400;
/** 60px titles: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;

export default function OnboardingScreen() {
  const t = useCopy();
  const o = t.onboarding;
  const insets = useSafeAreaInsets();
  const ob = useOnboardingApi();
  const gate = useOnboardingGate();
  const { session } = useAuth();
  const allAreas = useRegionAreas();
  const scroll = useRef<ScrollView>(null);

  const [isNew, setIsNew] = useState(false);
  const steps = stepsFor(isNew);
  const [i, setI] = useState(0);
  const step: Step = steps[Math.min(i, steps.length - 1)]!;

  // name
  const [first, setFirst] = useState('');
  const [surname, setSurname] = useState('');
  const [sport, setSport] = useState<SportChoice | null>(null);
  // claim
  const [roster, setRoster] = useState('');
  const [candidates, setCandidates] = useState<ClaimRow[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  // play
  const [hand, setHand] = useState<'R' | 'L' | null>(null);
  const [tour, setTour] = useState<string | null>(null);
  // area
  const [region, setRegion] = useState<Region | null>(null);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  // known
  const [suggested, setSuggested] = useState<(PlayerRow & { followers: number })[]>([]);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<PlayerRow[] | null>(null);
  const [known, setKnown] = useState<string[]>([]);
  const [skipped, setSkipped] = useState(false);

  const [going, setGoing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // the name we already know (Google, or a v1 profile) fills the first step
  useEffect(() => {
    ob.me()
      .then((me) => {
        if (!me) return;
        const p = me.profile;
        const split = p.first_name || p.surname ? { first: p.first_name ?? '', surname: p.surname ?? '' } : splitName(p.display_name);
        setFirst(split.first);
        setSurname(split.surname);
        if (p.primary_sport === 'padel') setSport('padel');
      })
      .catch(() => undefined);
    ob.rosterSize().then(setRoster).catch(() => undefined);
  }, [ob]);

  const go = useCallback(
    (to: number) => {
      setError(null);
      setI(Math.max(0, to));
      setTimeout(() => scroll.current?.scrollTo({ y: 0, animated: false }), 20);
    },
    [],
  );
  const back = useCallback(() => {
    if (i === 0) return false;
    // stepping back over «Πώς παίζεις;» to the claim undoes «είμαι καινούριος»
    if (step === 'play') setIsNew(false);
    go(i - 1);
    return true;
  }, [i, step, go]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [back]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch {
      setError(o.failed);
    } finally {
      setBusy(false);
    }
  };

  /* ---------- steps ---------- */

  const nameNext = () =>
    run(async () => {
      const f = first.trim();
      const s = surname.trim();
      await ob.saveProfile({ first_name: f, surname: s, display_name: `${f} ${s}`.trim(), primary_sport: primarySport(sport ?? 'tennis') });
      setCandidates(null);
      setPicked(null);
      go(i + 1);
      const rows = await ob.candidates(f, s).catch(() => []);
      setCandidates(rows);
      setPicked(rows.length === 1 ? rows[0]!.id : null);
    });

  const claimMe = () =>
    run(async () => {
      if (!picked) return;
      const r = await ob.claim(picked);
      if (r === 'ok') return go(i + 1);
      setError(r === 'taken' ? o.claim.taken : r === 'other' ? o.claim.otherClaimed : o.claim.failed);
    });

  const claimNew = () =>
    run(async () => {
      await ob.setClaimStatus('creation_requested');
      setIsNew(true);
      go(i + 1);
    });

  const playNext = () =>
    run(async () => {
      await ob.saveProfile({ hand, tournament_experience: tour });
      go(i + 1);
    });

  const areaNext = () =>
    run(async () => {
      await ob.saveProfile({ area_ids: areaIds, area_id: areaIds[0] ?? null });
      go(i + 1);
      ob.suggestions().then(setSuggested).catch(() => setSuggested([]));
    });

  // the setup is saved here, so quitting during the slides still opens the app next time
  const knownDone = () =>
    run(async () => {
      await ob.follow(known);
      await gate.save({ via: 'flow', region, sports: sport ?? 'tennis', claimed: !isNew && picked !== null });
      go(i + 1);
    });

  const enterApp = useCallback(() => {
    gate.open();
    if (!session) router.replace('/');
  }, [gate, session]);

  const skipKnown = () => {
    setSkipped(true);
    setQuery('');
    setFound(null);
    setKnown(suggested.slice(0, KNOWN_MIN).map((p) => p.id));
  };

  // «Ψάξε όνομα»: a real search from two letters
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setFound(null);
      return undefined;
    }
    const id = setTimeout(() => {
      ob.search(q).then(setFound).catch(() => setFound([]));
    }, 250);
    return () => clearTimeout(id);
  }, [query, ob]);

  const toggleKnown = (id: string) => setKnown((k) => (k.includes(id) ? k.filter((x) => x !== id) : k.concat(id)));
  const toggleArea = (id: string) => setAreaIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : a.concat(id)));

  const nameReady = first.trim().length > 0 && surname.trim().length > 0 && sport !== null;
  const kb = knownButton(known.length, t);
  const knownList: (PlayerRow & { followers?: number })[] = found ?? suggested;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.scroll, { paddingTop: 18 + insets.top, paddingBottom: Math.max(14, insets.bottom) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StepIn key={step}>
          {step === 'name' ? (
            <>
              <Title text={o.name.title} />
              <Text style={styles.sub}>{o.name.subtitle}</Text>
              <Field value={first} onChange={setFirst} placeholder={o.name.first} autoComplete="given-name" />
              <Field value={surname} onChange={setSurname} placeholder={o.name.surname} autoComplete="family-name" />
              <Text style={styles.label}>{o.name.sport}</Text>
              <Segmented
                options={[
                  { id: 'tennis', label: o.name.sports.tennis },
                  { id: 'padel', label: o.name.sports.padel },
                  { id: 'both', label: o.name.sports.both },
                ]}
                value={sport}
                onChange={setSport}
              />
              <Err text={error} />
              <Primary label={o.next} ready={nameReady} busy={busy} onPress={nameNext} />
            </>
          ) : null}

          {step === 'claim' ? (
            <>
              <Title text={o.claim.title} />
              <Text style={styles.sub}>{fmt(o.claim.subtitle, { n: roster || '1.500' })}</Text>
              <View style={styles.query}>
                <Text style={styles.queryText} numberOfLines={1}>
                  {`${first} ${surname}`.trim()}
                </Text>
              </View>
              {candidates === null ? null : candidates.length === 0 ? (
                <Text style={styles.note}>{o.claim.none}</Text>
              ) : (
                candidates.map((c, n) => (
                  <Candidate key={c.id} row={c} index={n} on={picked === c.id} onPress={() => setPicked(c.id)} />
                ))
              )}
              <Err text={error} />
              {candidates && candidates.length > 0 ? <Primary label={o.claim.me} ready={picked !== null} busy={busy} onPress={claimMe} /> : null}
              <Dashed label={o.claim.newPlayer} onPress={claimNew} />
              <Back label={o.back} onPress={back} />
            </>
          ) : null}

          {step === 'play' ? (
            <>
              <Title text={o.play.title} />
              <Text style={styles.sub}>{o.play.subtitle}</Text>
              <Text style={styles.label}>{o.play.hand}</Text>
              <Segmented
                options={[
                  { id: 'R', label: o.play.hands.R },
                  { id: 'L', label: o.play.hands.L },
                ]}
                value={hand}
                onChange={setHand}
              />
              <Text style={styles.label}>{o.play.tour}</Text>
              <View style={styles.stack}>
                {o.play.tours.map((x) => (
                  <View key={x.id} style={styles.row}>
                    <Chip on={tour === x.id} onPress={() => setTour(x.id)} minHeight={54} center={false}>
                      <Text style={[styles.chipName, { color: tour === x.id ? colors.paper : colors.ink }]}>{x.name}</Text>
                      <Text style={[styles.chipSub, { color: tour === x.id ? colors.paper : colors.ink }]}>{x.sub}</Text>
                    </Chip>
                  </View>
                ))}
              </View>
              <Err text={error} />
              <Primary label={o.next} ready={hand !== null && tour !== null} busy={busy} onPress={playNext} />
              <Back label={o.back} onPress={back} />
            </>
          ) : null}

          {step === 'area' ? (
            <>
              <Title text={o.area.title} />
              <Text style={styles.sub}>{o.area.subtitle}</Text>
              <Segmented
                options={REGIONS.map((r) => ({ id: r, label: o.area.regions[r] }))}
                value={region}
                onChange={(r) => {
                  setRegion(r);
                  setAreaIds([]);
                }}
              />
              {region ? (
                <StepIn key={region} duration={350}>
                  <Text style={styles.label}>{o.area.where[region]}</Text>
                  <View style={styles.grid}>
                    {areasOf(allAreas, region).map((a) => (
                      <View key={a.id} style={styles.half}>
                        <Chip on={areaIds.includes(a.id)} onPress={() => toggleArea(a.id)}>
                          {a.name}
                        </Chip>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.note}>{o.area.help}</Text>
                </StepIn>
              ) : null}
              <Err text={error} />
              <Primary label={o.next} ready={region !== null} busy={busy} onPress={areaNext} />
              <Back label={o.back} onPress={back} />
            </>
          ) : null}

          {introNumber(step) > 0 ? (
            <IntroSlideView slide={step as IntroSlide} onNext={() => (step === 'e4' ? setGoing(true) : go(i + 1))} onBack={back} />
          ) : null}

          {step === 'known' ? (
            <>
              <Title text={o.known.title} />
              <Text style={styles.sub}>{o.known.subtitle}</Text>
              <Text style={styles.note}>{skipped ? o.known.noteSuggested : o.known.note}</Text>
              <TextInput
                value={query}
                onChangeText={(q) => {
                  setQuery(q);
                  setSkipped(false);
                }}
                placeholder={skipped ? o.known.searchSuggested : o.known.search}
                placeholderTextColor={colors.inkSoft}
                autoCorrect={false}
                autoCapitalize="none"
                style={[styles.search, query ? styles.searchOn : null]}
              />
              <View style={styles.list}>
                {knownList.length === 0 && found !== null ? <Text style={styles.note}>{o.known.noneFound}</Text> : null}
                {knownList.map((p, n) => (
                  <KnownRow
                    key={p.id}
                    name={p.name}
                    sub={[p.sub, skipped && p.followers ? fmt(o.known.followers, { n: p.followers }) : null].filter(Boolean).join(' · ')}
                    on={known.includes(p.id)}
                    onPress={() => toggleKnown(p.id)}
                    last={n === knownList.length - 1}
                  />
                ))}
              </View>
              <Err text={error} />
              <Primary label={kb.label} ready={kb.ready} busy={busy} onPress={knownDone} />
              <View style={styles.bottomRow}>
                <Back label={o.back} onPress={back} />
                <Link label={o.known.none} onPress={skipKnown} />
              </View>
            </>
          ) : null}
        </StepIn>
      </ScrollView>
      {going ? <GoSplash onDone={enterApp} /> : null}
    </KeyboardAvoidingView>
  );
}

/** inA: each step fades in from 12px below */
function StepIn({ children, duration = IN_MS }: { children: React.ReactNode; duration?: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration, easing: ease });
  }, [p, duration]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 12 }] }));
  return <Animated.View style={[styles.step, style]}>{children}</Animated.View>;
}

function Title({ text }: { text: string }) {
  return <Text style={styles.title}>{text}</Text>;
}

function Err({ text }: { text: string | null }) {
  return text ? <Text style={styles.error}>{text}</Text> : null;
}

function Field(props: { value: string; onChange: (v: string) => void; placeholder: string; autoComplete: 'given-name' | 'family-name' }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChange}
      placeholder={props.placeholder}
      placeholderTextColor={colors.inkSoft}
      autoComplete={props.autoComplete}
      autoCapitalize="words"
      autoCorrect={false}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.field, { borderColor: focused || props.value ? colors.ink : colors.fog }]}
    />
  );
}

/** a candidate player: chosen with an ink outline; the one blue «Εγώ είμαι» sits below the list */
function Candidate({ row, index, on, onPress }: { row: ClaimRow; index: number; on: boolean; onPress: () => void }) {
  const enter = useStgIn(400, 120 + index * 50);
  const press = usePress();
  return (
    <Animated.View style={enter}>
      <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.candidate, { borderColor: on ? colors.ink : 'transparent' }, press.style]}>
          <Text style={styles.candName} numberOfLines={1}>
            {row.name}
          </Text>
          {row.sub ? <Text style={styles.candSub}>{row.sub}</Text> : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.linkHit}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  step: { flexGrow: 1, gap: 12 },
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: 60,
    lineHeight: 57,
    color: colors.ink,
    paddingTop: ACCENT_PAD,
    marginTop: -ACCENT_PAD,
  },
  sub: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20.25, color: colors.inkSoft },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  note: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  error: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.ink },
  field: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.ink,
  },
  query: { height: 52, paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.white, justifyContent: 'center' },
  queryText: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink },
  candidate: { paddingVertical: 16, paddingHorizontal: 18, borderRadius: 22, backgroundColor: colors.white, borderWidth: 2, gap: 2 },
  candName: { fontFamily: fonts.displayHeavy, fontSize: 36, lineHeight: 38, color: colors.ink },
  candSub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  stack: { gap: 8 },
  row: { flexDirection: 'row' },
  chipName: { fontFamily: fonts.bodyBold, fontSize: 16 },
  chipSub: { fontFamily: fonts.bodySemi, fontSize: 12, opacity: 0.75 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  half: { width: '48.5%', flexDirection: 'row' },
  search: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.fog,
    backgroundColor: colors.white,
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink,
  },
  searchOn: { borderColor: colors.ink },
  list: { minHeight: 200, borderRadius: 22, backgroundColor: colors.white, paddingVertical: 4, paddingHorizontal: 14 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  linkHit: { minHeight: 44, justifyContent: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
});
