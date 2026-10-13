import Link from 'next/link';

/** the v2 admin's desks */
type Desk = 'tournaments' | 'results' | 'import' | 'sources' | 'moderation' | 'players' | 'quiz' | 'game' | 'names';

export function Nav({ here }: { here: Desk }) {
  const item = (key: Desk, label: string) => (
    <Link href={`/v2/${key}`} style={{ color: 'inherit', fontWeight: here === key ? 800 : 500, textDecoration: here === key ? 'underline' : 'none' }}>
      {label}
    </Link>
  );
  return (
    <span style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      <strong>NetProphet v2</strong>
      {item('tournaments', 'Tournaments')}
      {item('results', 'Results')}
      {item('moderation', 'Moderation')}
      {item('players', 'Players')}
      {item('names', 'Names')}
      {item('quiz', 'Quiz')}
      {item('game', 'Game')}
    </span>
  );
}
