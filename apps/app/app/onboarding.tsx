import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { track } from '../src/lib/analytics';
import { Back, Chip, Dashed, KnownRow, Primary, Segmented } from '../src/components/OnboardingControls';
import { useCopy } from '../src/i18n';
import { useAuth } from '../src/lib/auth';
import type { MatchLinkView } from '@netprophet/db';
import { nameGender } from '@netprophet/copy';
import { useApi, useOnboardingApi, useRegionAreas, type ClaimRow } from '../src/lib/data';
import { mockLinkView, who } from '../src/lib/link';
import { clearPendingLink, readPendingLink } from '../src/lib/linkHost';
import { usePress, useStgIn } from '../src/lib/motion';
import { areasOf, knownButton, KNOWN_MIN, KNOWN_MIN_LINK, primarySport, REGIONS, splitName, stepsFor, type Region, type SportChoice, type Step } from '../src/lib/onboarding';
import type { PlayerRow } from '../src/lib/players';
import { fmt } from '../src/lib/votes';
import { colors, ease, fonts } from '../src/theme';
import { useOnboardingGate } from '../src/lib/onboardingGate';

/**
 * Onboarding (prototype V2, after the welcome screen): your name, your player on the roster («Είσαι
 * ήδη εδώ;»), how you play (new players only), where you play, and who you know (optional), then straight
 * to Σήμερα and the first vote (founder, 19 Oct: no slides, no splash, Baller after the first vote).
 * No header or tab bar, one blue button per screen.
 * Someone who came from an opponent link confirms the link's player and picks who they know (at least one, the
 * logger already picked), then goes straight in (prototype fromLink).
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
  const { session, signOut } = useAuth();
  // «‹ Πίσω» on the first step: back to the welcome screen (founder, 12 Oct), which means signing out
  const toWelcome = () => {
    void clearPendingLink();
    void signOut();
  };
  const allAreas = useRegionAreas();
  const scroll = useRef<ScrollView>(null);

  const api = useApi();
  // «Κράτα το ματς στο προφίλ σου»: the link that brought them here, if any
  const [link, setLink] = useState<{ token: string; view: MatchLinkView } | null>(null);
  const [linkChecked, setLinkChecked] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      const token = await readPendingLink();
      let found: { token: string; view: MatchLinkView } | null = null;
      if (token) {
        try {
          found = { token, view: api ? await api.getMatchLink(token) : mockLinkView() };
        } catch {
          await clearPendingLink();
        }
      }
      if (!live) return;
      setLink(found);
      setLinkChecked(true);
    })();
    return () => {
      live = false;
    };
  }, [api]);

  const [isNew, setIsNew] = useState(false);
  const steps = stepsFor(isNew, link !== null);
  const [i, setI] = useState(0);
  const step: Step = steps[Math.min(i, steps.length - 1)]!;

  // name
  const [first, setFirst] = useState('');
  const [surname, setSurname] = useState('');
  const [sport, setSport] = useState<SportChoice | null>(null);
  // sign-up is for 15 and over (founder, 12 Oct 2026; the Greek age of digital consent)
  const [adult, setAdult] = useState(false);
  // claim
  const [roster, setRoster] = useState('');
  const [candidates, setCandidates] = useState<ClaimRow[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [own, setOwn] = useState<ClaimRow | null>(null);
  // the claim search starts with the name from the first step and can be changed (founder, 12 Oct)
  const [claimQuery, setClaimQuery] = useState('');
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

  const [busy, setBusy] = useState(false);
  // the claim went to staff: say so, never pretend the player is theirs yet
  const [requested, setRequested] = useState(false);
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
        // an account that already has its player (v1, a link, a replay) sees that player on the claim step
        if (me.player) setOwn({ id: me.player.id, name: `${me.player.first_name} ${me.player.surname}`, sub: '' });
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
  useEffect(() => {
    track('onboarding_step', { step, index: i });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

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
      setClaimQuery(`${f} ${s}`.trim());
      go(i + 1);
      if (own) {
        setCandidates([own]);
        setPicked(own.id);
        return;
      }
      const rows = await ob.candidates(f, s).catch(() => []);
      setCandidates(rows);
      setPicked(rows.length === 1 ? rows[0]!.id : null);
    });

  const claimMe = () =>
    run(async () => {
      if (!picked) return;
      // already theirs: nothing to claim
      if (own && picked === own.id) return go(i + 1);
      const r = await ob.claim(picked);
      track('claim_completed', { result: r });
      if (r === 'ok') return go(i + 1);
      if (r === 'requested') return setRequested(true);
      setError(r === 'taken' ? o.claim.taken : r === 'other' ? o.claim.otherClaimed : o.claim.failed);
    });

  // from a link: the link's player becomes theirs, and the logger tops «Ποιους ξέρεις», already picked
  const claimLink = () =>
    run(async () => {
      if (!link) return;
      const p = link.view.player;
      // a roster player through a link is a request: say so first, the next tap walks on
      if (!requested) {
        try {
          const r = api ? await api.claimViaLink(link.token) : null;
          track('link_claimed', { result: r?.requested ? 'requested' : 'ok' });
          if (r?.requested) {
            setRequested(true);
            return;
          }
        } catch {
          track('link_claimed', { result: 'taken' });
          setError(t.link.claimTaken);
          return;
        }
      }
      if (!first.trim() && !surname.trim()) {
        await ob.saveProfile({ first_name: p.first_name, surname: p.surname, display_name: `${p.first_name} ${p.surname}` });
      }
      go(i + 1);
      const lg = link.view.logged_by;
      const rest = await ob.suggestions().catch(() => []);
      setSuggested([
        ...(lg ? [{ id: lg.player_id, name: `${lg.first_name} ${lg.surname}`, initials: '', look: null, sub: '', form: [], followers: 0 }] : []),
        ...rest.filter((r) => r.id !== lg?.player_id),
      ]);
      if (lg) setKnown([lg.player_id]);
    });

  // «Δεν είμαι εγώ»: forget the link and go the usual way
  const dropLink = () => {
    void clearPendingLink();
    setLink(null);
    go(0);
  };

  // typing in the claim search looks again (from two letters), keeping the account's own player on top
  const searchedFor = useRef('');
  useEffect(() => {
    if (step !== 'claim' || link) return undefined;
    const q = claimQuery.trim();
    if (q === searchedFor.current || q.length < 2) return undefined;
    const id = setTimeout(() => {
      searchedFor.current = q;
      const n = splitName(q);
      ob.candidates(n.first || q, n.surname)
        .then((rows) => {
          const list = own ? [own, ...rows.filter((r) => r.id !== own.id)] : rows;
          setCandidates(list);
          setPicked((p) => (p && list.some((r) => r.id === p) ? p : list.length === 1 ? list[0]!.id : null));
        })
        .catch(() => setCandidates([]));
    }, 300);
    return () => clearTimeout(id);
  }, [claimQuery, step, link, ob, own]);

  const claimNew = () =>
    run(async () => {
      // an account with a player already cannot ask for a new one; in a replay it just walks on
      if (!own) await ob.setClaimStatus('creation_requested');
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

  const enterApp = useCallback(() => {
    gate.open();
    if (!session) router.replace('/');
  }, [gate, session]);

  // the last step: save the setup and open Σήμερα, where the first vote card waits
  const knownDone = () =>
    run(async () => {
      await ob.follow(known);
      if (link) {
        await gate.save({ via: 'link', claimed: true, age_15: true });
        track('onboarding_done', { claimed: true, known: known.length });
        await clearPendingLink();
        return enterApp();
      }
      await gate.save({ via: 'flow', region, sports: sport ?? 'tennis', claimed: !isNew && picked !== null, age_15: true });
      track('onboarding_done', { claimed: !isNew && picked !== null, known: known.length });
      enterApp();
    });

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

  const nameReady = first.trim().length > 0 && surname.trim().length > 0 && sport !== null && adult;
  const kb = knownButton(known.length, t, link ? KNOWN_MIN_LINK : KNOWN_MIN);
  const knownList: (PlayerRow & { followers?: number })[] = found ?? suggested;

  if (!linkChecked) return <View style={styles.screen} />;
  const lp = link?.view.player;

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
              <AgeCheck on={adult} onPress={() => setAdult((a) => !a)} />
              <Err text={error} />
              <Primary label={o.next} ready={nameReady} busy={busy} onPress={nameNext} />
              <Back label={o.back} onPress={toWelcome} />
            </>
          ) : null}

          {step === 'claim' && link && lp ? (
            <>
              <Title text={nameGender(lp.first_name, lp.gender) === 'f' ? t.link.claimTitleF : t.link.claimTitle} />
              <Text style={styles.sub}>{t.link.claimSub}</Text>
              <Candidate row={{ id: lp.id, name: `${lp.first_name} ${lp.surname}`, sub: link.view.tournament ?? '' }} index={0} on onPress={() => undefined} />
              <AgeCheck on={adult} onPress={() => setAdult((a) => !a)} />
              <Err text={error} />
              {requested ? <Text style={styles.note}>{t.link.claimRequested}</Text> : null}
              <Primary label={requested ? t.common.continue : t.link.claimYes} ready={adult} busy={busy} onPress={claimLink} />
              {requested ? null : <Dashed label={t.link.claimNo} onPress={dropLink} />}
              <Back label={o.back} onPress={toWelcome} />
            </>
          ) : null}

          {step === 'claim' && !link ? (
            <>
              <Title text={o.claim.title} />
              <Text style={styles.sub}>{fmt(o.claim.subtitle, { n: roster || '1.500' })}</Text>
              <TextInput
                value={claimQuery}
                onChangeText={setClaimQuery}
                placeholder={o.claim.search}
                placeholderTextColor={colors.inkSoft}
                autoCorrect={false}
                autoCapitalize="words"
                style={[styles.query, styles.queryText]}
              />
              {candidates === null ? null : candidates.length === 0 ? (
                <Text style={styles.note}>{o.claim.none}</Text>
              ) : (
                candidates.map((c, n) => (
                  <Candidate key={c.id} row={c} index={n} on={picked === c.id} onPress={() => setPicked(c.id)} />
                ))
              )}
              <Err text={error} />
              {requested ? (
                <>
                  <Text style={styles.note}>{o.claim.requested}</Text>
                  <Primary label={t.common.continue} ready busy={busy} onPress={() => go(i + 1)} />
                </>
              ) : (
                <>
                  {candidates && candidates.length > 0 ? <Primary label={o.claim.me} ready={picked !== null} busy={busy} onPress={claimMe} /> : null}
                  <Dashed label={o.claim.newPlayer} onPress={claimNew} />
                </>
              )}
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

          {step === 'known' ? (
            <>
              <Title text={o.known.title} />
              <Text style={styles.sub}>{o.known.subtitle}</Text>
              <Text style={styles.note}>
                {link?.view.logged_by ? fmt(t.link.knownNote, { who: who(link.view.logged_by) }) : o.known.noteOptional}
              </Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={o.known.search}
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
                    sub={p.sub}
                    on={known.includes(p.id)}
                    onPress={() => toggleKnown(p.id)}
                    last={n === knownList.length - 1}
                  />
                ))}
              </View>
              <Err text={error} />
              <Primary label={kb.label} ready={kb.ready} busy={busy} onPress={knownDone} />
              <Back label={o.back} onPress={back} />
            </>
          ) : null}
        </StepIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** «Είμαι 15 χρονών και πάνω»: required to go on */
function AgeCheck({ on, onPress }: { on: boolean; onPress: () => void }) {
  const o = useCopy().onboarding;
  return (
    <View style={styles.ageRow}>
      <Chip on={on} onPress={onPress} minHeight={50}>
        {o.age.check}
      </Chip>
    </View>
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


const styles = StyleSheet.create({
  ageRow: { flexDirection: 'row' },
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
  candName: { fontFamily: fonts.displayHeavy, fontSize: 36, lineHeight: 38, paddingBottom: 7, marginBottom: -7, color: colors.ink },
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
});
