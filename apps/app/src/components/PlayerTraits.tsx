import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { greekCaps } from '@netprophet/copy';
import type { TraitRow } from '@netprophet/db';
import { useCopy } from '../i18n';
import type { TraitsState } from '../lib/data';
import { usePress, useStgIn } from '../lib/motion';
import { TRAIT_MAX, barWidth, hasVoted, splitTraits, topCount, traitGender, traitLabel, type TraitErrorKind } from '../lib/traits';
import { colors, ease, fonts } from '../theme';

/** prototype: bars grow .7s from a 900ms base, +70ms per row; a tap moves them in .6s; the «+1» floats for .7s */
const GROW_MS = 700;
const MOVE_MS = 600;
const BASE_DELAY = 900;
const STEP = 70;
const FLASH_MS = 700;

/**
 * «Πώς παίζει» on a player's profile (prototype V2): up to six phrases as rows with a lime bar and the count;
 * tap what applies (only if you have played them), add your own, see yours waiting for review. Not on your own profile.
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
  if (!traits || traits.is_me) return null;
  const { shown, pending } = splitTraits(traits.traits);
  if (shown.length === 0 && pending.length === 0) return null;
  const gender = traitGender(traits.gender, first);
  const top = topCount(shown);
  const say = (kind: TraitErrorKind) =>
    onToast(kind === 'bad_label' ? k.badLabel : kind === 'too_many_pending' ? k.tooMany : kind === 'not_played' ? k.notPlayed : k.failed);
  const tap = async (id: string) => {
    const kind = await vote(id);
    if (kind) say(kind);
  };
  return (
    <Animated.View style={[styles.card, enter]}>
      <Text style={styles.head}>{greekCaps(k.title)}</Text>
      {shown.map((row, i) => (
        <Chip key={row.id} row={row} label={traitLabel(row, gender)} top={top} index={i} canVote={traits.can_vote} onPress={() => void tap(row.id)} />
      ))}
      {pending.map((row) => (
        <Pending key={row.id} label={traitLabel(row, gender)} />
      ))}
      {traits.can_vote ? (
        <Add
          onSubmit={async (text) => {
            const kind = await suggest(text);
            if (kind) say(kind);
            else onToast(k.sent);
            return kind === null;
          }}
        />
      ) : null}
      {traits.can_vote ? <Text style={styles.voteNote}>{hasVoted(traits) ? k.countedNote : k.tapNote}</Text> : null}
      <Text style={styles.note}>{k.footer}</Text>
    </Animated.View>
  );
}

function Chip({ row, label, top, index, canVote, onPress }: { row: TraitRow; label: string; top: number; index: number; canVote: boolean; onPress: () => void }) {
  const k = useCopy().traits;
  const press = usePress();
  const n = row.count ?? 0;
  const pct = barWidth(n, top);
  const bar = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      bar.value = withDelay(BASE_DELAY + index * STEP, withTiming(pct, { duration: GROW_MS, easing: ease }));
    } else {
      bar.value = withTiming(pct, { duration: MOVE_MS, easing: ease });
    }
  }, [pct, bar, index]);
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value}%` }));

  const flash = useSharedValue(1);
  const seen = useRef(row.mine);
  useEffect(() => {
    if (row.mine && !seen.current) {
      flash.value = 0;
      flash.value = withTiming(1, { duration: FLASH_MS, easing: ease });
    }
    seen.current = row.mine;
  }, [row.mine, flash]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value < 1 ? Math.min(1, flash.value * 6) * (1 - flash.value) : 0, transform: [{ translateY: -flash.value * 22 }] }));

  const body = (
    <Animated.View style={[styles.chip, { borderColor: row.mine ? colors.ink : 'transparent' }, canVote ? press.style : null]}>
      <Animated.View style={[styles.bar, barStyle]} />
      <Text style={styles.chipText}>{label}</Text>
      <Text style={styles.chipN}>{n}</Text>
      <Animated.Text style={[styles.flash, flashStyle]} pointerEvents="none">
        {k.plusOne}
      </Animated.Text>
    </Animated.View>
  );
  if (!canVote) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: row.mine }} accessibilityLabel={`${label}, ${n}`} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      {body}
    </Pressable>
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
  head: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, letterSpacing: 0.78, color: colors.blue },
  chip: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: colors.paper,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    overflow: 'hidden',
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.lime },
  chipText: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  chipN: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 28, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  flash: { position: 'absolute', right: 40, top: 12, fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 24, paddingBottom: 4, marginBottom: -4, color: colors.ink },
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
  voteNote: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.ink },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
});
