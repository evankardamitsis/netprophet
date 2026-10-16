import type { Metadata } from 'next';
import { el } from '../src/content';
import { Home } from '../src/Home';

export const metadata: Metadata = { title: el.meta.title, description: el.meta.description, alternates: { languages: { en: '/en' } } };

export default function Page() {
  return <Home lang="el" />;
}
