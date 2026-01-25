'use client';

import { useState, useEffect } from 'react';

interface InfoBarProps {
    message?: string;
    type?: 'info' | 'warning' | 'success' | 'error';
    className?: string;
    lang?: 'en' | 'el';
}

export function InfoBar({
    message,
    type = 'info',
    className = '',
    lang = 'en'
}: InfoBarProps) {
    const [dynamicMessage, setDynamicMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch dynamic content from API
    useEffect(() => {
        const fetchMessage = async () => {
            try {
                const response = await fetch(`/api/dynamic-content?key=info_bar_message&language=${lang}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.content) {
                        setDynamicMessage(data.content.content);
                    }
                }
            } catch (error) {
                console.error('Error fetching dynamic content:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMessage();
    }, [lang]);

    // Use message prop if provided, then dynamic message, then default
    const displayMessage = message || dynamicMessage || (lang === 'el'
        ? 'Καλώς ήρθατε στο NetProphet! 🎾'
        : 'Welcome to NetProphet! 🎾'
    );

    const typeStyles = {
        info: 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white border-yellow-400/50',
        warning: 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 text-white border-yellow-400',
        success: 'bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 text-white border-green-400',
        error: 'bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white border-red-400',
    };

    return (
        <div className={`w-full ${typeStyles[type]} border-b relative z-50 shadow-md ${className}`}>
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-center py-1 md:py-2 text-xs sm:text-sm">
                    <div
                        className="text-center"
                        dangerouslySetInnerHTML={{ __html: displayMessage }}
                    />
                </div>
            </div>
        </div>
    );
}
