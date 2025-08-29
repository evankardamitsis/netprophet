import ClientLayout from "@/app/ClientLayout";
import { getDictionary } from "../../../lib/dictionaries";

interface LeaderboardLayoutProps {
    children: React.ReactNode;
    params: Promise<{ lang: 'en' | 'el' }>;
}

export default async function LeaderboardLayout({ children, params }: LeaderboardLayoutProps) {
    const { lang } = await params;
    const dict = getDictionary(lang);

    return <ClientLayout dict={dict} lang={lang}>{children}</ClientLayout>;
}
