'use client';

import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FooterDisclaimer } from '@/components/FooterDisclaimer';

export default function TermsOfUsePage() {
    const params = useParams();
    const lang = params?.lang as 'en' | 'el' || 'en';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 text-white">
            <Header lang={lang} />

            <div className="max-w-4xl mx-auto px-4 py-12">
                <h1 className="text-4xl font-bold mb-8 text-center">
                    {lang === 'el' ? 'Όροι Χρήσης' : 'Terms of Use'}
                </h1>

                <div className="prose prose-invert max-w-none">
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 border border-slate-700/50">
                        <h2 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? '1. Αποδοχή των Όρων' : '1. Acceptance of Terms'}
                        </h2>
                        <p className="mb-4">
                            {lang === 'el'
                                ? 'Με την πρόσβαση και χρήση της ιστοσελίδας NetProphet, αποδέχεστε αυτούς τους όρους χρήσης.'
                                : 'By accessing and using the NetProphet website, you accept these terms of use.'
                            }
                        </p>

                        <h2 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? '2. Περιγραφή Υπηρεσίας' : '2. Service Description'}
                        </h2>
                        <p className="mb-4">
                            {lang === 'el'
                                ? 'Το NetProphet είναι μια πλατφόρμα πρόβλεψης τένις που επιτρέπει στους χρήστες να κάνουν προβλέψεις για αγώνες τένις.'
                                : 'NetProphet is a tennis prediction platform that allows users to make predictions on tennis matches.'
                            }
                        </p>

                        <h2 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? '3. Ευθύνη Χρήστη' : '3. User Responsibility'}
                        </h2>
                        <p className="mb-4">
                            {lang === 'el'
                                ? 'Οι χρήστες είναι υπεύθυνοι για την ασφάλεια των λογαριασμών τους και πρέπει να χρησιμοποιούν την υπηρεσία νόμιμα.'
                                : 'Users are responsible for the security of their accounts and must use the service legally.'
                            }
                        </p>

                        <h2 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? '4. Απαγορευμένες Δραστηριότητες' : '4. Prohibited Activities'}
                        </h2>
                        <p className="mb-4">
                            {lang === 'el'
                                ? 'Απαγορεύεται η χρήση της υπηρεσίας για παράνομες δραστηριότητες, παραβίαση πνευματικών δικαιωμάτων ή παρεμβασία στην λειτουργία της πλατφόρμας.'
                                : 'It is prohibited to use the service for illegal activities, copyright infringement, or interference with the platform\'s operation.'
                            }
                        </p>

                        <h2 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? '5. Διακοπή Υπηρεσίας' : '5. Service Termination'}
                        </h2>
                        <p className="mb-4">
                            {lang === 'el'
                                ? 'Διατηρούμε το δικαίωμα να διακόψουμε ή να αναστείλουμε λογαριασμούς που παραβιάζουν αυτούς τους όρους.'
                                : 'We reserve the right to terminate or suspend accounts that violate these terms.'
                            }
                        </p>

                        <h2 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? '6. Αποποίηση Ευθύνης' : '6. Disclaimer'}
                        </h2>
                        <p className="mb-4">
                            {lang === 'el'
                                ? 'Η υπηρεσία παρέχεται "ως έχει" χωρίς εγγυήσεις. Δεν ευθυνόμαστε για απώλειες που προκύπτουν από τη χρήση της υπηρεσίας.'
                                : 'The service is provided "as is" without warranties. We are not liable for losses arising from the use of the service.'
                            }
                        </p>

                        <h2 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? '7. Αλλαγές στους Όρους' : '7. Changes to Terms'}
                        </h2>
                        <p className="mb-4">
                            {lang === 'el'
                                ? 'Διατηρούμε το δικαίωμα να τροποποιούμε αυτούς τους όρους οποιαδήποτε στιγμή. Οι αλλαγές θα δημοσιεύονται σε αυτή τη σελίδα.'
                                : 'We reserve the right to modify these terms at any time. Changes will be posted on this page.'
                            }
                        </p>

                        <h2 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? '8. Επικοινωνία' : '8. Contact'}
                        </h2>
                        <p className="mb-4">
                            {lang === 'el'
                                ? 'Εάν έχετε ερωτήσεις σχετικά με αυτούς τους όρους, επικοινωνήστε μαζί μας στο legal@netprophet.com'
                                : 'If you have questions about these terms, please contact us at legal@netprophet.com'
                            }
                        </p>

                        <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                            <p className="text-sm text-yellow-200">
                                {lang === 'el'
                                    ? 'Αυτοί είναι δείγμα όροι χρήσης. Θα ενημερωθούν με πλήρεις λεπτομέρειες στο μέλλον.'
                                    : 'These are sample terms of use. They will be updated with full details in the future.'
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
