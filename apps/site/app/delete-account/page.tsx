import type { Metadata } from 'next';
import { DocPage } from '../../src/DocPage';
import { deleteAccount } from '../../src/legal';

export const metadata: Metadata = { title: `${deleteAccount.el.title} · NetProphet` };

export default function Page() {
  return <DocPage lang="el" doc={deleteAccount.el} />;
}
