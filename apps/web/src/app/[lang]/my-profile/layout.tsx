import ClientLayout from "@/app/ClientLayout";
import { getDictionary } from "../../../lib/dictionaries";

interface MyProfileLayoutProps {
    children: React.ReactNode;
    params: Promise<{ lang: 'en' | 'el' }>;
}

export default async function MyProfileLayout({ children, params }: MyProfileLayoutProps) {
    const { lang } = await params;
    const dict = getDictionary(lang);

    return <ClientLayout dict={dict} lang={lang}>{children}</ClientLayout>;
}
