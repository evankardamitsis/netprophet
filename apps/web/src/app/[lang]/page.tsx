import { getDictionary } from '../../lib/dictionaries';
import HomePageClient from './HomePageClient';

export default async function HomePage({
    params,
}: {
    params: Promise<{ lang: 'en' | 'el' }>;
}) {
    const { lang } = await params;
    console.log('🔍 Loading dictionary for lang:', lang);

    const dict = getDictionary(lang);

    return <HomePageClient dict={dict} lang={lang} />;
} 