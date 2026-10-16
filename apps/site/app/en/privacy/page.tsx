import type { Metadata } from 'next';
import { DocPage } from '../../../src/DocPage';
import { privacy } from '../../../src/legal';

export const metadata: Metadata = { title: `${privacy.en.title} · NetProphet` };

export default function Page() {
  return <DocPage lang="en" doc={privacy.en} />;
}
