import ClientLayout from "@/app/ClientLayout";
import { getDictionary } from "../../../lib/dictionaries";

interface MyPicksLayoutProps {
    children: React.ReactNode;
    params: Promise<{ lang: 'en' | 'el' }>;
}

export default async function MyPicksLayout({ children, params }: MyPicksLayoutProps) {
    const { lang } = await params;
    const dict = getDictionary(lang);

    return <ClientLayout dict={dict} lang={lang}>{children}</ClientLayout>;
}
