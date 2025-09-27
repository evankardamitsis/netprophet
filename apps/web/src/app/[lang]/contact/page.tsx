'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useDictionary } from '@/context/DictionaryContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ContactPage() {
    const params = useParams();
    const lang = params.lang as 'en' | 'el';
    const { dict } = useDictionary();

    const contactInfo = [
        {
            title: lang === 'el' ? 'Email' : 'Email',
            value: 'support@netprophetapp.com',
            link: 'mailto:support@netprophetapp.com'
        },
        {
            title: lang === 'el' ? 'Ζωντανή Συνομιλία' : 'Live Chat',
            value: lang === 'el' ? 'Διαθέσιμο 24/7' : 'Available 24/7',
            link: '#'
        },
        {
            title: lang === 'el' ? 'Ώρες Λειτουργίας' : 'Business Hours',
            value: lang === 'el' ? 'Δευτέρα - Σάββατο, 9:00 - 18:00' : 'Monday - Saturday, 9:00 AM - 6:00 PM',
            link: '#'
        },
        {
            title: lang === 'el' ? 'Τοποθεσία' : 'Location',
            value: lang === 'el' ? 'Αθήνα, Ελλάδα' : 'Athens, Greece',
            link: '#'
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
                    <p className="text-slate-400 text-lg">
                        {lang === 'el'
                            ? 'Θα χαρούμε να ακούσουμε από εσάς'
                            : 'We\'d love to hear from you'
                        }
                    </p>
                </div>

                {/* Contact Information */}
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl font-semibold mb-6">
                            {lang === 'el' ? 'Πληροφορίες επικοινωνίας' : 'Contact Information'}
                        </h2>
                        <div className="space-y-6">
                            {contactInfo.map((info, index) => (
                                <div key={index} className="text-center">
                                    <h3 className="font-semibold text-lg mb-2">{info.title}</h3>
                                    <a
                                        href={info.link}
                                        className="text-slate-400 hover:text-blue-400 transition-colors"
                                    >
                                        {info.value}
                                    </a>
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
                                className="block text-center bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-blue-300 hover:text-blue-200 transition-all duration-200 border border-white/20"
                            >
                                → {lang === 'el' ? 'Συχνές ερωτήσεις' : 'Frequently Asked Questions'}
                            </a>
                            <a
                                href={`/${lang}/help-center`}
                                className="block text-center bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-blue-300 hover:text-blue-200 transition-all duration-200 border border-white/20"
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
