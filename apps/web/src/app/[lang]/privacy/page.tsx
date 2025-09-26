'use client';

import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FooterDisclaimer } from '@/components/FooterDisclaimer';

export default function PrivacyPolicyPage() {
    const params = useParams();
    const lang = params?.lang as 'en' | 'el' || 'en';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 text-white">
            <Header lang={lang} />

            <div className="max-w-4xl mx-auto px-4 py-12">
                <h1 className="text-4xl font-bold mb-8 text-center">
                    {lang === 'el' ? 'Πολιτική Απορρήτου' : 'Privacy Policy'}
                </h1>

                <div className="prose prose-invert max-w-none">
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 border border-slate-700/50">
                        <h2 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? '1. Συλλογή Πληροφοριών' : '1. Information Collection'}
                        </h2>
                        <p className="mb-4">
                            {lang === 'el'
                                ? 'Συλλέγουμε πληροφορίες που μας παρέχετε άμεσα, όπως όταν δημιουργείτε λογαριασμό, συμπληρώνετε φόρμες ή επικοινωνείτε μαζί μας.'
                                : 'We collect information you provide directly to us, such as when you create an account, fill out forms, or communicate with us.'
                            }
                        </p>

                        <h2 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? '2. Χρήση Πληροφοριών' : '2. Use of Information'}
                        </h2>
                        <p className="mb-4">
                            {lang === 'el'
                                ? 'Χρησιμοποιούμε τις πληροφορίες που συλλέγουμε για να παρέχουμε, να λειτουργούμε και να βελτιώνουμε τις υπηρεσίες μας.'
                                : 'We use the information we collect to provide, operate, and improve our services.'
                            }
                        </p>

                        <h2 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? '3. Κοινοποίηση Πληροφοριών' : '3. Information Sharing'}
                        </h2>
                        <p className="mb-4">
                            {lang === 'el'
                                ? 'Δεν πουλάμε, ενοικιάζουμε ή διανέμουμε τις προσωπικές σας πληροφορίες σε τρίτους χωρίς τη συναίνεσή σας.'
                                : 'We do not sell, rent, or distribute your personal information to third parties without your consent.'
                            }
                        </p>

                        <h2 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? '4. Ασφάλεια Δεδομένων' : '4. Data Security'}
                        </h2>
                        <p className="mb-4">
                            {lang === 'el'
                                ? 'Εφαρμόζουμε κατάλληλα τεχνικά και οργανωτικά μέτρα για την προστασία των προσωπικών σας δεδομένων.'
                                : 'We implement appropriate technical and organizational measures to protect your personal data.'
                            }
                        </p>

                        <h2 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? '5. Cookies' : '5. Cookies'}
                        </h2>
                        <p className="mb-4">
                            {lang === 'el'
                                ? 'Χρησιμοποιούμε cookies και παρόμοιες τεχνολογίες για να βελτιώσουμε την εμπειρία σας στην ιστοσελίδα μας.'
                                : 'We use cookies and similar technologies to improve your experience on our website.'
                            }
                        </p>

                        <h2 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? '6. Επικοινωνία' : '6. Contact'}
                        </h2>
                        <p className="mb-4">
                            {lang === 'el'
                                ? 'Εάν έχετε ερωτήσεις σχετικά με αυτή την πολιτική απορρήτου, επικοινωνήστε μαζί μας στο privacy@netprophet.com'
                                : 'If you have questions about this privacy policy, please contact us at privacy@netprophet.com'
                            }
                        </p>

                        <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                            <p className="text-sm text-yellow-200">
                                {lang === 'el'
                                    ? 'Αυτή είναι μια δείγμα πολιτική απορρήτου. Θα ενημερωθεί με πλήρεις λεπτομέρειες στο μέλλον.'
                                    : 'This is a sample privacy policy. It will be updated with full details in the future.'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Footer lang={lang} />
            <FooterDisclaimer lang={lang} />
        </div>
    );
}
