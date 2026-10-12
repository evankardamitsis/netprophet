import Link from 'next/link';

/** the v2 admin's two desks */
export function Nav({ here }: { here: 'results' | 'import' }) {
  const item = (key: 'results' | 'import', label: string) => (
    <Link href={`/v2/${key}`} style={{ color: 'inherit', fontWeight: here === key ? 800 : 500, textDecoration: here === key ? 'underline' : 'none' }}>
      {label}
    </Link>
  );
  return (
    <span style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      <strong>NetProphet v2</strong>
      {item('results', 'Results')}
      {item('import', 'Import')}
    </span>
  );
}
