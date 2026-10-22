import type { Metadata } from 'next';
import { DocPage } from '../../../src/DocPage';
import { terms } from '../../../src/legal';

export const metadata: Metadata = { title: `${terms.en.title} · NetProphet` };

export default function Page() {
  return <DocPage lang="en" doc={terms.en} />;
}
