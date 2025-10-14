'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useDictionary } from '@/context/DictionaryContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { buttons } from '@/styles/design-system';

interface FAQItem {
    question: string;
    answer: string;
}

const faqData: Record<string, FAQItem[]> = {
    en: [
        {
            question: "What is NetProphet?",
            answer: "NetProphet is a tennis prediction platform where you can place predictions on real tennis matches. You earn coins for correct predictions and can climb the leaderboard."
        },
        {
            question: "How do I earn coins?",
            answer: "You earn coins by making correct predictions on tennis matches. The amount of coins you win depends on the odds of your prediction - higher odds mean higher rewards."
        },
        {
            question: "How are the odds calculated?",
            answer: "Our odds are calculated using advanced algorithms that consider player NTRP ratings, recent form, head-to-head records, surface preferences, and other statistical factors."
        },
        {
            question: "Can I withdraw my coins?",
            answer: "No, coins are not withdrawable. They are used solely for in-app purchases and are never transformed into real money."
        },
        {
            question: "What happens if a match is cancelled?",
            answer: "If a match is cancelled before it starts, all predictions for that match are automatically refunded to your account."
        },
        {
            question: "How do I see my prediction history?",
            answer: "You can view your prediction history in your profile dashboard, where you can see all your past predictions and their outcomes."
        },
        {
            question: "What does 'Underdog Alert' mean?",
            answer: "Underdog Alert appears on matches with high odds differences (over 2.5). These matches offer higher potential rewards but are riskier predictions."
        },
        {
            question: "How do I change my profile information?",
            answer: "You can update your profile information by going to your account settings after logging in."
        }
    ],
    el: [
        {
            question: "Τι είναι το NetProphet;",
            answer: "Το NetProphet είναι ένα παιχνίδι προβλέψεων τένις όπου μπορείτε να κάνετε προβλέψεις σε πραγματικούς αγώνες. Κερδίζετε νομίσματα για σωστές προβλέψεις και μπορείτε να ανεβείτε στον πίνακα κατάταξης."
        },
        {
            question: "Πώς κερδίζω νομίσματα;",
            answer: "Κερδίζετε νομίσματα κάνοντας σωστές προβλέψεις σε αγώνες. Το ποσό των νομισμάτων που κερδίζετε εξαρτάται από τις αποδόσεις της πρόβλεψής σας - υψηλότερες αποδόσεις σημαίνουν υψηλότερες ανταμοιβές."
        },
        {
            question: "Πώς υπολογίζονται οι αποδόσεις;",
            answer: "Οι αποδόσεις μας υπολογίζονται χρησιμοποιώντας προηγμένους αλγόριθμους που λαμβάνουν υπόψη τις βαθμολογίες NTRP των παικτών, την πρόσφατη φόρμα, τα ρεκόρ μεταξύ τους, τις προτιμήσεις επιφάνειας και άλλους στατιστικούς παράγοντες."
        },
        {
            question: "Μπορώ να αποσύρω τα νομίσματά μου;",
            answer: "Όχι, τα νομίσματα δεν μπορούν να αποσυρθούν. Χρησιμοποιούνται μόνο για αγορές στην εφαρμογή και δεν μετατρέπονται σε πραγματικά χρήματα."
        },
        {
            question: "Τι συμβαίνει αν ένας αγώνας ακυρωθεί;",
            answer: "Εάν ένας αγώνας ακυρωθεί πριν ξεκινήσει, όλες οι προβλέψεις για αυτόν τον αγώνα επιστρέφονται αυτόματα στον λογαριασμό σας."
        },
        {
            question: "Πώς βλέπω το ιστορικό των προβλέψεών μου;",
            answer: "Μπορείτε να δείτε το ιστορικό των προβλέψεών σας στον πίνακα ελέγχου του προφίλ σας, όπου μπορείτε να δείτε όλες τις προηγούμενες προβλέψεις σας και τα αποτελέσματά τους."
        },
        {
            question: "Τι σημαίνει 'Underdog Alert';",
            answer: "Το Underdog Alert εμφανίζεται σε αγώνες με υψηλές διαφορές αποδόσεων (πάνω από 2.5). Αυτοί οι αγώνες προσφέρουν υψηλότερες δυνητικές ανταμοιβές αλλά είναι πιο ριψοκίνδυνες προβλέψεις."
        },
        {
            question: "Πώς αλλάζω τις πληροφορίες του προφίλ μου;",
            answer: "Μπορείτε να ενημερώσετε τις πληροφορίες του προφίλ σας πηγαίνοντας στις ρυθμίσεις λογαριασμού μετά τη σύνδεση."
        }
    ]
};

export default function FAQPage() {
    const params = useParams();
    const lang = params.lang as 'en' | 'el';
    const { dict } = useDictionary();
    const [openItems, setOpenItems] = useState<number[]>([]);

    const toggleItem = (index: number) => {
        setOpenItems(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const faqs = faqData[lang] || faqData.en;

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <Header lang={lang} />
            <div className="max-w-4xl mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">
                        {lang === 'el' ? 'Συχνές Ερωτήσεις' : 'Frequently Asked Questions'}
                    </h1>
                    <p className="text-slate-400 text-lg">
                        {lang === 'el'
                            ? 'Βρείτε απαντήσεις στις πιο συχνές ερωτήσεις σας'
                            : 'Find answers to your most common questions'
                        }
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden"
                        >
                            <button
                                onClick={() => toggleItem(index)}
                                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-slate-700/50 transition-colors"
                            >
                                <span className="font-semibold text-lg">{faq.question}</span>
                                {openItems.includes(index) ? (
                                    <ChevronUp className="h-5 w-5 text-slate-400" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-slate-400" />
                                )}
                            </button>
                            {openItems.includes(index) && (
                                <div className="px-6 pb-4">
                                    <div className="border-t border-slate-700 pt-4">
                                        <p className="text-slate-300 leading-relaxed">{faq.answer}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-8 border border-blue-500/30 shadow-lg">
                        <h3 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? 'Δεν βρήκατε αυτό που ψάχνετε;' : 'Still have questions?'}
                        </h3>
                        <p className="text-slate-300 mb-6">
                            {lang === 'el'
                                ? 'Επικοινωνήστε μαζί μας και θα σας βοηθήσουμε'
                                : 'Contact us and we\'ll help you out'
                            }
                        </p>
                        <div className="space-y-4">
                            <a
                                href={`/${lang}/contact`}
                                style={{ backgroundColor: buttons.secondary.bg, color: buttons.secondary.color }}
                                className={`block text-center ${buttons.secondary.className} backdrop-blur-sm p-4`}
                            >
                                → {lang === 'el' ? 'Επικοινωνία' : 'Contact Us'}
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
