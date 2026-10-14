import { notFound } from 'next/navigation';
import { KitDemo } from './KitDemo';

/** development only: every piece of the admin kit with sample data, to check the look without signing in */
export default function KitPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <KitDemo />;
}
