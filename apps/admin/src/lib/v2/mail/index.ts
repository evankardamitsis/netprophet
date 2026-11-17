/**
 * The registry of player email templates: every kind the database can queue (core.email_kinds) has one renderer
 * here. A slice adds its kinds by exporting a map from its own file and spreading it below; nothing else changes.
 */
import type { DueEmail, Mail } from './core';
import { LIFECYCLE_EMAILS } from './lifecycle';
import { PRO_EMAILS } from './pro';
import { LIST_RENDER } from './list';

export type { DueEmail, Mail } from './core';

const RENDER: Record<string, (e: DueEmail) => Mail | null> = {
  ...LIFECYCLE_EMAILS,
  ...PRO_EMAILS,
  ...LIST_RENDER,
};

/** the kinds this build can render */
export const KNOWN_KINDS = Object.keys(RENDER);

/**
 * The email for a due row, or null when this build cannot render it (an unknown kind, or a row missing what its
 * kind needs). The route reports a null as failed, so it is tried again and never lost silently.
 */
export function renderDue(e: DueEmail): Mail | null {
  const r = RENDER[e.kind];
  return r ? r(e) : null;
}
