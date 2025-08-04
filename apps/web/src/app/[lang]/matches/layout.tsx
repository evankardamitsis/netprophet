import ClientLayout from "@/app/ClientLayout";
import { getDictionary } from "../../../lib/dictionaries";

interface DashboardLayoutProps {
    children: React.ReactNode;
    params: Promise<{ lang: 'en' | 'el' }>;
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
    const { lang } = await params;
    const dict = getDictionary(lang);

    console.log('🔍 DashboardLayout - lang:', lang);
    console.log('📚 DashboardLayout - dict:', dict);
    console.log('📚 DashboardLayout - dict?.matches?.title:', dict?.matches?.title);

    return <ClientLayout dict={dict} lang={lang}>{children}</ClientLayout>;
} 