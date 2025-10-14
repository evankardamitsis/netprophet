'use client';

import { useEffect } from 'react';

interface TawkToChatProps {
    autoLoad?: boolean;
}

export default function TawkToChat({ autoLoad = true }: TawkToChatProps) {
    useEffect(() => {
        // Only load if autoLoad is true
        if (!autoLoad) return;

        // Check if Tawk.to is already loaded
        if ((window as any).Tawk_API) {
            return;
        }

        // Tawk.to script
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://embed.tawk.to/68ee071307cfa21950e55bf9/1j7gsn95s';
        script.charset = 'UTF-8';
        script.setAttribute('crossorigin', '*');

        // Add script to document
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript.parentNode?.insertBefore(script, firstScript);

        // Cleanup function
        return () => {
            // Remove the script when component unmounts
            const tawkScript = document.querySelector(
                'script[src="https://embed.tawk.to/68ee071307cfa21950e55bf9/1j7gsn95s"]'
            );
            if (tawkScript) {
                tawkScript.remove();
            }
        };
    }, [autoLoad]);

    return null;
}

