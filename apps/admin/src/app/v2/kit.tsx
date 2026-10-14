'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * The v2 admin kit (founder, 14 Oct: "nice cards, tables, paginations, good layout"): the pieces every desk is built
 * from, styled in v2.css on the app's tokens. One blue action per screen (Button primary), lime only for what
 * happened (Badge done).
 */

export function PageHeader({ title, intent, actions }: { title: string; intent?: string; actions?: ReactNode }) {
  return (
    <header className="v2-head">
      <div>
        <h1 className="v2-title">{title}</h1>
        {intent ? <p className="v2-intent">{intent}</p> : null}
      </div>
      {actions ? <div className="v2-row">{actions}</div> : null}
    </header>
  );
}

export function Section({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="v2-section">
      <div className="v2-section-head">
        <h2 className="v2-h2">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, tone, tight }: { children: ReactNode; tone?: 'attention' | 'ink'; tight?: boolean }) {
  return <div className={['v2-card', tone, tight ? 'tight' : ''].filter(Boolean).join(' ')}>{children}</div>;
}

export function Stats({ items }: { items: { label: string; value: ReactNode; ink?: boolean }[] }) {
  return (
    <div className="v2-stats">
      {items.map((s) => (
        <div key={s.label} className={`v2-stat${s.ink ? ' ink' : ''}`}>
          <b>{s.value}</b>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

type ButtonProps = { children: ReactNode; onClick?: () => void; disabled?: boolean; small?: boolean; type?: 'button' | 'submit' };
const button = (variant: string) =>
  function KitButton({ children, onClick, disabled, small, type = 'button' }: ButtonProps) {
    return (
      <button type={type} className={`v2-btn ${variant}${small ? ' small' : ''}`} onClick={onClick} disabled={disabled}>
        {children}
      </button>
    );
  };
/** the one blue action on a screen */
export const Primary = button('primary');
export const Secondary = button('secondary');
export const Ghost = button('ghost');

export type BadgeTone = 'neutral' | 'ink' | 'done' | 'attention';
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`v2-badge ${tone}`}>{children}</span>;
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="v2-tabs" role="tablist">
      {items.map((i) => (
        <button key={i.value} role="tab" aria-selected={i.value === value} className="v2-tab" onClick={() => onChange(i.value)}>
          {i.label}
          {i.count ? <span className="v2-badge neutral">{i.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="v2-empty">
      <b>{title}</b>
      {children ? <span>{children}</span> : null}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <input className="v2-input v2-search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  num?: boolean;
  width?: number | string;
}

/** pages of a list: `const p = usePages(rows, 25)`; resets to the first page when the list changes length */
export function usePages<T>(rows: T[], size = 25) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  useEffect(() => {
    if (page > pages - 1) setPage(0);
  }, [page, pages]);
  const slice = useMemo(() => rows.slice(page * size, page * size + size), [rows, page, size]);
  return { page, pages, setPage, slice, from: rows.length ? page * size + 1 : 0, to: Math.min(rows.length, page * size + size), total: rows.length };
}

export function Pager({ p, noun }: { p: ReturnType<typeof usePages<unknown>>; noun: string }) {
  if (p.total === 0) return null;
  return (
    <div className="v2-pager">
      <span>
        {p.from} to {p.to} of {p.total} {noun}
      </span>
      {p.pages > 1 ? (
        <span className="v2-row">
          <button className="v2-btn secondary small" disabled={p.page === 0} onClick={() => p.setPage(p.page - 1)} aria-label="Previous page">
            ‹
          </button>
          <span>
            Page {p.page + 1} of {p.pages}
          </span>
          <button className="v2-btn secondary small" disabled={p.page >= p.pages - 1} onClick={() => p.setPage(p.page + 1)} aria-label="Next page">
            ›
          </button>
        </span>
      ) : null}
    </div>
  );
}

/** a table with its pager; `empty` shows when there are no rows */
export function Table<T>({ rows, columns, rowKey, pageSize = 25, noun = 'rows', empty }: { rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; pageSize?: number; noun?: string; empty?: ReactNode }) {
  const p = usePages(rows, pageSize);
  return (
    <div className="v2-table-wrap">
      {rows.length === 0 ? (
        empty ?? <Empty title="Nothing here yet" />
      ) : (
        <>
          <div className="v2-table-scroll">
            <table className="v2-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className={c.num ? 'num' : undefined} style={c.width ? { width: c.width } : undefined}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.slice.map((r) => (
                  <tr key={rowKey(r)}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.num ? 'num' : undefined}>
                        {c.render(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager p={p as ReturnType<typeof usePages<unknown>>} noun={noun} />
        </>
      )}
    </div>
  );
}
