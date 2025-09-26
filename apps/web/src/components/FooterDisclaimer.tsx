import React from 'react';
import { useRouter } from 'next/navigation';

interface FooterDisclaimerProps {
    lang?: 'en' | 'el';
}

export function FooterDisclaimer({ lang = 'en' }: FooterDisclaimerProps) {
    const router = useRouter();

    const translations = {
        en: {
            disclaimer: 'NetProphet is a points-only prediction game. No real-money betting. No real-money rewards.',
            privacy: 'Privacy Policy',
            terms: 'Terms of Service',
        },
        el: {
            disclaimer: 'Το NetProphet είναι παιχνίδι προβλέψεων μόνο με ψηφιακά νομίσματα. Δεν υπάρχει στοίχημα με πραγματικά χρήματα.',
            privacy: 'Πολιτική Απορρήτου',
            terms: 'Όροι Χρήσης'
        }
    };

    const t = translations[lang];

    return (
        <footer className="bottom-0 left-0 right-0 bg-gray-900 text-white py-6 px-6 z-30">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs">
                            {t.disclaimer}
                        </span>
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-gray-400">
                        <button
                            onClick={() => router.push(`/${lang}/privacy`)}
                            className="hover:text-white transition-colors"
                        >
                            {t.privacy}
                        </button>
                        <button
                            onClick={() => router.push(`/${lang}/terms`)}
                            className="hover:text-white transition-colors"
                        >
                            {t.terms}
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
} 