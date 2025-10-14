'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

interface TawkToChatContextType {
    isVisible: boolean;
    showChat: () => void;
    hideChat: () => void;
}

const TawkToChatContext = createContext<TawkToChatContextType | undefined>(undefined);

export function TawkToChatProvider({ children }: { children: React.ReactNode }) {
    const [isVisible, setIsVisible] = useState(false);
    const scriptLoaded = useRef(false);

    const loadTawkScript = useCallback(() => {
        // Check if script is already loaded
        if (scriptLoaded.current || (window as any).Tawk_API) {
            return Promise.resolve();
        }

        // Check if script element already exists
        const existingScript = document.querySelector(
            'script[src="https://embed.tawk.to/68ee071307cfa21950e55bf9/1j7gsn95s"]'
        );
        if (existingScript) {
            scriptLoaded.current = true;
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            // Create and load the Tawk.to script
            const script = document.createElement('script');
            script.async = true;
            script.src = 'https://embed.tawk.to/68ee071307cfa21950e55bf9/1j7gsn95s';
            script.charset = 'UTF-8';
            script.setAttribute('crossorigin', '*');

            // Wait for script to load
            script.onload = () => {
                scriptLoaded.current = true;
                resolve();
            };

            script.onerror = () => {
                console.error('Failed to load Tawk.to script');
                resolve();
            };

            // Add script to document
            const firstScript = document.getElementsByTagName('script')[0];
            firstScript.parentNode?.insertBefore(script, firstScript);
        });
    }, []);

    const showChat = useCallback(async () => {
        setIsVisible(true);

        // Load the script if not already loaded
        await loadTawkScript();

        // Wait a bit for Tawk_API to be available
        const checkAndMaximize = () => {
            if (typeof window !== 'undefined' && (window as any).Tawk_API) {
                // Configure widget position and z-index to avoid overlaps
                (window as any).Tawk_API.setAttributes({
                    'z-index': 1000, // Lower than notification toasts (usually 9999+) and prediction slip
                    'offset': { vertical: 20, horizontal: 20 } // Adjust position from bottom-right
                });
                (window as any).Tawk_API.maximize();
            } else {
                // Retry after a short delay
                setTimeout(checkAndMaximize, 100);
            }
        };

        checkAndMaximize();
    }, [loadTawkScript]);

    const hideChat = useCallback(() => {
        setIsVisible(false);
        // Trigger Tawk.to chat to minimize
        if (typeof window !== 'undefined' && (window as any).Tawk_API) {
            (window as any).Tawk_API.minimize();
        }
    }, []);

    return (
        <TawkToChatContext.Provider value={{ isVisible, showChat, hideChat }}>
            {children}
        </TawkToChatContext.Provider>
    );
}

export function useTawkToChat() {
    const context = useContext(TawkToChatContext);
    if (context === undefined) {
        throw new Error('useTawkToChat must be used within a TawkToChatProvider');
    }
    return context;
}

