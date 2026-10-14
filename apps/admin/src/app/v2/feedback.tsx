'use client';
import { useCallback, useState, type CSSProperties, type ReactNode } from 'react';
import { colors } from './ui';

/**
 * Feedback every v2 admin page uses the same way: a banner while something works (moving bar), when it is done
 * (lime, with what changed) or when there is a problem (bordered, with the fix in plain words), and a short toast
 * after a save, skip or change.
 */

const CUE_CSS = `
@keyframes npSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
@keyframes npIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
`;

export type Tone = 'working' | 'done' | 'problem';

export function Banner({ tone, title, detail }: { tone: Tone; title: string; detail?: ReactNode }) {
  const base: CSSProperties = { borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4, animation: 'npIn .25s ease-out', position: 'relative', overflow: 'hidden' };
  const look: Record<Tone, CSSProperties> = {
    working: { background: colors.ink, color: colors.paper },
    done: { background: colors.lime, color: colors.ink },
    problem: { background: colors.white, color: colors.ink, border: `2px solid ${colors.ink}`, borderLeft: `8px solid ${colors.ink}` },
  };
  return (
    <div role={tone === 'problem' ? 'alert' : 'status'} style={{ ...base, ...look[tone] }}>
      <style>{CUE_CSS}</style>
      <span style={{ fontWeight: 800, fontSize: 15 }}>
        {tone === 'done' ? '✓ ' : tone === 'problem' ? '! ' : ''}
        {title}
      </span>
      {detail ? <span style={{ fontSize: 14, fontWeight: 600 }}>{detail}</span> : null}
      {tone === 'working' ? (
        <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: colors.inkRaised }}>
          <span style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', background: colors.lime, animation: 'npSlide 1.1s ease-in-out infinite' }} />
        </span>
      ) : null}
    </div>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div role="status" style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', background: colors.ink, color: colors.paper, padding: '12px 18px', borderRadius: 999, fontWeight: 700, fontSize: 15, boxShadow: '0 6px 24px rgba(0,0,0,.18)', zIndex: 50, animation: 'npIn .2s ease-out' }}>
      <style>{CUE_CSS}</style>
      {text}
    </div>
  );
}



/** a toast that hides itself: `const { toast, notify } = useToast()` and `<Toast text={toast} />` */
export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const notify = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 2800);
  }, []);
  return { toast, notify };
}
