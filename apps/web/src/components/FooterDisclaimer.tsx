import React from 'react';

interface FooterDisclaimerProps {
    lang?: 'en' | 'el';
}

export function FooterDisclaimer({ lang = 'en' }: FooterDisclaimerProps) {
    const translations = {
        en: {
            disclaimer: 'NetProphet is a points-only prediction game. No real-money betting. No real-money rewards.',
            copyright: '© 2025 NetProphet. All rights reserved.',
        },
        el: {
            disclaimer: 'Το NetProphet είναι παιχνίδι προβλέψεων μόνο με ψηφιακά νομίσματα. Δεν υπάρχει στοίχημα με πραγματικά χρήματα.',
            copyright: '© 2025 NetProphet. Με επιφύλαξη παντός δικαιώματος.',
        }
    };

    const t = translations[lang];

    return (
        <footer className="bottom-0 left-0 right-0 bg-gray-900 text-white py-6 px-6 z-30">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">
                            {t.disclaimer}
                        </span>
                    </div>

                    <div className="text-xs text-gray-400">
                        {t.copyright}
                    </div>
                </div>
            </div>
        </footer>
    );
} 