import type { Metadata } from 'next';
import { DocPage } from '../../../src/DocPage';
import { deleteAccount } from '../../../src/legal';

export const metadata: Metadata = { title: `${deleteAccount.en.title} · NetProphet` };

export default function Page() {
  return <DocPage lang="en" doc={deleteAccount.en} />;
}
