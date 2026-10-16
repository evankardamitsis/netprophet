import type { Metadata } from 'next';
import { DocPage } from '../../src/DocPage';
import { support } from '../../src/legal';

export const metadata: Metadata = { title: `${support.el.title} · NetProphet` };

export default function Page() {
  return <DocPage lang="el" doc={support.el} />;
}
