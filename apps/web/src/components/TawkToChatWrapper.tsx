'use client';

import { TawkToChatProvider } from '@/context/TawkToChatContext';
import TawkToChat from '@/components/TawkToChat';

export function TawkToChatWrapper({ children }: { children: React.ReactNode }) {
    return (
        <TawkToChatProvider>
            {children}
            <TawkToChat autoLoad={false} />
        </TawkToChatProvider>
    );
}

