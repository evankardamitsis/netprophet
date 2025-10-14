'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function PageTransitionLoader() {
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 100);
        return () => clearTimeout(timer);
    }, [pathname]);

    if (!isLoading) return null;

    return (
        <div className="fixed top-0 left-0 right-0 h-1 z-[100] pointer-events-none">
            <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-pulse"
                style={{ width: '100%' }} />
        </div>
    );
}

