'use client';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Banner, Toast, useToast, type Tone } from '../feedback';
import { Badge, Card, PageHeader, Primary, Secondary, Section, SkeletonRows, Table, type Column } from '../kit';
import { importOfferCodes, loadEmailSettings, saveEmailSettings, sendTest, type EmailKindRow, type EmailSettings } from './actions';

/**
 * The player emails (founder, 17 Nov 2026): one switch for all of them (off, allow-list, on), the allow-list of
 * addresses that get them while we test, and each kind with what went out in the last week. «Send me a test» queues
 * one to you; the sender runs every 10 minutes. The database checks everything again.
 */

type Notice = { tone: Tone; title: string; detail?: string };

const MODE_WORDS: Record<EmailSettings['mode'], { title: string; line: string }> = {
  off: { title: 'Off', line: 'Nothing goes out. Emails that come due meanwhile are dropped, not kept.' },
  allowlist: { title: 'Allow-list only', line: 'Only the addresses below get emails. Everyone else’s are dropped, not kept for later.' },
  on: { title: 'On for everyone', line: 'Every player gets the emails they should, unless they turned them off.' },
};
const GROUP_WORDS: Record<EmailKindRow['group'], string> = { account: 'Account', game: 'Game', pro: 'Pro', list: 'Website list' };

function errorWords(m: string): string {
  if (m.includes('forbidden')) return 'Only an admin can change the player emails.';
  if (m.includes('unknown_kind')) return 'This email kind does not exist any more. Refresh the page.';
  if (m.includes('expiry_in_past')) return 'The expiry date must be after today. Use the date the batch has in App Store Connect.';
  return `Something went wrong (${m}). Try again.`;
}

export function Emails() {
  const [s, setS] = useState<EmailSettings | null>(null);
  const [notice, setNotice] = useState<Notice | null>({ tone: 'working', title: 'Loading the emails…' });
  const [list, setList] = useState('');
  const [confirmOn, setConfirmOn] = useState(false);
  const [busy, start] = useTransition();
  const [testing, setTesting] = useState<string | null>(null);
  const [codes, setCodes] = useState('');
  const [codesExpire, setCodesExpire] = useState('');
  const { toast, notify } = useToast();

  const load = useCallback(() => {
    start(async () => {
      const r = await loadEmailSettings();
      if (r.ok) {
        setS(r.value);
        setList(r.value.allowlist.join('\n'));
        setNotice(null);
      } else setNotice({ tone: 'problem', title: 'Could not load the emails', detail: errorWords(r.message) });
    });
  }, []);
  useEffect(load, [load]);

  const save = (patch: Parameters<typeof saveEmailSettings>[0], said: string) => {
    setNotice({ tone: 'working', title: 'Saving…' });
    start(async () => {
      const r = await saveEmailSettings(patch);
      if (r.ok) {
        setS(r.value);
        setList(r.value.allowlist.join('\n'));
        setNotice(null);
        setConfirmOn(false);
        notify(said);
      } else setNotice({ tone: 'problem', title: 'Not saved', detail: errorWords(r.message) });
    });
  };

  const test = (kind: string) => {
    setTesting(kind);
    setNotice({ tone: 'working', title: `Queuing a test of ${kind}…` });
    start(async () => {
      const r = await sendTest(kind);
      setTesting(null);
      if (r.ok) {
        setNotice({ tone: 'done', title: `A test of ${kind} is on its way`, detail: 'It goes out within 10 minutes to your own address (it must be on the allow-list).' });
      } else setNotice({ tone: 'problem', title: 'No test sent', detail: errorWords(r.message) });
    });
  };

  const importCodes = () => {
    const list = codes.split(/[\s,;]+/).filter(Boolean);
    if (!list.length || !codesExpire) {
      setNotice({ tone: 'problem', title: 'Nothing imported', detail: 'Paste the codes and pick the date they expire in App Store Connect.' });
      return;
    }
    setNotice({ tone: 'working', title: `Importing ${list.length} codes…` });
    start(async () => {
      const r = await importOfferCodes(list, codesExpire);
      if (!r.ok) {
        setNotice({ tone: 'problem', title: 'No codes imported', detail: errorWords(r.message) });
        return;
      }
      const v = r.value;
      setCodes('');
      setNotice({
        tone: 'done',
        title: `${v.added} codes imported, ${v.left} free now`,
        detail: [v.already_there ? `${v.already_there} were already there.` : '', v.invalid ? `${v.invalid} lines were not codes and were left out.` : ''].filter(Boolean).join(' ') || undefined,
      });
      const again = await loadEmailSettings();
      if (again.ok) setS(again.value);
    });
  };

  const columns: Column<EmailKindRow>[] = [
    { key: 'label', label: 'Email', render: (k) => (<><b>{k.label}</b><br /><span className="v2-muted">{k.kind}</span></>) },
    { key: 'group', label: 'Kind', render: (k) => <Badge>{GROUP_WORDS[k.group]}</Badge> },
    { key: 'sent', label: 'Sent 7 days', num: true, render: (k) => k.sent_7d },
    { key: 'skipped', label: 'Dropped 7 days', num: true, render: (k) => k.skipped_7d },
    { key: 'failed', label: 'Failed', num: true, render: (k) => (k.failed ? <Badge tone="attention">{k.failed}</Badge> : 0) },
    {
      key: 'on',
      label: 'On',
      render: (k) => {
        const off = s?.kinds_off.includes(k.kind);
        return (
          <Secondary small busy={busy} onClick={() => save({ kinds_off: off ? s!.kinds_off.filter((x) => x !== k.kind) : [...(s?.kinds_off ?? []), k.kind] }, off ? `${k.kind} is on` : `${k.kind} is off`)}>
            {off ? 'Off · turn on' : 'On · turn off'}
          </Secondary>
        );
      },
    },
    { key: 'test', label: '', render: (k) => <Secondary small busy={testing === k.kind} onClick={() => test(k.kind)}>Send me a test</Secondary> },
  ];

  return (
    <>
      <PageHeader title="Player emails" intent="Who gets which email, and a test of each one to your own inbox before anyone else gets it." />
      {notice ? <Banner tone={notice.tone} title={notice.title} detail={notice.detail} /> : null}
      {!s ? (
        <SkeletonRows rows={6} />
      ) : (
        <>
          <Section title="The switch">
            <Card>
              <p style={{ margin: '0 0 6px', fontWeight: 800 }}>Now: {MODE_WORDS[s.mode].title}</p>
              <p className="v2-muted" style={{ margin: '0 0 14px' }}>{MODE_WORDS[s.mode].line}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {s.mode !== 'off' ? <Secondary busy={busy} onClick={() => save({ mode: 'off' }, 'Emails are off')}>Turn off</Secondary> : null}
                {s.mode !== 'allowlist' ? <Secondary busy={busy} onClick={() => save({ mode: 'allowlist' }, 'Allow-list only')}>Allow-list only</Secondary> : null}
                {s.mode !== 'on' ? (
                  confirmOn ? (
                    <>
                      <Primary busy={busy} onClick={() => save({ mode: 'on' }, 'Emails are on for everyone')}>Yes, every player</Primary>
                      <Secondary onClick={() => setConfirmOn(false)}>Not yet</Secondary>
                    </>
                  ) : (
                    <Primary onClick={() => setConfirmOn(true)}>Turn on for everyone…</Primary>
                  )
                ) : null}
              </div>
              {confirmOn ? <p className="v2-muted" style={{ margin: '10px 0 0' }}>Every player who signs up or plays from now on gets their emails. Accounts made before {new Date(s.start_at).toLocaleDateString('en-GB')} never get the welcome.</p> : null}
            </Card>
          </Section>
          <Section title="Allow-list" aside={<span className="v2-muted">One address per line</span>}>
            <Card>
              <textarea value={list} onChange={(e) => setList(e.target.value)} rows={4} style={{ width: '100%', font: 'inherit', padding: 10, borderRadius: 10, border: '1px solid #CFD7C6', boxSizing: 'border-box' }} />
              <div style={{ marginTop: 10 }}>
                <Primary busy={busy} onClick={() => save({ allowlist: list.split(/[\s,;]+/).filter(Boolean) }, 'Allow-list saved')}>Save the allow-list</Primary>
              </div>
            </Card>
          </Section>
          <Section title="The emails">
            <Table rows={s.kinds} columns={columns} rowKey={(k) => k.kind} noun="emails" />
          </Section>
          {s.offer_codes ? (
            <Section title="Winback offer codes" aside={<span className="v2-muted">App Store, 3 months at 4,49€</span>}>
              <Card>
                <p style={{ margin: '0 0 6px', fontWeight: 800 }}>
                  {s.offer_codes.left} codes free · {s.offer_codes.given} given
                  {s.offer_codes.winback_waiting ? <> · <Badge tone="attention">{s.offer_codes.winback_waiting} waiting for a code</Badge></> : null}
                </p>
                <p className="v2-muted" style={{ margin: '0 0 14px' }}>
                  Each Pro winback takes one code when it goes out. With none left it waits, nothing is sent without a code.
                  {s.offer_codes.next_expiry ? ` The next batch expires on ${new Date(s.offer_codes.next_expiry).toLocaleDateString('en-GB')}.` : ''}
                </p>
                <textarea value={codes} onChange={(e) => setCodes(e.target.value)} rows={4} placeholder="One code per line, as App Store Connect gives them" style={{ width: '100%', font: 'inherit', padding: 10, borderRadius: 10, border: '1px solid #CFD7C6', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                  <label className="v2-muted">
                    Expires{' '}
                    <input type="date" value={codesExpire} onChange={(e) => setCodesExpire(e.target.value)} style={{ font: 'inherit', padding: 6, borderRadius: 8, border: '1px solid #CFD7C6' }} />
                  </label>
                  <Secondary busy={busy} onClick={importCodes}>Import the codes</Secondary>
                </div>
              </Card>
            </Section>
          ) : null}
        </>
      )}
      <Toast text={toast} />
    </>
  );
}
