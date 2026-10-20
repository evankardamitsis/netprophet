/**
 * Which delivered pushes go once you have seen your results (founder, 20 Oct: "if I see it, remove the notification").
 * Only «Βγήκαν 2 αποτελέσματα» (data.type 'results'); a claim decision, a reaction, a draw or a reminder stays until
 * you open it. Pure, so it is tested without the notifications module.
 */
export const SEEN_RESULT_TYPES: readonly string[] = ['results'];

export interface PresentedPush {
  request: { identifier: string; content: { data?: unknown } };
}

function typeOf(data: unknown): unknown {
  return data && typeof data === 'object' ? (data as Record<string, unknown>).type : undefined;
}

/** the identifiers of the delivered result pushes, to dismiss */
export function resultPushIds(presented: readonly PresentedPush[]): string[] {
  return presented.filter((n) => SEEN_RESULT_TYPES.includes(typeOf(n.request.content.data) as string)).map((n) => n.request.identifier);
}
