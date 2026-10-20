'use client';
import { useEffect, useState, useTransition } from 'react';
import { BODY_MAX, TITLE_MAX, checkText, fillText, length, problemFromError, type TextProblem, type Vars } from '@/lib/v2/ntext';
import { Banner, Toast, useToast, type Tone } from '../feedback';
import { Badge, Card, Ghost, PageHeader, Primary, Secondary, Section, SkeletonCards } from '../kit';
import { approveText, loadTexts, saveText, type NotificationText } from './actions';

/**
 * The push texts (founder, 18 Oct 2026: "i need to be able to edit or approve the notification texts, create an easy
 * panel"). One card per text: when it is sent, its title and body, a phone preview with sample values, «Αποθήκευση»
 * and «Έγκριση». A save applies to the next push at once and sends the text back to «Προς έλεγχο».
 */

/** sample values for the preview */
const SAMPLE: Vars = {
  n: 3,
  when: 'Σάβ 24/10, 10:00',
  time: '18:30',
  tournament: 'Κύπελλο Γλυφάδας',
  opponent: 'Παππάς',
  category: 'Μ 40+',
  day: 'Πέμ',
  date: '22/10',
  name: 'Νίκος Παππάς',
  reaction: 'Μπράβο',
};

/** what each {placeholder} becomes, in a few words */
const MEANS: Record<string, string> = {
  n: 'πόσα αποτελέσματα',
  when: 'μέρα και ώρα',
  time: 'ώρα',
  tournament: 'τουρνουά',
  opponent: 'αντίπαλος',
  category: 'κατηγορία',
  day: 'μέρα',
  date: 'ημερομηνία',
  name: 'όνομα παίκτη',
  reaction: 'η αντίδραση',
};

function problemWords(p: TextProblem): string {
  switch (p.code) {
    case 'title_required':
      return 'Ο τίτλος δεν μπορεί να μείνει άδειος.';
    case 'body_required':
      return 'Το κείμενο δεν μπορεί να μείνει άδειο.';
    case 'title_too_long':
      return `Ο τίτλος θέλει έως ${TITLE_MAX} χαρακτήρες.`;
    case 'body_too_long':
      return `Το κείμενο θέλει έως ${BODY_MAX} χαρακτήρες.`;
    case 'em_dash':
      return 'Χωρίς μεγάλη παύλα. Βάλε τελεία, κόμμα ή « · ».';
    case 'stray_brace':
      return 'Μια αγκύλη { } έμεινε μισή. Τα κενά γράφονται έτσι: {tournament}.';
    case 'unknown_placeholder':
      return `Το {${p.name}} δεν υπάρχει σε αυτή την ειδοποίηση. Δες ποια μπορείς να βάλεις από κάτω.`;
  }
}

function errorWords(message: string): string {
  const p = problemFromError(message);
  if (p) return problemWords(p);
  if (message.includes('forbidden')) return 'Δεν έχεις δικαίωμα γι’ αυτό. Την έγκριση τη δίνει μόνο admin.';
  if (message.includes('text_not_found')) return 'Αυτή η ειδοποίηση δεν βρέθηκε. Ανανέωσε τη σελίδα.';
  return `Κάτι δεν πήγε καλά (${message}). Δοκίμασε ξανά.`;
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('el-GR', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

/** the push as it shows on a phone's lock screen */
function PhonePush({ title, body }: { title: string; body: string }) {
  return (
    <div
      aria-label="Προεπισκόπηση"
      style={{ background: 'var(--np-ink)', color: 'var(--np-paper)', borderRadius: 18, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 380 }}
    >
      <div className="v2-row between" style={{ fontSize: 12, color: 'var(--np-mist)', fontWeight: 700 }}>
        <span>NETPROPHET</span>
        <span>τώρα</span>
      </div>
      <b style={{ fontSize: 15 }}>{title || ' '}</b>
      <span style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{body || ' '}</span>
    </div>
  );
}

function Count({ n, max }: { n: number; max: number }) {
  return <span style={{ fontWeight: n > max ? 800 : 600, color: n > max ? 'var(--np-ink)' : 'var(--np-inkSoft)' }}>{`${n}/${max}${n > max ? ' !' : ''}`}</span>;
}

function TextCard({ text, canApprove, onChange, notify }: { text: NotificationText; canApprove: boolean; onChange: (t: NotificationText) => void; notify: (s: string) => void }) {
  const [title, setTitle] = useState(text.title);
  const [body, setBody] = useState(text.body);
  const [notice, setNotice] = useState<{ tone: Tone; title: string; detail?: string } | null>(null);
  const [busy, start] = useTransition();
  const dirty = title.trim() !== text.title || body.trim() !== text.body;
  const problem = dirty ? checkText(title, body, text.placeholders) : null;

  const run = (label: string, action: () => ReturnType<typeof saveText>, done: string) => {
    setNotice({ tone: 'working', title: label });
    start(async () => {
      const r = await action();
      if (r.ok) {
        onChange(r.text);
        setTitle(r.text.title);
        setBody(r.text.body);
        setNotice(null);
        notify(done);
      } else {
        setNotice({ tone: 'problem', title: 'Δεν έγινε', detail: errorWords(r.message) });
      }
    });
  };

  const approved = Boolean(text.approved_at);
  return (
    <Card tone={dirty ? 'attention' : undefined}>
      <div className="v2-row between" style={{ alignItems: 'flex-start' }}>
        <h3 className="v2-h3" style={{ flex: 1, minWidth: 220 }}>
          {text.label}
        </h3>
        <div className="v2-row" style={{ gap: 6 }}>
          {text.pro ? <Badge tone="ink">Pro</Badge> : null}
          {approved ? <Badge tone="done">✓ Εγκρίθηκε</Badge> : <Badge tone="attention">Προς έλεγχο</Badge>}
        </div>
      </div>

      <label className="v2-field">
        <span className="v2-row between">
          Τίτλος <Count n={length(title)} max={TITLE_MAX} />
        </span>
        <input className="v2-input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
      </label>
      <label className="v2-field">
        <span className="v2-row between">
          Κείμενο <Count n={length(body)} max={BODY_MAX} />
        </span>
        <textarea
          className="v2-input"
          style={{ height: 'auto', minHeight: 72, padding: '10px 12px', resize: 'vertical', lineHeight: 1.4 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={busy}
        />
      </label>

      {text.placeholders.length ? (
        <span className="v2-muted">
          Κενά που γεμίζουν μόνα τους: {text.placeholders.map((p) => `{${p}} ${MEANS[p] ?? p}`).join(', ')}.
        </span>
      ) : (
        <span className="v2-muted">Αυτή η ειδοποίηση δεν έχει κενά.</span>
      )}

      <PhonePush title={fillText(title.trim(), SAMPLE)} body={fillText(body.trim(), SAMPLE)} />

      {problem ? <Banner tone="problem" title="Δεν σώζεται ακόμα" detail={problemWords(problem)} /> : null}
      {notice ? <Banner tone={notice.tone} title={notice.title} detail={notice.detail} /> : null}

      <div className="v2-row between">
        <div className="v2-row">
          {dirty ? (
            <Primary busy={busy} disabled={Boolean(problem)} onClick={() => run('Σώζεται…', () => saveText(text.key, title, body), 'Σώθηκε. Η επόμενη ειδοποίηση φεύγει έτσι.')}>
              Αποθήκευση
            </Primary>
          ) : (
            <Secondary disabled>Αποθήκευση</Secondary>
          )}
          {canApprove ? (
            <Secondary busy={busy && !dirty} disabled={dirty || approved || busy} onClick={() => run('Εγκρίνεται…', () => approveText(text.key), 'Εγκρίθηκε ✓')}>
              Έγκριση
            </Secondary>
          ) : null}
          {dirty && !busy ? (
            <Ghost
              onClick={() => {
                setTitle(text.title);
                setBody(text.body);
                setNotice(null);
              }}
            >
              Αναίρεση
            </Ghost>
          ) : null}
        </div>
        <span className="v2-muted" style={{ fontSize: 12 }}>
          {approved
            ? `Εγκρίθηκε${text.approved_by ? ` από ${text.approved_by}` : ''}, ${when(text.approved_at)}`
            : text.updated_by
              ? `Άλλαξε από ${text.updated_by}, ${when(text.updated_at)}`
              : ''}
        </span>
      </div>
    </Card>
  );
}

export function Notifications({ canApprove }: { canApprove: boolean }) {
  const [texts, setTexts] = useState<NotificationText[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast, notify } = useToast();

  useEffect(() => {
    loadTexts()
      .then(setTexts)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'failed'));
  }, []);

  const waiting = texts?.filter((t) => !t.approved_at).length ?? 0;
  const replace = (t: NotificationText) => setTexts((all) => (all ? all.map((x) => (x.key === t.key ? t : x)) : all));

  return (
    <>
      <PageHeader
        title="Ειδοποιήσεις"
        intent="Τι γράφει κάθε ειδοποίηση στο κινητό. Μια αλλαγή φεύγει από την επόμενη ειδοποίηση, χωρίς νέα έκδοση, και γυρνά σε «Προς έλεγχο» μέχρι να την εγκρίνει admin."
      />
      {error ? <Banner tone="problem" title="Δεν φόρτωσαν οι ειδοποιήσεις" detail={errorWords(error)} /> : null}
      {!texts && !error ? <SkeletonCards count={4} /> : null}
      {texts ? (
        <Section
          title="Push"
          aside={<span className="v2-muted">{waiting ? `${waiting} προς έλεγχο` : 'Όλες εγκρίθηκαν ✓'}</span>}
        >
          <p className="v2-muted" style={{ margin: 0 }}>
            Τα κενά σε {'{ }'} γεμίζουν μόνα τους. Αν κάποιο δεν είναι γνωστό (π.χ. ματς χωρίς τουρνουά), φεύγει όλο το κομμάτι του ανάμεσα στα « · ».
          </p>
          {texts.map((t) => (
            <TextCard key={t.key} text={t} canApprove={canApprove} onChange={replace} notify={notify} />
          ))}
        </Section>
      ) : null}
      <Section title="Email">
        <Card tight>
          <div className="v2-row between">
            <h3 className="v2-h3">Ο κωδικός σύνδεσης</h3>
            <Badge>Μόνο ανάγνωση</Badge>
          </div>
          <span className="v2-muted">Θέμα: «Ο κωδικός σου για το NetProphet». Κείμενο: «Ο κωδικός σου:», ο κωδικός, «Ισχύει για μία ώρα. Αν δεν τον ζήτησες εσύ, απλά αγνόησέ το.»</span>
          <span className="v2-muted">
            Αυτό αλλάζει στις ρυθμίσεις του Supabase (Authentication, Email Templates) και στο supabase-v2/templates, όχι εδώ.
          </span>
        </Card>
      </Section>
      <Toast text={toast} />
    </>
  );
}
