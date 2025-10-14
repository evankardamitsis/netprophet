import ClientLayout from "@/app/ClientLayout";
import { getDictionary } from "../../../lib/dictionaries";
import { TawkToChatWrapper } from "@/components/TawkToChatWrapper";

interface AppLayoutProps {
    children: React.ReactNode;
    params: Promise<{ lang: 'en' | 'el' }>;
}

export default async function AppLayout({ children, params }: AppLayoutProps) {
    const { lang } = await params;
    const dict = getDictionary(lang);

    return (
        <TawkToChatWrapper>
            <ClientLayout dict={dict} lang={lang}>{children}</ClientLayout>
        </TawkToChatWrapper>
    );
}

