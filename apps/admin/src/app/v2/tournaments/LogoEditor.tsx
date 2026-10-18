'use client';
import { useRef, useState, useTransition } from 'react';
import { greekCaps } from '@netprophet/copy';
import { V2_URL } from '@/lib/v2/env';
import { LOGO_ACCEPT, logoProblem, logoUrl, type LogoKind } from '@/lib/v2/logos';
import { Ghost, Secondary } from '../kit';
import { removeLogo, uploadLogo } from '../sources/actions';

/** the name's first letter, as the app shows it when there is no logo */
const letterOf = (name: string) => greekCaps(name.match(/[\p{L}\p{N}]/u)?.[0] ?? '');

/** the round logo as players see it, or the letter in its place */
export function LogoMark({ name, path, size = 36 }: { name: string; path?: string | null; size?: number }) {
  const url = logoUrl(V2_URL, path);
  return (
    <span className="v2-logo" style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- a tiny public image from Supabase storage */}
      {url ? <img src={url} alt="" width={size} height={size} /> : letterOf(name)}
    </span>
  );
}

/**
 * Upload, replace or remove the logo of a tournament or club (founder, 18 Oct 2026). Square, PNG, JPG or WebP, up to
 * 512 KB. The image shows at once in the preview while it uploads; the button spins until it is saved.
 */
export function LogoEditor({
  kind,
  id,
  name,
  path,
  onChanged,
  notify,
  compact = false,
}: {
  kind: LogoKind;
  id: string;
  name: string;
  path?: string | null;
  onChanged: () => Promise<void>;
  notify: (text: string) => void;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [, start] = useTransition();
  const size = compact ? 28 : 40;

  const pick = (file: File | undefined) => {
    if (!file) return;
    const p = logoProblem(file);
    if (p) {
      setProblem(p);
      return;
    }
    const local = URL.createObjectURL(file);
    setProblem(null);
    setPreview(local);
    start(async () => {
      setBusy('upload');
      try {
        const form = new FormData();
        form.set('kind', kind);
        form.set('id', id);
        form.set('file', file);
        const r = await uploadLogo(form);
        if (!r.ok) setProblem(r.message);
        else {
          notify(`${name}: logo saved`);
          await onChanged();
        }
      } finally {
        setBusy(null);
        setPreview(null);
        URL.revokeObjectURL(local);
        if (input.current) input.current.value = '';
      }
    });
  };

  const remove = () =>
    start(async () => {
      setBusy('remove');
      try {
        const r = await removeLogo(kind, id);
        if (!r.ok) setProblem(r.message);
        else {
          setProblem(null);
          notify(`${name}: logo removed`);
          await onChanged();
        }
      } finally {
        setBusy(null);
      }
    });

  return (
    <div className="v2-stack" style={{ gap: 4 }}>
      <div className="v2-row" style={{ gap: 8, flexWrap: 'nowrap' }}>
        {preview ? (
          <span className="v2-logo working" style={{ width: size, height: size }} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element -- the local file, before it is uploaded */}
            <img src={preview} alt="" width={size} height={size} />
          </span>
        ) : (
          <LogoMark name={name} path={path} size={size} />
        )}
        <input ref={input} type="file" accept={LOGO_ACCEPT} hidden onChange={(e) => pick(e.target.files?.[0])} aria-label={`Logo for ${name}`} />
        <Secondary small busy={busy === 'upload'} disabled={busy !== null} onClick={() => input.current?.click()}>
          {busy === 'upload' ? 'Uploading…' : path ? 'Replace logo' : 'Add logo'}
        </Secondary>
        {path ? (
          <Ghost disabled={busy !== null} onClick={remove}>
            {busy === 'remove' ? 'Removing…' : 'Remove'}
          </Ghost>
        ) : null}
      </div>
      {problem ? (
        <span style={{ fontWeight: 700, fontSize: 13 }} role="alert">
          ! {problem}
        </span>
      ) : !compact && !path ? (
        <span className="v2-muted" style={{ fontSize: 13 }}>
          Square, PNG, JPG or WebP, up to 512 KB. Players see it round, next to the name.
        </span>
      ) : null}
    </div>
  );
}
