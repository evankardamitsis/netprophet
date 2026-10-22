import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { greekCaps } from '@netprophet/copy';
import type { TraitRow } from '@netprophet/db';
import { useCopy } from '../i18n';
import type { TraitsState } from '../lib/data';
import { runJpop, usePopIn, usePress, useStgIn } from '../lib/motion';
import { TRAIT_MAX, hasVoted, shownTraits, splitTraits, traitGender, traitLabel, type TraitErrorKind } from '../lib/traits';
import { colors, ease, fonts, motion } from '../theme';

/** a tap: the chip jpops and a «+1» floats up */
const JPOP_MS = 400;

/**
 * «Πώς παίζει» on a player's profile. Founder, 22 Oct 2026: everyone signed in votes (it was only people who had
 * played them, so most people saw six rows of 0 they could not tap). The phrases are chips: tap one to give it your
 * vote (✓ and a «+1»), tap again to take it back. A count shows only once someone voted; the most voted come first.
 * Add your own, see yours waiting for review. Not on your own profile.
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
  const { pending } = splitTraits(traits.traits);
  const shown = shownTraits(traits);
  if (shown.length === 0 && pending.length === 0) return null;
  const gender = traitGender(traits.gender, first);
  const say = (kind: TraitErrorKind) =>
    onToast(
      kind === 'bad_label'
        ? k.badLabel
        : kind === 'too_many_pending'
          ? k.tooMany
          : kind === 'rate_limited'
            ? k.rateLimited
            : kind === 'not_allowed'
              ? k.notAllowed
              : k.failed,
    );
  const tap = async (id: string) => {
    const kind = await vote(id);
    if (kind) say(kind);
  };
  return (
    <Animated.View style={[styles.card, enter]}>
      <Text style={styles.head}>{greekCaps(k.title)}</Text>
      {traits.can_vote ? <Text style={styles.voteNote}>{hasVoted(traits) ? k.countedNote : k.tapNote}</Text> : null}
      <View style={styles.chips}>
        {shown.map((row, i) => (
          <Chip key={row.id} row={row} label={traitLabel(row, gender)} index={i} canVote={traits.can_vote} onPress={() => void tap(row.id)} />
        ))}
      </View>
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
      <Text style={styles.note}>{k.footer}</Text>
    </Animated.View>
  );
}

function Chip({ row, label, index, canVote, onPress }: { row: TraitRow; label: string; index: number; canVote: boolean; onPress: () => void }) {
  const k = useCopy().traits;
  const enter = usePopIn(motion.revealDurShort, 300 + Math.min(index, 8) * motion.stagger);
  const press = usePress();
  const n = row.count ?? 0;

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

  const body = (
    <Animated.View style={[styles.chip, n > 0 && styles.chipVoted, row.mine && styles.chipMine, canVote ? press.style : null]}>
      {row.mine ? <Text style={styles.chipTick}>✓</Text> : null}
      <Text style={styles.chipText}>{label}</Text>
      {n > 0 ? <Text style={styles.chipN}>{n}</Text> : null}
    </Animated.View>
  );
  return (
    <Animated.View style={[enter, jpopStyle]}>
      {canVote ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: row.mine }}
          accessibilityLabel={n > 0 ? `${label}, ${n}` : label}
          onPress={onPress}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
        >
          {body}
        </Pressable>
      ) : (
        body
      )}
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
  head: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, letterSpacing: 0.78, color: colors.ink },
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
  // someone said it: lime is what happened
  chipVoted: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipMine: { borderColor: colors.ink },
  chipTick: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18, color: colors.ink },
  chipText: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  chipN: { fontFamily: fonts.displayHeavy, fontSize: 20, lineHeight: 22, paddingBottom: 4, marginBottom: -4, color: colors.ink },
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
  voteNote: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.ink },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
});
