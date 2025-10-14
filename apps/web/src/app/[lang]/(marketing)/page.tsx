import { getDictionary } from '../../../lib/dictionaries';
import HomePageClientGame from './HomePageClientGame';

export default async function HomePage({
    params,
}: {
    params: Promise<{ lang: 'en' | 'el' }>;
}) {
    const { lang } = await params;
    console.log('🔍 Loading dictionary for lang:', lang);

    const dict = getDictionary(lang);

    return <HomePageClientGame dict={dict} lang={lang} />;
}

