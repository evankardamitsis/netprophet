import { ReactNode } from 'react';
import { TawkToChatProvider } from '@/context/TawkToChatContext';

interface ContactLayoutProps {
    children: ReactNode;
}

export default function ContactLayout({ children }: ContactLayoutProps) {
    return (
        <TawkToChatProvider>
            {children}
        </TawkToChatProvider>
    );
}
