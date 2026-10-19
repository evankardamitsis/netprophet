'use client';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { looksLikeEmail, normaliseEmail, type TeamRole } from '@/lib/v2/staffInvite';
import { Banner, Toast, useToast, type Tone } from '../feedback';
import { Badge, Card, PageHeader, Primary, Secondary, Section, SkeletonRows, Table, type Column } from '../kit';
import { changeRole, inviteToTeam, loadTeam, removeFromTeam, type TeamMember } from './actions';

/**
 * The team (founder, 19 Oct 2026): who can use this admin. Admins invite people by email as admin or editor, switch
 * between the two and remove people (they go back to a plain app account). Nobody changes their own role, and the
 * last admin always stays. The database checks all of it again.
 */

type Notice = { tone: Tone; title: string; detail?: string };

const ROLE_WORDS: Record<TeamRole, string> = { admin: 'admin', editor: 'editor' };

function errorWords(message: string): string {
  if (message.includes('cannot_change_self')) return 'You cannot change your own role. Ask another admin.';
  if (message.includes('last_admin')) return 'This is the last admin. Make someone else admin first.';
  if (message.includes('forbidden')) return 'Only an admin can change the team.';
  if (message.includes('profile_not_found')) return 'This account was not found. Refresh the page.';
  if (message.includes('invalid_role')) return 'Pick admin or editor.';
  if (message.includes('bad_email')) return 'Type a full email address.';
  if (message.includes('no_service_key')) return 'This server has no V2_SUPABASE_SECRET_KEY, so nobody can be invited from here yet.';
  if (message.startsWith('created_not_staff')) return `The account was made, but the role was not set (${message.slice(19)}). Invite them again.`;
  if (message.startsWith('create_failed')) return `Could not make an account for this email (${message.slice(15)}).`;
  return `Something went wrong (${message}). Try again.`;
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

function RoleBadge({ role }: { role: TeamMember['role'] }) {
  return role === 'admin' ? <Badge tone="ink">Admin</Badge> : <Badge>Editor</Badge>;
}

/** change role and remove, for one row; one action at a time, removing asks first */
function RowActions({ m, lastAdmin, onDone }: { m: TeamMember; lastAdmin: boolean; onDone: (m: TeamMember, notice: Notice | null, toast?: string) => void }) {
  const [busy, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [working, setWorking] = useState<'role' | 'remove' | null>(null);
  if (m.is_me) return <span className="v2-muted">You</span>;
  const other: TeamRole = m.role === 'admin' ? 'editor' : 'admin';
  const locked = lastAdmin && m.role === 'admin';
  const who = m.name || m.email || 'this person';

  const run = (kind: 'role' | 'remove') => {
    setWorking(kind);
    onDone(m, { tone: 'working', title: kind === 'role' ? `Making ${who} ${ROLE_WORDS[other]}…` : `Removing ${who}…` });
    start(async () => {
      const r = kind === 'role' ? await changeRole(m.user_id, other) : await removeFromTeam(m.user_id);
      setWorking(null);
      setConfirm(false);
      if (r.ok) onDone(r.member, null, kind === 'role' ? `${who} is now ${ROLE_WORDS[other]}` : `${who} is off the team`);
      else onDone(m, { tone: 'problem', title: 'Not changed', detail: errorWords(r.message) });
    });
  };

  if (confirm) {
    return (
      <div className="v2-confirm">
        <b>Remove {who}?</b>
        <span className="v2-muted">They keep their app account but can no longer sign in here.</span>
        <div className="v2-row">
          <Secondary small busy={busy && working === 'remove'} onClick={() => run('remove')}>
            {busy ? 'Removing…' : 'Yes, remove'}
          </Secondary>
          <Secondary small disabled={busy} onClick={() => setConfirm(false)}>
            Cancel
          </Secondary>
        </div>
      </div>
    );
  }
  return (
    <div className="v2-row" style={{ gap: 6 }}>
      <Secondary small busy={busy && working === 'role'} disabled={busy || locked} onClick={() => run('role')}>
        {m.role === 'admin' ? 'Make editor' : 'Make admin'}
      </Secondary>
      <Secondary small disabled={busy || locked} onClick={() => setConfirm(true)}>
        Remove
      </Secondary>
      {locked ? <span className="v2-muted">Last admin</span> : null}
    </div>
  );
}

function Invite({ onAdded }: { onAdded: (m: TeamMember, toast?: string) => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('editor');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, start] = useTransition();
  const clean = normaliseEmail(email);
  const valid = looksLikeEmail(clean);

  const invite = () => {
    setNotice({ tone: 'working', title: `Adding ${clean} as ${ROLE_WORDS[role]}…` });
    start(async () => {
      const r = await inviteToTeam(clean, role);
      if (!r.ok) {
        setNotice({ tone: 'problem', title: 'Not added', detail: errorWords(r.message) });
        return;
      }
      setEmail('');
      onAdded(r.member, r.changed && r.emailed ? 'Added and emailed ✓' : undefined);
      if (!r.changed) {
        setNotice({ tone: 'done', title: `${clean} is already ${ROLE_WORDS[role]}`, detail: 'Nothing changed and no email was sent.' });
        return;
      }
      const detail = [
        r.created ? 'A new account was made for this email.' : 'They already had an account, so it got the role.',
        r.emailed
          ? 'We emailed them the link and how to sign in.'
          : `The email was not sent (${r.emailProblem ?? 'unknown'}). Tell them to sign in at admin.netprophetapp.com/v2/login with a code sent to this email.`,
      ].join(' ');
      setNotice({ tone: r.emailed ? 'done' : 'problem', title: `${clean} is now ${ROLE_WORDS[role]}`, detail });
    });
  };

  return (
    <Card>
      <form
        className="v2-row"
        style={{ alignItems: 'flex-end' }}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !busy) invite();
        }}
      >
        <label className="v2-field" style={{ flex: '1 1 260px' }}>
          Email
          <input className="v2-input" type="email" autoComplete="off" placeholder="name@email.com" value={email} disabled={busy} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="v2-field" style={{ width: 160 }}>
          Role
          <select className="v2-select" value={role} disabled={busy} onChange={(e) => setRole(e.target.value as TeamRole)}>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <Primary type="submit" busy={busy} disabled={!valid}>
          {busy ? 'Inviting…' : 'Invite'}
        </Primary>
      </form>
      <span className="v2-muted">Editors run the desks. Admins can also change this team. They sign in with a 6-digit code sent to this email.</span>
      {notice ? <Banner tone={notice.tone} title={notice.title} detail={notice.detail} /> : null}
    </Card>
  );
}

export function Team() {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const { toast, notify } = useToast();

  useEffect(() => {
    loadTeam()
      .then(setMembers)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'failed'));
  }, []);

  /** put a changed member in place: off the list when no longer staff, added when new */
  const apply = useCallback((m: TeamMember) => {
    setMembers((all) => {
      if (!all) return all;
      const rest = all.filter((x) => x.user_id !== m.user_id);
      if (m.role !== 'admin' && m.role !== 'editor') return rest;
      const next = all.some((x) => x.user_id === m.user_id) ? all.map((x) => (x.user_id === m.user_id ? m : x)) : [...all, m];
      return [...next].sort((a, b) => Number(b.role === 'admin') - Number(a.role === 'admin'));
    });
  }, []);

  const onRow = useCallback(
    (m: TeamMember, n: Notice | null, t?: string) => {
      setNotice(n);
      if (n?.tone !== 'working') apply(m);
      if (t) notify(t);
    },
    [apply, notify],
  );

  const admins = members?.filter((m) => m.role === 'admin').length ?? 0;
  const columns: Column<TeamMember>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (m) => (
        <span className="v2-row" style={{ gap: 6 }}>
          <b>{m.name || 'No name yet'}</b>
          {m.is_me ? <Badge>You</Badge> : null}
        </span>
      ),
    },
    { key: 'email', label: 'Email', render: (m) => m.email ?? '' },
    { key: 'role', label: 'Role', render: (m) => <RoleBadge role={m.role} /> },
    { key: 'seen', label: 'Last sign-in', render: (m) => (m.last_sign_in_at ? when(m.last_sign_in_at) : <span className="v2-muted">Never</span>) },
    {
      key: 'added',
      label: 'Added',
      render: (m) => (m.added_at ? `${when(m.added_at)}${m.added_by ? ` by ${m.added_by}` : ''}` : <span className="v2-muted">Before this page</span>),
    },
    { key: 'actions', label: '', render: (m) => <RowActions m={m} lastAdmin={admins <= 1} onDone={onRow} /> },
  ];

  return (
    <>
      <PageHeader title="Team" intent="Who can use this admin. Invite someone by email, switch them between admin and editor, or remove them." />
      <Section title="Invite">
        <Invite
          onAdded={(m, t) => {
            apply(m);
            if (t) notify(t);
          }}
        />
      </Section>
      <Section title="People" aside={members ? <span className="v2-muted">{`${admins} admin${admins === 1 ? '' : 's'}, ${members.length - admins} editor${members.length - admins === 1 ? '' : 's'}`}</span> : null}>
        {notice ? <Banner tone={notice.tone} title={notice.title} detail={notice.detail} /> : null}
        {loadError ? <Banner tone="problem" title="Could not load the team" detail={errorWords(loadError)} /> : null}
        {!members && !loadError ? <SkeletonRows rows={4} /> : null}
        {members ? <Table rows={members} columns={columns} rowKey={(m) => m.user_id} noun="people" /> : null}
      </Section>
      <Toast text={toast} />
    </>
  );
}
