import type { CSSProperties } from 'react';
import { colors } from '@netprophet/tokens';

/** Plain styles for the v2 admin pages, from @netprophet/tokens (no prototype exists for admin screens). */
export const ui = {
  page: { minHeight: '100vh', background: colors.paper, color: colors.ink, fontFamily: 'system-ui, -apple-system, sans-serif' },
  bar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    padding: '12px 20px', background: colors.ink, color: colors.paper,
  },
  main: { maxWidth: 880, margin: '0 auto', padding: '20px 16px 64px' },
  h1: { fontSize: 28, fontWeight: 800, margin: '0 0 4px' },
  muted: { color: colors.inkSoft, fontSize: 14 },
  card: { background: colors.white, border: `1px solid ${colors.mist}`, borderRadius: 16, padding: 16 },
  input: {
    height: 44, padding: '0 12px', borderRadius: 12, border: `2px solid ${colors.ink}`, background: colors.white,
    fontSize: 16, fontWeight: 600, color: colors.ink, width: '100%', boxSizing: 'border-box',
  },
  primary: {
    minHeight: 44, padding: '0 18px', borderRadius: 12, border: 0, background: colors.blue, color: colors.white,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
  secondary: {
    minHeight: 44, padding: '0 14px', borderRadius: 12, border: `2px solid ${colors.ink}`, background: 'transparent',
    color: colors.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  link: { background: 'none', border: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', fontSize: 14, fontWeight: 700 },
  error: { color: colors.ink, fontWeight: 700, fontSize: 14 },
} satisfies Record<string, CSSProperties>;

export { colors };
