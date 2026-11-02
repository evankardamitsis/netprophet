import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { greekCaps } from '@netprophet/copy';
import type { TraitRow } from '@netprophet/db';
import { useCopy } from '../i18n';
import type { TraitsState } from '../lib/data';
import { runJpop, usePopIn, usePress, useStgIn } from '../lib/motion';
import { TRAIT_MAX, barWidth, maxVotes, myVotes, saidTraits, shownTraits, splitTraits, topCount, traitGender, traitLabel, votesFull, type TraitErrorKind } from '../lib/traits';
import { fmt } from '../lib/votes';
import { colors, ease, fonts, motion } from '../theme';

/** a tap: the chip jpops and a «+1» floats up */
const JPOP_MS = 400;
/** after the third vote the chips fold, once the ✓ and the toast have been seen */
const FOLD_MS = 1200;

/**
 * «Πώς παίζει» on a player's profile. Founder, 2 Nov 2026: you see what the others said, your vote gets a clear ✓,
 * three at most. Two parts: «Τι λένε οι άλλοι», the phrases people voted with a lime bar and the count (most voted
 * first), and «Εσύ τι λες;», the phrases as chips: tap to vote (the chip turns ink with ✓, a «+1», a toast, and the bar
 * above grows), tap again to take it back. With three picked the rest rest until you take one back. Add your own
 * (it is one of the three), see yours waiting for review. Not on your own profile.
 * Once you have voted, «Εσύ τι λες;» folds away and only ΠΩΣ ΠΑΙΖΕΙ stays, yours marked ✓ (founder, 2 Nov 2026):
 * folded when the card opens with your votes in, and on its own a moment after your third; «Άλλαξε ›» opens it again.
 */
export function PlayerTraits({
  state,
  first,
  onToast,
}: {
  state: TraitsState;
  first: string;
  onToast: (text: string) => void;
}) {
  const t = useCopy();
  const k = t.traits;
  const enter = useStgIn(450, 250);
  const { traits, vote, suggest } = state;
  const used0 = traits ? myVotes(traits) : 0;
  // folded once you have voted; null until the first answer arrives, so a card that loads with votes starts folded
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    if (traits && open === null) setOpen(used0 === 0);
  }, [traits, open, used0]);
  const full0 = traits ? votesFull(traits) : false;
  const wasFull = useRef(full0);
  useEffect(() => {
    // the third vote just went in: fold a moment later; taking one back never folds
    const reached = full0 && !wasFull.current;
    wasFull.current = full0;
    if (!reached) return undefined;
    const id = setTimeout(() => setOpen(false), FOLD_MS);
    return () => clearTimeout(id);
  }, [full0]);
  if (!traits || traits.is_me) return null;
  const { pending } = splitTraits(traits.traits);
  const shown = shownTraits(traits);
  const said = saidTraits(traits);
  if (!traits.can_vote && said.length === 0) return null;
  const gender = traitGender(traits.gender, first);
  const top = topCount(said);
  const used = myVotes(traits);
  const full = votesFull(traits);
  const say = (kind: TraitErrorKind) =>
    onToast(
      kind === 'bad_label'
        ? k.badLabel
        : kind === 'too_many_pending'
          ? k.tooMany
          : kind === 'too_many_votes'
            ? k.full
            : kind === 'rate_limited'
              ? k.rateLimited
              : kind === 'not_allowed'
                ? k.notAllowed
                : k.failed,
    );
  const tap = async (row: TraitRow) => {
    // three picked: the others wait, nothing goes to the server
    if (!row.mine && full) return onToast(k.full);
    const kind = await vote(row.id);
    if (kind) say(kind);
    else onToast(row.mine ? k.unvoted : k.voted);
  };
  return (
    <Animated.View style={[styles.card, enter]}>
      <View style={styles.headRow}>
        <Text style={styles.head}>{greekCaps(k.title)}</Text>
        {traits.voters > 0 ? (
          <Text style={styles.voters}>{traits.voters === 1 ? k.voters.one : fmt(k.voters.many, { n: traits.voters })}</Text>
        ) : null}
      </View>

      <Text style={styles.sub}>{k.said}</Text>
      {said.length === 0 ? (
        <Text style={styles.none}>{k.saidNone}</Text>
      ) : (
        <View style={styles.said}>
          {said.map((row, i) => (
            <SaidRow key={row.id} label={traitLabel(row, gender)} n={row.count ?? 0} top={top} mine={row.mine} index={i} />
          ))}
        </View>
      )}

      {traits.can_vote && open === false ? (
        <>
          <View style={styles.rule} />
          <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.foldHit}>
            <View style={styles.headRow}>
              <Text style={styles.sub}>{k.yours}</Text>
              <Text style={[styles.used, used > 0 && styles.usedOn]}>
                {fmt(k.yoursCount, { n: Math.min(used, maxVotes(traits)) })} · {k.change}
              </Text>
            </View>
          </Pressable>
        </>
      ) : null}

      {traits.can_vote && open !== false ? (
        <>
          <View style={styles.rule} />
          <View style={styles.headRow}>
            <Text style={styles.sub}>{k.yours}</Text>
            <Text style={[styles.used, used > 0 && styles.usedOn]}>{fmt(k.yoursCount, { n: Math.min(used, maxVotes(traits)) })}</Text>
          </View>
          <Text style={styles.note}>{k.yoursNote}</Text>
          <View style={styles.chips}>
            {shown.map((row, i) => (
              <Chip
                key={row.id}
                row={row}
                label={traitLabel(row, gender)}
                index={i}
                resting={full && !row.mine}
                onPress={() => void tap(row)}
              />
            ))}
          </View>
          {pending.map((row) => (
            <Pending key={row.id} label={traitLabel(row, gender)} />
          ))}
          <Add
            onSubmit={async (text) => {
              if (full) {
                onToast(k.full);
                return false;
              }
              const kind = await suggest(text);
              if (kind) say(kind);
              else onToast(k.sent);
              return kind === null;
            }}
          />
        </>
      ) : null}
    </Animated.View>
  );
}

/** one phrase people voted: the words, a lime bar that grows to its share of the leader, the count */
function SaidRow({ label, n, top, mine, index }: { label: string; n: number; top: number; mine: boolean; index: number }) {
  const enter = useStgIn(motion.revealDurShort, 300 + Math.min(index, 8) * motion.stagger);
  const width = useSharedValue(0);
  const target = barWidth(n, top);
  useEffect(() => {
    width.value = withTiming(target, { duration: motion.revealDur, easing: ease });
  }, [target, width]);
  const bar = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  return (
    <Animated.View style={[styles.saidRow, enter]} accessible accessibilityLabel={`${label}, ${n}`}>
      <View style={styles.saidTop}>
        <Text style={styles.saidLabel}>
          {mine ? '✓ ' : ''}
          {label}
        </Text>
        <Text style={styles.saidN}>{n}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, bar]} />
      </View>
    </Animated.View>
  );
}

function Chip({ row, label, index, resting, onPress }: { row: TraitRow; label: string; index: number; resting: boolean; onPress: () => void }) {
  const k = useCopy().traits;
  const enter = usePopIn(motion.revealDurShort, 300 + Math.min(index, 8) * motion.stagger);
  const press = usePress();

  const jpop = useSharedValue(1);
  const flash = useSharedValue(1);
  const seen = useRef(row.mine);
  useEffect(() => {
    if (row.mine !== seen.current) {
      runJpop(jpop, JPOP_MS);
      if (row.mine) {
        flash.value = 0;
        flash.value = withTiming(1, { duration: motion.revealDur, easing: ease });
      }
    }
    seen.current = row.mine;
  }, [row.mine, flash, jpop]);
  const jpopStyle = useAnimatedStyle(() => ({ transform: [{ scale: jpop.value }] }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value < 1 ? Math.min(1, flash.value * 6) * (1 - flash.value) : 0,
    transform: [{ translateY: -flash.value * 22 }],
  }));

  return (
    <Animated.View style={[enter, jpopStyle, resting && styles.resting]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: row.mine, disabled: resting }}
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
      >
        <Animated.View style={[styles.chip, row.mine && styles.chipMine, press.style]}>
          {row.mine ? <Text style={[styles.chipTick, styles.chipTextMine]}>✓</Text> : null}
          <Text style={[styles.chipText, row.mine && styles.chipTextMine]}>{label}</Text>
        </Animated.View>
      </Pressable>
      <Animated.Text style={[styles.flash, flashStyle]} pointerEvents="none">
        {k.plusOne}
      </Animated.Text>
    </Animated.View>
  );
}

function Pending({ label }: { label: string }) {
  const k = useCopy().traits;
  const enter = useStgIn(400, 0);
  return (
    <Animated.View style={[styles.pending, enter]}>
      <View style={styles.pendingText}>
        <Text style={styles.chipText}>{label}</Text>
        <Text style={styles.pendingNote}>{k.pendingNote}</Text>
      </View>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{k.pending}</Text>
      </View>
    </Animated.View>
  );
}

/** «+ Πρόσθεσε κάτι δικό σου»: a dashed button that opens an input */
function Add({ onSubmit }: { onSubmit: (text: string) => Promise<boolean> }) {
  const k = useCopy().traits;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const press = usePress();
  const send = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await onSubmit(text);
    setBusy(false);
    if (ok) {
      setText('');
      setOpen(false);
    }
  };
  if (!open) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.add, press.style]}>
          <Text style={styles.addText}>{k.add}</Text>
        </Animated.View>
      </Pressable>
    );
  }
  return (
    <View style={styles.form}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={k.placeholder}
        placeholderTextColor={colors.inkSoft}
        maxLength={TRAIT_MAX}
        autoFocus
        returnKeyType="send"
        onSubmitEditing={() => void send()}
        style={styles.input}
      />
      <SubmitButton label={k.submit} busy={busy} ready={text.trim().length >= 3} onPress={() => void send()} />
    </View>
  );
}

function SubmitButton({ label, ready, busy, onPress }: { label: string; ready: boolean; busy: boolean; onPress: () => void }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready || busy }} disabled={!ready || busy} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.submit, { opacity: ready ? 1 : 0.4 }, press.style]}>
        <Text style={styles.submitText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 16, paddingHorizontal: 16, borderRadius: 24, backgroundColor: colors.white, gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  head: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, letterSpacing: 0.78, color: colors.ink },
  voters: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  sub: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, color: colors.ink },
  none: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  said: { gap: 10, paddingTop: 2 },
  saidRow: { gap: 4 },
  saidTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  saidLabel: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  saidN: { fontFamily: fonts.displayHeavy, fontSize: 20, lineHeight: 22, color: colors.ink },
  // others' votes: lime is what happened
  track: { height: 10, borderRadius: 5, backgroundColor: colors.paper, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.lime },
  rule: { height: 1, marginVertical: 8, backgroundColor: colors.fog },
  foldHit: { minHeight: 44, justifyContent: 'center' },
  used: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  usedOn: { color: colors.ink },
  resting: { opacity: 0.4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.fog,
    backgroundColor: colors.paper,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // my vote: ink with ✓
  chipMine: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipTick: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18, color: colors.ink },
  chipText: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  chipTextMine: { color: colors.paper },
  flash: { position: 'absolute', right: 6, top: -8, fontFamily: fonts.displayHeavy, fontSize: 20, lineHeight: 22, paddingBottom: 4, marginBottom: -4, color: colors.ink },
  pending: {
    minHeight: 50,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.fog,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pendingText: { flexShrink: 1, gap: 1 },
  pendingNote: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  pill: { minHeight: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.ink, justifyContent: 'center' },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, color: colors.lime },
  add: { minHeight: 48, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  form: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.fog,
    backgroundColor: colors.paper,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
  },
  submit: { minHeight: 48, paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.blue, justifyContent: 'center' },
  submitText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
});
