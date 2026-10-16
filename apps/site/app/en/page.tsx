import type { Metadata } from 'next';
import { en } from '../../src/content';
import { Home } from '../../src/Home';

export const metadata: Metadata = { title: en.meta.title, description: en.meta.description, alternates: { languages: { el: '/' } } };

export default function Page() {
  return <Home lang="en" />;
}
