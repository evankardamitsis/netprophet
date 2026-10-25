import { useCallback, useEffect, useRef } from 'react';
import { QUEST_BAR_MS } from '../components/QuestBar';
import { TOAST_MS } from '../components/Toast';
import { useCopy } from '../i18n';
import { useBadges, useQuests, type VoteErrorKind } from './data';
import { useHudActions } from './hud';
import { currentMe } from './meStore';
import { mayHaveCelebrated, voteBurst, type GameSnapshot } from './postVote';
import { feedbackAfterVote } from './quests';
import { useToastQueue } from './toastQueue';
import { gateQuests } from './unlockLadder';
import { useUnlocks } from './unlocks';
import { momentsAct, rereadCelebrations } from './useMoments';
import type { CardPct } from './feed';
import type { Side } from './votes';

/**
 * Σήμερα's vote path, shared by the home and «Όλα τα ματς σήμερα» (founder, 25 Oct): one place for what a vote sets
 * going, so a vote from either screen counts the same. `useNotes` is the one-line-at-a-time queue (a failed vote, a
 * finished or moved quest, a report sent); `useVotePath` turns `vote` (the feed's cast_vote) into the handler the rows
 * take: after the vote, one burst a second later reads quests, badges and get_me and says at most one thing.
 */

/** one line at a time over the screen: a toast, or the quest bar over the tab bar (founder, 19 Oct) */
export type Note =
  | { kind: 'toast'; text: string }
  | { kind: 'bar'; bar: { title: string; from: number; to: number; progress: number; target: number } };

/** a vote counts for the pacer once its reveal has played, so no moment covers the split (prototype reveal ~900ms) */
export const VOTE_SETTLE_MS = 1400;

export function useNotes() {
  const t = useCopy();
  const queue = useToastQueue<Note>();
  const pushNote = queue.push;
  const toast = useCallback((text: string) => pushNote({ kind: 'toast', text }, TOAST_MS), [pushNote]);
  const onVoteError = useCallback((kind: VoteErrorKind) => toast(t.feed[kind]), [toast, t]);
  const hud = useHudActions();
  // the bar slides over the tab bar, so the tabs layout draws it (prototype mp); it shows when its turn comes
  const { showQuestBar } = hud;
  const note = queue.active;
  useEffect(() => {
    showQuestBar(note?.item.kind === 'bar' ? note.item.bar : null);
  }, [note, showQuestBar]);
  return { note, pushNote, toast, onVoteError };
}

interface Opts {
  vote: (matchId: string, side: Side) => Promise<CardPct>;
  pushNote: (note: Note, ms: number) => void;
  toast: (text: string) => void;
  /** the vote's reveal has played (VOTE_SETTLE_MS after it): the home opens the door for one moment */
  onSettled?: () => void;
}

export function useVotePath({ vote, pushNote, toast, onSettled }: Opts): (matchId: string, side: Side) => Promise<CardPct> {
  const t = useCopy();
  const unlocks = useUnlocks();
  const unlocksNow = useRef(unlocks);
  unlocksNow.current = unlocks;
  const quests = useQuests();
  const questsNow = useRef(quests.quests);
  questsNow.current = quests.quests;
  const badges = useBadges();
  const badgesNow = useRef(badges.badges);
  badgesNow.current = badges.badges;
  const settled = useRef(onSettled);
  settled.current = onSettled;
  // votes in a row make one burst: a second after the last one, one read of quests, badges and get_me, one note,
  // and the celebration queue only if that read shows a vote could have queued one (postVote.ts)
  const afterVotes = useRef<ReturnType<typeof voteBurst<GameSnapshot>> | null>(null);
  const burstRun = useRef<(before: GameSnapshot) => void>(() => undefined);
  burstRun.current = (before) => {
    const since = Date.now();
    void Promise.all([quests.refresh(), badges.refresh(), unlocksNow.current.refresh({ since })]).then(([after, badgesAfter]) => {
      const me = currentMe();
      const now: GameSnapshot = { quests: after, badges: badgesAfter, unlocks: me?.unlocks ?? null, points: me?.game.total_points ?? null };
      if (mayHaveCelebrated(before, now)) rereadCelebrations();
      // quests and badges that are not open yet say nothing
      const { has } = unlocksNow.current;
      const f = after
        ? feedbackAfterVote(before.quests && gateQuests(before.quests, has), gateQuests(after, has), t, has('badges_shelf') ? { before: before.badges, after: badgesAfter } : undefined)
        : null;
      if (f?.kind === 'toast') toast(f.text);
      else if (f) pushNote({ kind: 'bar', bar: { title: f.title, from: f.from, to: f.to, progress: f.progress, target: f.target } }, QUEST_BAR_MS);
    });
  };
  useEffect(() => {
    const burst = voteBurst<GameSnapshot>((before) => burstRun.current(before));
    afterVotes.current = burst;
    return () => burst.cancel();
  }, []);
  return useCallback(
    async (matchId: string, side: Side) => {
      const me = currentMe();
      const before: GameSnapshot = { quests: questsNow.current, badges: badgesNow.current, unlocks: me?.unlocks ?? null, points: me?.game.total_points ?? null };
      const pct = await vote(matchId, side);
      afterVotes.current?.add(() => before);
      // the first vote of the visit opens the door for one moment; after a calm beat Baller or «Για σένα» may come.
      // The burst above decides whether the celebration queue is read again.
      setTimeout(() => {
        momentsAct({ reread: false });
        settled.current?.();
      }, VOTE_SETTLE_MS);
      return pct;
    },
    [vote],
  );
}
