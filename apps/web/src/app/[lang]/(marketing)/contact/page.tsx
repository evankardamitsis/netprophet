'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useDictionary } from '@/context/DictionaryContext';
import { useTawkToChat } from '@/context/TawkToChatContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { buttons } from '@/styles/design-system';

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

export default function ContactPage() {
    const params = useParams();
    const lang = params.lang as 'en' | 'el';
    const { dict } = useDictionary();
    const { showChat } = useTawkToChat();

    const handleLiveChatClick = (e: React.MouseEvent) => {
        e.preventDefault();
        showChat();
    };

    const contactInfo = [
        {
            title: lang === 'el' ? 'Email' : 'Email',
            value: 'support@netprophetapp.com',
            link: 'mailto:support@netprophetapp.com'
        },
        {
            title: lang === 'el' ? 'Ζωντανή Συνομιλία' : 'Live Chat',
            value: lang === 'el' ? 'Διαθέσιμο 24/7' : 'Available 24/7',
            link: '#',
            onClick: handleLiveChatClick,
            buttonText: lang === 'el' ? 'Ξεκίνα Συνομιλία' : 'Start Conversation'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <Header lang={lang} />
            <div className="max-w-6xl mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">
                        {lang === 'el' ? 'Επικοινωνία' : 'Contact Us'}
                    </h1>
                </div>

                {/* Contact Information */}
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="space-y-6">
                            {contactInfo.map((info, index) => (
                                <div key={index} className="text-center">
                                    <h3 className="font-semibold text-lg mb-2">{info.title}</h3>
                                    <p className="text-slate-400 mb-4">{info.value}</p>
                                    {info.onClick ? (
                                        <button
                                            onClick={info.onClick}
                                            style={{ backgroundColor: buttons.primary.bg, color: buttons.primary.color }}
                                            className={`px-6 py-3 rounded-lg font-bold ${buttons.primary.className} shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}
                                        >
                                            {info.buttonText}
                                        </button>
                                    ) : (
                                        <a
                                            href={info.link}
                                            className="text-slate-400 hover:text-blue-400 transition-colors"
                                        >
                                            {info.value}
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-8 border border-blue-500/30 shadow-lg">
                        <h3 className="text-2xl font-semibold mb-6 text-center">
                            {lang === 'el' ? 'Γρήγορη βοήθεια' : 'Quick Help'}
                        </h3>
                        <div className="space-y-4">
                            <a
                                href={`/${lang}/faq`}
                                style={{ backgroundColor: buttons.secondary.bg, color: buttons.secondary.color }}
                                className={`block text-center ${buttons.secondary.className} backdrop-blur-sm p-4`}
                            >
                                → {lang === 'el' ? 'Συχνές ερωτήσεις' : 'Frequently Asked Questions'}
                            </a>
                            <a
                                href={`/${lang}/help-center`}
                                style={{ backgroundColor: buttons.secondary.bg, color: buttons.secondary.color }}
                                className={`block text-center ${buttons.secondary.className} backdrop-blur-sm p-4`}
                            >
                                → {lang === 'el' ? 'Κέντρο βοήθειας' : 'Help Center'}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <Footer lang={lang} dict={dict} />
        </div>
    );
}
