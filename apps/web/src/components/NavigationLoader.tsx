'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function NavigationLoader() {
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Instant feedback - show immediately
        setIsLoading(true);

        // Hide immediately on next tick
        requestAnimationFrame(() => setIsLoading(false));
    }, [pathname]);

    if (!isLoading) return null;

    return (
        <div className="fixed top-0 left-0 right-0 h-1 z-[9999] pointer-events-none">
            <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-pulse" />
        </div>
    );
}