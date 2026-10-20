import type { Copy } from '@netprophet/copy';
import type { GetQuizResult } from '@netprophet/db';
import { stripView } from './quiz';
import { fmt } from './votes';

export type DailyFold = {
  /** false: nothing for today, the row is not drawn */
  show: boolean;
  /** what still waits on the player: the game not finished, plus every match to confirm */
  count: number;
  /** the closed row's second line */
  preview: string;
  /** the closed row's action (founder, 20 Oct: say what to do, or they skip it): «Παίξε» while the game waits, else «Δες» */
  action: string;
};

/**
 * «Για σένα» (founder, 13 Oct): the daily reminders sit folded above the feed. The game of the day counts until it is
 * played; every match someone logged with you counts until you answer it. Once nothing waits, the row goes
 * (founder, 18 Oct: "if its done it should disappear, dont spam the screen").
 */
export function dailyFold(quiz: GetQuizResult | null, confirmations: number, t: Copy): DailyFold {
  const strip = quiz && quiz.cards.length > 0 ? stripView(quiz, t) : null;
  const quizOpen = strip !== null && !strip.allDone;
  const count = (quizOpen ? 1 : 0) + confirmations;
  const parts: string[] = [];
  if (quizOpen && strip) parts.push(strip.head);
  if (confirmations === 1) parts.push(t.feed.daily.confirmOne);
  else if (confirmations > 1) parts.push(fmt(t.feed.daily.confirmMany, { count: confirmations }));
  return { show: count > 0, count, preview: parts.join(' · '), action: quizOpen ? t.feed.daily.play : t.feed.daily.see };
}
