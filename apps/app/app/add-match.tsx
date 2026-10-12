import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MyMatchCandidate, PlayerCard } from '@netprophet/db';
import { Back, Chip, Primary, Segmented } from '../src/components/OnboardingControls';
import { useCopy } from '../src/i18n';
import { useLogMatch, type LogError } from '../src/lib/data';
import {
  emptyForm,
  knownPeople,
  otherDays,
  peopleDone,
  peopleLabel,
  personName,
  pickingPartner,
  quickDays,
  ready,
  searchLabel,
  toInput,
  topDone,
  topLine,
  type LogForm,
  type Mode,
  type PickedPerson,
} from '../src/lib/logMatch';
import { usePress, useStgIn } from '../src/lib/motion';
import { fmt } from '../src/lib/votes';
import { colors, fonts } from '../src/theme';

/**
 * «+ Ματς» (prototype V2, isForm and isDone). «Παίχτηκε»: when, tournament, singles / doubles / mixed, the
 * people, who won and the sets; «Έρχεται»: the same without the result. A played match the app already has
 * («Αυτό είναι το ματς σου;») gets only its result, so the votes on it count. New names become pending players.
 * Kudos after a played match come in M2 part 4. One blue button: the submit (then «Δες το» on the done screen).
 */
type Section = 'd' | 't' | 'k' | null;
/** big titles: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;

export default function AddMatch() {
  const t = useCopy();
  const a = t.addMatch;
  const insets = useSafeAreaInsets();
  const data = useLogMatch();
  const now = useMemo(() => new Date(), []);
  const [form, setForm] = useState<LogForm>(emptyForm('played'));
  const [open, setOpen] = useState<Section>('d');
  const [moreDays, setMoreDays] = useState(false);
  const [otherTour, setOtherTour] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LogError | null>(null);
  const [mine, setMine] = useState<MyMatchCandidate[] | null>(null);
  const [done, setDone] = useState(false);

  const set = (patch: Partial<LogForm>) => {
    setError(null);
    setForm((f) => ({ ...f, ...patch }));
  };
  // after a choice, open the next empty section, or close them all
  const next = (f: LogForm): Section => (!f.date ? 'd' : !f.tournament ? 't' : !f.format ? 'k' : null);
  const choose = (patch: Partial<LogForm>) => {
    const f = { ...form, ...patch };
    set(patch);
    setOpen(next(f));
  };
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const send = async (matchId?: string) => {
    setBusy(true);
    const r = await data.submit(toInput(form, matchId));
    setBusy(false);
    if (r.ok) setDone(true);
    else setError(r.error);
  };

  const onSubmit = async () => {
    if (!ready(form)) return;
    // a played match the app already has: ask before making a second one
    if (form.mode === 'played') {
      const found = await data.findMine(knownPeople(form), form.date!, form.format!);
      if (found.length > 0) {
        setMine(found);
        return;
      }
    }
    await send();
  };

  if (done) return <Done form={form} onAgain={() => { setForm(emptyForm(form.mode)); setOpen('d'); setDone(false); setMine(null); }} />;

  const single = form.format === 'singles';
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Back label={`‹ ${t.common.back}`} onPress={close} />
        <Text style={styles.title}>{form.mode === 'played' ? a.titlePlayed : a.titleSoon}</Text>
        <Segmented
          options={[
            { id: 'played' as Mode, label: a.modes.played },
            { id: 'soon' as Mode, label: a.modes.soon },
          ]}
          value={form.mode}
          onChange={(m) => {
            setForm(emptyForm(m));
            setOpen('d');
            setMine(null);
          }}
        />
        <Text style={styles.sub}>{form.mode === 'played' ? a.subPlayed : a.subSoon}</Text>

        {!topDone(form) || open ? (
          <View style={styles.card}>
            <Row label={a.when} value={form.date ? topLine({ ...form, tournament: null, format: null }, now, t) : a.choose} on={!!form.date} onPress={() => setOpen(open === 'd' ? null : 'd')} />
            {open === 'd' ? (
              <View style={styles.options}>
                <View style={styles.grid}>
                  {quickDays(form.mode, now, t).map((d) => (
                    <View key={d.key} style={styles.third}>
                      <Chip on={form.date === d.key} onPress={() => choose({ date: d.key })} minHeight={48} bg={colors.paper}>
                        {d.label}
                      </Chip>
                    </View>
                  ))}
                  <View style={styles.third}>
                    <Chip on={moreDays} onPress={() => setMoreDays(true)} minHeight={48} bg={colors.paper}>
                      {a.otherDay}
                    </Chip>
                  </View>
                </View>
                {moreDays ? (
                  <View style={styles.grid}>
                    {otherDays(form.mode, now).map((d) => (
                      <View key={d.key} style={styles.third}>
                        <Chip on={form.date === d.key} onPress={() => choose({ date: d.key })} minHeight={44} bg={colors.paper}>
                          {d.label}
                        </Chip>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
            <View style={styles.line} />
            <Row
              label={a.tournament}
              value={!form.tournament ? a.choose : form.tournament.kind === 'friendly' ? a.friendly : form.tournament.name || a.otherTournament}
              on={!!form.tournament}
              onPress={() => setOpen(open === 't' ? null : 't')}
            />
            {open === 't' ? (
              <View style={styles.options}>
                <View style={styles.grid}>
                  <View style={styles.half}>
                    <Chip on={form.tournament?.kind === 'friendly'} onPress={() => choose({ tournament: { kind: 'friendly' } })} minHeight={48} bg={colors.paper}>
                      {a.friendly}
                    </Chip>
                  </View>
                  {data.tournaments.map((x) => (
                    <View key={x.id} style={styles.half}>
                      <Chip on={form.tournament?.kind === 'tournament' && form.tournament.id === x.id} onPress={() => choose({ tournament: { kind: 'tournament', id: x.id, name: x.name } })} minHeight={48} bg={colors.paper}>
                        {x.name}
                      </Chip>
                    </View>
                  ))}
                  <View style={styles.half}>
                    <Chip on={form.tournament?.kind === 'other'} onPress={() => set({ tournament: { kind: 'other', name: otherTour } })} minHeight={48} bg={colors.paper}>
                      {a.otherTournament}
                    </Chip>
                  </View>
                </View>
                {form.tournament?.kind === 'other' ? (
                  <>
                    <TextInput
                      value={otherTour}
                      onChangeText={(v) => {
                        setOtherTour(v);
                        set({ tournament: { kind: 'other', name: v } });
                      }}
                      onSubmitEditing={() => otherTour.trim() && setOpen(next(form))}
                      placeholder={a.otherPlaceholder}
                      placeholderTextColor={colors.inkSoft}
                      style={styles.input}
                    />
                    <Text style={styles.note}>{a.otherNote}</Text>
                  </>
                ) : null}
              </View>
            ) : null}
            <View style={styles.line} />
            <Row label={a.kind} value={form.format ? a.kinds[form.format] : a.choose} on={!!form.format} onPress={() => setOpen(open === 'k' ? null : 'k')} />
            {open === 'k' ? (
              <View style={styles.options}>
                <Segmented
                  options={(['singles', 'doubles', 'mixed'] as const).map((k) => ({ id: k, label: a.kinds[k] }))}
                  value={form.format}
                  onChange={(k) => choose({ format: k, partner: null, opponents: [], won: null, sets: null })}
                />
              </View>
            ) : null}
          </View>
        ) : (
          <Summary label={a.match} value={topLine(form, now, t)} change={a.change} onChange={() => setOpen('d')} />
        )}

        {topDone(form) && !open ? (
          <>
            {form.partner ? <Summary label={form.format === 'mixed' ? a.partner.f : a.partner.m} value={personName(form.partner)} change={a.change} onChange={() => set({ partner: null, opponents: [] })} /> : null}
            {form.opponents.map((p, i) => (
              <Summary key={i} label={single ? a.with : a.against} value={personName(p)} change={a.change} onChange={() => set({ opponents: form.opponents.filter((_, k) => k !== i) })} />
            ))}
            {!peopleDone(form) ? (
              <People
                label={peopleLabel(form, t)}
                data={data}
                exclude={[form.partner, ...form.opponents].flatMap((p) => (p?.kind === 'player' ? [p.id] : []))}
                onPick={(p) => (pickingPartner(form) ? set({ partner: p }) : set({ opponents: [...form.opponents, p] }))}
              />
            ) : null}
          </>
        ) : null}

        {form.mode === 'played' && topDone(form) && !open && peopleDone(form) ? (
          <View style={styles.outcome}>
            <View style={styles.grid}>
              {[true, false].map((won) => (
                <View key={String(won)} style={styles.half}>
                  <Chip on={form.won === won} onPress={() => set({ won })} minHeight={64}>
                    <Text style={[styles.outcomeText, { color: form.won === won ? colors.paper : colors.ink }]}>{(won ? a.won : a.lost)[single ? 'one' : 'many']}</Text>
                  </Chip>
                </View>
              ))}
            </View>
            {form.won !== null ? (
              <View style={styles.grid}>
                {(['2-0', '2-1'] as const).map((sc) => (
                  <View key={sc} style={styles.half}>
                    <Chip on={form.sets === sc} onPress={() => set({ sets: sc })} minHeight={52}>
                      {form.won ? sc : sc.split('-').reverse().join('-')}
                    </Chip>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {mine && mine.length > 0 ? (
          <IsYours candidates={mine} busy={busy} onYes={(id) => void send(id)} onNo={() => void send().then(() => setMine(null))} />
        ) : ready(form) && !open ? (
          <Primary label={form.mode === 'played' ? a.submitPlayed : a.submitSoon} busy={busy} onPress={() => void onSubmit()} />
        ) : null}
        {error ? <Text style={styles.error}>{error === 'duplicate' ? a.errors.duplicate : error === 'name_required' ? a.errors.nameRequired : a.errors.failed}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value, on, onPress }: { label: string; value: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: on ? colors.ink : colors.blue }]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

function Summary({ label, value, change, onChange }: { label: string; value: string; change: string; onChange: () => void }) {
  const enter = useStgIn(400, 0);
  return (
    <Animated.View style={[styles.summary, enter]}>
      <View style={styles.summaryText}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onChange} style={styles.changeHit}>
        <Text style={styles.change}>{change}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** the quick picks, a search, and «+ Πρόσθεσε» for a name we do not have */
function People({ label, data, exclude, onPick }: { label: string; data: ReturnType<typeof useLogMatch>; exclude: string[]; onPick: (p: PickedPerson) => void }) {
  const t = useCopy();
  const a = t.addMatch;
  const [q, setQ] = useState('');
  const [found, setFound] = useState<PlayerCard[] | null>(null);
  const [first, setFirst] = useState('');
  const [surname, setSurname] = useState('');

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setFound(null);
      return undefined;
    }
    const id = setTimeout(() => void data.search(term).then(setFound).catch(() => setFound([])), 250);
    return () => clearTimeout(id);
  }, [q, data]);

  const list = (found ?? data.suggestions).filter((p) => !exclude.includes(p.id)).slice(0, 6);
  const pick = (p: PlayerCard) => {
    onPick({ kind: 'player', id: p.id, first: p.first_name, surname: p.surname, sub: '' });
    setQ('');
  };
  const addNew = () => {
    if (!first.trim() || !surname.trim()) return;
    onPick({ kind: 'new', first: first.trim(), surname: surname.trim() });
    setQ('');
    setFirst('');
    setSurname('');
  };

  return (
    <View style={styles.people}>
      <Text style={styles.peopleLabel}>{label}</Text>
      <TextInput value={q} onChangeText={setQ} placeholder={searchLabel(data.total || '1.500', t)} placeholderTextColor={colors.inkSoft} autoCorrect={false} style={styles.input} />
      <View style={styles.grid}>
        {list.map((p, i) => (
          <PersonChip key={p.id} p={p} sub={[p.level_tier != null ? `${t.level.label} ${p.level_tier}` : null, p.area_id ? data.areas[p.area_id] : null].filter(Boolean).join(' · ')} index={i} onPress={() => pick(p)} />
        ))}
      </View>
      {found !== null && list.length === 0 ? (
        <View style={styles.newName}>
          <Text style={styles.note}>{a.noneFound}</Text>
          <View style={styles.grid}>
            <TextInput value={first} onChangeText={setFirst} placeholder={a.first} placeholderTextColor={colors.inkSoft} style={[styles.input, styles.half]} />
            <TextInput value={surname} onChangeText={setSurname} placeholder={a.surname} placeholderTextColor={colors.inkSoft} style={[styles.input, styles.half]} />
          </View>
          {first.trim() && surname.trim() ? (
            <Pressable accessibilityRole="button" onPress={addNew} style={styles.changeHit}>
              <Text style={styles.addNew}>{fmt(a.addNew, { name: `${first.trim()} ${surname.trim()}` })}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function PersonChip({ p, sub, index, onPress }: { p: PlayerCard; sub: string; index: number; onPress: () => void }) {
  const enter = useStgIn(400, index * 60);
  const press = usePress();
  return (
    <Animated.View style={[styles.half, enter]}>
      <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.fill}>
        <Animated.View style={[styles.person, press.style]}>
          <Text style={styles.personFirst} numberOfLines={1}>
            {p.first_name}
          </Text>
          <Text style={styles.personSurname} numberOfLines={1}>
            {p.surname}
          </Text>
          {sub ? (
            <Text style={styles.personSub} numberOfLines={1}>
              {sub}
            </Text>
          ) : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** «Αυτό είναι το ματς σου;»: the same people, a day either way, no result yet */
function IsYours({ candidates, busy, onYes, onNo }: { candidates: MyMatchCandidate[]; busy: boolean; onYes: (id: string) => void; onNo: () => void }) {
  const t = useCopy();
  const a = t.addMatch;
  const c = candidates[0]!;
  const names = c.sides.map((s) => s.players.map((p) => `${p.first_name} ${p.surname}`).join(' & ')).join(' - ');
  return (
    <View style={styles.isYours}>
      <Text style={styles.isYoursTitle}>{a.isYours}</Text>
      <Text style={styles.isYoursMatch}>{names}</Text>
      {c.tournament ? <Text style={styles.note}>{c.tournament}</Text> : null}
      <Text style={styles.note}>{a.isYoursSub}</Text>
      <Primary label={a.isYoursYes} busy={busy} onPress={() => onYes(c.match_id)} />
      <Pressable accessibilityRole="button" onPress={onNo} style={styles.changeHit}>
        <Text style={styles.change}>{a.isYoursNo}</Text>
      </Pressable>
    </View>
  );
}

/** isDone: «Μπήκε», the match, what happens now */
function Done({ form, onAgain }: { form: LogForm; onAgain: () => void }) {
  const t = useCopy();
  const d = t.addMatch.done;
  const insets = useSafeAreaInsets();
  const enter = useStgIn(450, 50);
  const us = [t.ladder.you, ...(form.partner ? [personName(form.partner)] : [])].join(' & ');
  const them = form.opponents.map(personName).join(' & ');
  return (
    <View style={[styles.screen, styles.done, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.doneCard, enter]}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{d.pill}</Text>
        </View>
        <Text style={styles.doneHead}>{form.mode === 'played' ? d.headPlayed : d.head}</Text>
        <Text style={styles.doneLine}>{fmt(d.line, { me: us, them })}</Text>
        <Text style={styles.doneSub}>{form.mode === 'played' ? d.subPlayed : d.subSoon}</Text>
      </Animated.View>
      <View style={styles.doneActions}>
        <Primary label={form.mode === 'played' ? d.goPlayed : d.goSoon} onPress={() => router.replace(form.mode === 'played' ? '/results' : '/')} />
        <Pressable accessibilityRole="button" onPress={onAgain} style={styles.againHit}>
          <Text style={styles.again}>{d.again}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingHorizontal: 20, gap: 12 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 48, lineHeight: 46, color: colors.ink, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  sub: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  card: { borderRadius: 18, backgroundColor: colors.white, paddingHorizontal: 14 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  rowValue: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, textAlign: 'right' },
  line: { height: 1, backgroundColor: colors.navLine },
  options: { gap: 8, paddingBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  third: { width: '31.5%', flexDirection: 'row' },
  half: { width: '48.5%', flexDirection: 'row' },
  input: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.fog,
    backgroundColor: colors.white,
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink,
  },
  note: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  summary: { minHeight: 56, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryText: { flex: 1, minWidth: 0 },
  summaryLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkSoft },
  summaryValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  changeHit: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  change: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' },
  people: { gap: 8 },
  peopleLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  fill: { flex: 1 },
  person: { flex: 1, minHeight: 84, padding: 12, borderRadius: 16, backgroundColor: colors.white, justifyContent: 'flex-end' },
  personFirst: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft },
  personSurname: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 26, color: colors.ink },
  personSub: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
  newName: { gap: 8 },
  addNew: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
  outcome: { gap: 8 },
  outcomeText: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 32 },
  error: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  isYours: { padding: 16, borderRadius: 20, backgroundColor: colors.white, gap: 8 },
  isYoursTitle: { fontFamily: fonts.displayHeavy, fontSize: 28, lineHeight: 30, color: colors.ink },
  isYoursMatch: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  done: { paddingHorizontal: 20, justifyContent: 'space-between' },
  doneCard: { padding: 22, borderRadius: 28, backgroundColor: colors.ink, gap: 8 },
  pill: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.lime },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  doneHead: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 44, color: colors.paper, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  doneLine: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 23, color: colors.paper },
  doneSub: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20, color: colors.mist },
  doneActions: { gap: 4 },
  againHit: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  again: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
});
