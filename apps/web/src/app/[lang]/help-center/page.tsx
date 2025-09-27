'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useDictionary } from '@/context/DictionaryContext';
import { Search, BookOpen, Video, FileText, MessageCircle, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface HelpArticle {
    id: string;
    title: string;
    category: string;
    content: string;
    tags: string[];
    sections?: {
        title: string;
        content: string;
    }[];
}

const helpArticles: Record<string, HelpArticle[]> = {
    en: [
        {
            id: 'getting-started',
            title: 'Getting Started with NetProphet',
            category: 'Basics',
            content: 'Welcome to NetProphet! This comprehensive guide will help you get started with our tennis prediction platform.',
            tags: ['beginner', 'account', 'predictions'],
            sections: [
                {
                    title: 'Creating Your Account',
                    content: 'To get started, simply click the "Try for free" button on our homepage. You can sign up using your email address or social media accounts. Once registered, you\'ll receive 100 free coins to start making predictions.'
                },
                {
                    title: 'Understanding the Interface',
                    content: 'The main dashboard shows live and upcoming tennis matches. Each match displays player names, NTRP ratings, odds, and match status. Use the tournament filter to focus on specific events.'
                },
                {
                    title: 'Making Your First Prediction',
                    content: 'Click on any available match to view details. Select your predicted winner and the amount of coins you want to wager. Remember, higher odds mean higher potential rewards but greater risk.'
                },
                {
                    title: 'Navigating the Platform',
                    content: 'Use the header navigation to access different sections: Matches (current predictions), Leaderboard (rankings), My Picks (your prediction history), and Rewards (coin management).'
                }
            ]
        },
        {
            id: 'making-predictions',
            title: 'How to Make Predictions',
            category: 'Predictions',
            content: 'Master the art of tennis predictions with our detailed guide on placing bets and maximizing your success.',
            tags: ['predictions', 'odds', 'matches'],
            sections: [
                {
                    title: 'Selecting Matches',
                    content: 'Browse available matches on the main page. Look for matches with "upcoming" or "live" status. Locked matches cannot be predicted on. Use the tournament filter to find specific events.'
                },
                {
                    title: 'Understanding Match Information',
                    content: 'Each match shows: Player names with NTRP ratings (e.g., 4.0, 4.5), current odds for each player, match status, tournament information, and start time. Higher NTRP ratings generally indicate stronger players.'
                },
                {
                    title: 'Placing Your Prediction',
                    content: '1. Click on the match you want to predict\n2. Review the odds and player information\n3. Select your predicted winner\n4. Choose your wager amount (minimum 1 coin)\n5. Click "Add to Prediction Slip"\n6. Review your slip and confirm your prediction'
                },
                {
                    title: 'Prediction Slip Management',
                    content: 'Your prediction slip appears on the right side of the screen. You can add multiple matches to create parlays for higher potential rewards. Remove unwanted predictions before confirming.'
                },
                {
                    title: 'Underdog Opportunities',
                    content: 'Matches with odds differences greater than 2.5 are marked with "Underdog Alert" banners. These offer higher potential rewards but are riskier predictions. Consider player form and head-to-head records.'
                }
            ]
        },
        {
            id: 'understanding-odds',
            title: 'Understanding Tennis Odds',
            category: 'Odds',
            content: 'Learn how our advanced odds calculation system works and how to interpret the numbers for better predictions.',
            tags: ['odds', 'calculation', 'winnings'],
            sections: [
                {
                    title: 'How Odds Are Calculated',
                    content: 'Our algorithm considers multiple factors including NTRP ratings, recent form, surface preferences, head-to-head records, experience, and momentum. The system uses level-aware scaling where differences matter more at higher skill levels.'
                },
                {
                    title: 'Reading Odds',
                    content: 'Odds represent the potential return on your prediction. For example, odds of 2.50 mean you\'ll win 2.5 coins for every 1 coin wagered. Lower odds indicate favorites, while higher odds suggest underdogs.'
                },
                {
                    title: 'NTRP Rating Impact',
                    content: 'NTRP ratings significantly influence odds. A 4.5 player typically has better odds than a 4.0 player. However, identical ratings (4.0 vs 4.0) result in very close odds, with other factors becoming more important.'
                },
                {
                    title: 'Dynamic Odds Adjustment',
                    content: 'Odds may change as new information becomes available or as more predictions are placed. Always check the current odds before confirming your prediction.'
                },
                {
                    title: 'Margin and Profit',
                    content: 'Our odds include a 5% margin to ensure platform sustainability. This means the true probabilities are slightly different from the displayed odds, but the system remains fair and transparent.'
                }
            ]
        },
        {
            id: 'coin-system',
            title: 'Coin System and Rewards',
            category: 'Rewards',
            content: 'Everything you need to know about earning, spending, and managing your coins on NetProphet.',
            tags: ['coins', 'rewards', 'leaderboard'],
            sections: [
                {
                    title: 'Earning Coins',
                    content: 'Start with 100 free coins upon registration. Earn more by making correct predictions. The amount you win depends on the odds of your prediction - higher odds mean higher potential rewards.'
                },
                {
                    title: 'Winning Calculations',
                    content: 'Your winnings = (Wager Amount × Odds) - Wager Amount. For example, betting 10 coins on 2.50 odds: (10 × 2.50) - 10 = 15 coins profit if correct.'
                },
                {
                    title: 'Leaderboard System',
                    content: 'Compete with other players on our weekly and monthly leaderboards. Rankings are based on total coins earned and win percentage. Top performers receive recognition and special rewards.'
                },
                {
                    title: 'Coin Management Tips',
                    content: '• Start with small wagers to learn the system\n• Diversify your predictions across multiple matches\n• Don\'t bet all your coins on a single prediction\n• Consider the risk-reward ratio before wagering'
                },
                {
                    title: 'Daily Rewards',
                    content: 'Log in daily to receive bonus coins. The longer your streak, the better the rewards. Missing a day resets your streak, so stay consistent!'
                }
            ]
        },
        {
            id: 'match-statuses',
            title: 'Understanding Match Statuses',
            category: 'Matches',
            content: 'Learn about different match statuses and what they mean for your predictions.',
            tags: ['matches', 'status', 'live'],
            sections: [
                {
                    title: 'Upcoming Matches',
                    content: 'Matches scheduled for the future. These are available for predictions until they start or reach their lock time. Perfect for planning your predictions in advance.'
                },
                {
                    title: 'Live Matches',
                    content: 'Matches currently in progress. These may still accept predictions depending on the current set and lock time. Live matches show real-time score updates.'
                },
                {
                    title: 'Finished Matches',
                    content: 'Completed matches where results are final. If you predicted correctly, your winnings are automatically added to your account. Incorrect predictions result in losing your wagered coins.'
                },
                {
                    title: 'Cancelled Matches',
                    content: 'Matches that were cancelled before completion. All predictions for cancelled matches are automatically refunded to your account within 24 hours.'
                },
                {
                    title: 'Locked Matches',
                    content: 'Matches that have passed their lock time and no longer accept predictions. These matches are displayed with a lock icon and cannot be predicted on.'
                }
            ]
        },
        {
            id: 'account-management',
            title: 'Managing Your Account',
            category: 'Account',
            content: 'Complete guide to managing your NetProphet account, profile, and preferences.',
            tags: ['account', 'profile', 'settings'],
            sections: [
                {
                    title: 'Profile Information',
                    content: 'Update your display name, email address, and profile picture in the account settings. Keep your information current for better communication and account security.'
                },
                {
                    title: 'Privacy Settings',
                    content: 'Control what information is visible to other players. You can choose to show or hide your prediction history, win rate, and leaderboard position.'
                },
                {
                    title: 'Notification Preferences',
                    content: 'Customize how you receive notifications: email alerts for match results, push notifications for live matches, and updates about your prediction performance.'
                },
                {
                    title: 'Security Features',
                    content: 'Enable two-factor authentication for added security. Regularly update your password and review your account activity. Report any suspicious activity immediately.'
                },
                {
                    title: 'Data Export',
                    content: 'Request a copy of your prediction history and account data. This feature helps you track your performance and maintain records of your activity.'
                }
            ]
        },
        {
            id: 'technical-support',
            title: 'Technical Issues and Support',
            category: 'Technical',
            content: 'Solutions to common technical problems and how to get help when you need it.',
            tags: ['technical', 'support', 'troubleshooting'],
            sections: [
                {
                    title: 'Common Issues',
                    content: '• Page not loading: Clear your browser cache and cookies\n• Predictions not saving: Check your internet connection\n• Odds not updating: Refresh the page\n• Login problems: Verify your email and password'
                },
                {
                    title: 'Browser Compatibility',
                    content: 'NetProphet works best with Chrome, Firefox, Safari, and Edge browsers. Ensure you\'re using the latest version for optimal performance. Disable ad blockers if you experience issues.'
                },
                {
                    title: 'Mobile Performance',
                    content: 'For the best mobile experience, use our mobile app or ensure your mobile browser is updated. Some features may be limited on older devices or browsers.'
                },
                {
                    title: 'Getting Help',
                    content: 'If you can\'t resolve an issue: 1) Check our FAQ section 2) Contact support via the contact form 3) Email support@netprophetapp.com 4) Use the live chat feature (when available)'
                },
                {
                    title: 'Reporting Bugs',
                    content: 'Help us improve by reporting bugs. Include: your browser type and version, steps to reproduce the issue, screenshots if possible, and your account email (for follow-up).'
                }
            ]
        },
        {
            id: 'mobile-app',
            title: 'Using the Mobile App',
            category: 'Mobile',
            content: 'Complete guide to using NetProphet on your mobile device for predictions on the go.',
            tags: ['mobile', 'app', 'features'],
            sections: [
                {
                    title: 'App Installation',
                    content: 'Download NetProphet from the App Store (iOS) or Google Play Store (Android). The app is free and syncs with your web account automatically.'
                },
                {
                    title: 'Mobile Features',
                    content: 'The mobile app includes all web features: match browsing, predictions, leaderboard, and account management. Enjoy push notifications for match updates and results.'
                },
                {
                    title: 'Offline Functionality',
                    content: 'While predictions require an internet connection, you can view your prediction history and account information offline. Sync occurs automatically when you reconnect.'
                },
                {
                    title: 'Mobile-Specific Tips',
                    content: '• Use landscape mode for better match viewing\n• Enable notifications for live match updates\n• Bookmark favorite tournaments\n• Use biometric login for quick access'
                },
                {
                    title: 'Performance Optimization',
                    content: 'Close other apps to ensure smooth performance. Keep the app updated for the latest features and bug fixes. Clear app cache if you experience issues.'
                }
            ]
        }
    ],
    el: [
        {
            id: 'getting-started',
            title: 'Ξεκινώντας με το NetProphet',
            category: 'Βασικά',
            content: 'Καλώς ήρθατε στο NetProphet! Αυτός ο ολοκληρωμένος οδηγός θα σας βοηθήσει να ξεκινήσετε με την πλατφόρμα πρόβλεψης τένις μας.',
            tags: ['αρχάριος', 'λογαριασμός', 'προβλέψεις'],
            sections: [
                {
                    title: 'Δημιουργία Λογαριασμού',
                    content: 'Για να ξεκινήσετε, απλά κάντε κλικ στο κουμπί "Δοκίμασε τώρα δωρεάν" στην αρχική μας σελίδα. Μπορείτε να εγγραφείτε χρησιμοποιώντας τη διεύθυνση email σας ή λογαριασμούς κοινωνικών δικτύων. Μόλις εγγραφείτε, θα λάβετε 100 δωρεάν νομίσματα για να αρχίσετε να κάνετε προβλέψεις.'
                },
                {
                    title: 'Κατανόηση της Διεπαφής',
                    content: 'Ο κύριος πίνακας ελέγχου εμφανίζει ζωντανούς και επερχόμενους αγώνες τένις. Κάθε αγώνας εμφανίζει ονόματα παικτών, βαθμολογίες NTRP, αποδόσεις και κατάσταση αγώνα. Χρησιμοποιήστε το φίλτρο τουρνουά για να εστιάσετε σε συγκεκριμένα γεγονότα.'
                },
                {
                    title: 'Κάνοντας την Πρώτη σας Πρόβλεψη',
                    content: 'Κάντε κλικ σε οποιονδήποτε διαθέσιμο αγώνα για να δείτε λεπτομέρειες. Επιλέξτε τον προβλεπόμενο νικητή σας και το ποσό νομισμάτων που θέλετε να ποντάρετε. Θυμηθείτε, οι υψηλότερες αποδόσεις σημαίνουν υψηλότερες δυνητικές ανταμοιβές αλλά μεγαλύτερο ρίσκο.'
                },
                {
                    title: 'Πλοήγηση στην Πλατφόρμα',
                    content: 'Χρησιμοποιήστε την πλοήγηση της κεφαλίδας για να αποκτήσετε πρόσβαση σε διαφορετικές ενότητες: Αγώνες (τρέχουσες προβλέψεις), Πίνακας Κατάταξης (βαθμολογίες), Οι Προβλέψεις μου (ιστορικό προβλέψεών σας) και Ανταμοιβές (διαχείριση νομισμάτων).'
                }
            ]
        },
        {
            id: 'making-predictions',
            title: 'Πώς να Κάνετε Προβλέψεις',
            category: 'Προβλέψεις',
            content: 'Κατακτήστε την τέχνη των προβλέψεων τένις με τον λεπτομερή οδηγό μας για την τοποθέτηση στοιχημάτων και τη μεγιστοποίηση της επιτυχίας σας.',
            tags: ['προβλέψεις', 'αποδόσεις', 'αγώνες'],
            sections: [
                {
                    title: 'Επιλογή Αγώνων',
                    content: 'Περιηγηθείτε σε διαθέσιμους αγώνες στην κύρια σελίδα. Αναζητήστε αγώνες με κατάσταση "επερχόμενος" ή "ζωντανός". Κλειδωμένοι αγώνες δεν μπορούν να προβλεφθούν. Χρησιμοποιήστε το φίλτρο τουρνουά για να βρείτε συγκεκριμένα γεγονότα.'
                },
                {
                    title: 'Κατανόηση Πληροφοριών Αγώνα',
                    content: 'Κάθε αγώνας εμφανίζει: Ονόματα παικτών με βαθμολογίες NTRP (π.χ. 4.0, 4.5), τρέχουσες αποδόσεις για κάθε παίκτη, κατάσταση αγώνα, πληροφορίες τουρνουά και ώρα έναρξης. Οι υψηλότερες βαθμολογίες NTRP γενικά υποδηλώνουν πιο δυνατούς παίκτες.'
                },
                {
                    title: 'Τοποθέτηση της Πρόβλεψής σας',
                    content: '1. Κάντε κλικ στον αγώνα που θέλετε να προβλέψετε\n2. Εξετάστε τις αποδόσεις και τις πληροφορίες των παικτών\n3. Επιλέξτε τον προβλεπόμενο νικητή σας\n4. Επιλέξτε το ποσό στοιχήματός σας (ελάχιστο 1 νόμισμα)\n5. Κάντε κλικ "Προσθήκη στο Σημείωμα Προβλέψεων"\n6. Εξετάστε το σημείωμά σας και επιβεβαιώστε την πρόβλεψή σας'
                },
                {
                    title: 'Διαχείριση Σημείωματος Προβλέψεων',
                    content: 'Το σημείωμα προβλέψεών σας εμφανίζεται στη δεξιά πλευρά της οθόνης. Μπορείτε να προσθέσετε πολλούς αγώνες για να δημιουργήσετε συνδυαστικά στοιχήματα για υψηλότερες δυνητικές ανταμοιβές. Αφαιρέστε ανεπιθύμητες προβλέψεις πριν επιβεβαιώσετε.'
                },
                {
                    title: 'Ευκαιρίες Αουτσάιντερ',
                    content: 'Αγώνες με διαφορές αποδόσεων μεγαλύτερες από 2.5 σημειώνονται με πανό "Ειδοποίηση Αουτσάιντερ". Αυτοί προσφέρουν υψηλότερες δυνητικές ανταμοιβές αλλά είναι πιο ριψοκίνδυνες προβλέψεις. Λάβετε υπόψη τη φόρμα των παικτών και τα ρεκόρ αντιπαράθεσης.'
                }
            ]
        },
        {
            id: 'understanding-odds',
            title: 'Κατανόηση Αποδόσεων Τένις',
            category: 'Αποδόσεις',
            content: 'Μάθετε πώς λειτουργεί το προηγμένο σύστημα υπολογισμού αποδόσεών μας και πώς να ερμηνεύετε τους αριθμούς για καλύτερες προβλέψεις.',
            tags: ['αποδόσεις', 'υπολογισμός', 'κερδη'],
            sections: [
                {
                    title: 'Πώς Υπολογίζονται οι Αποδόσεις',
                    content: 'Ο αλγόριθμός μας λαμβάνει υπόψη πολλούς παράγοντες συμπεριλαμβανομένων των βαθμολογιών NTRP, πρόσφατης φόρμας, προτιμήσεων επιφάνειας, ρεκόρ H2H, εμπειρίας και σερί. Το σύστημα χρησιμοποιεί κλιμακούμενη κλίμακα επιπέδου όπου οι διαφορές έχουν μεγαλύτερη σημασία σε υψηλότερα επίπεδα δεξιοτήτων.'
                },
                {
                    title: 'Ανάγνωση Αποδόσεων',
                    content: 'Οι αποδόσεις αντιπροσωπεύουν την δυνητική απόδοση της πρόβλεψής σας. Για παράδειγμα, αποδόσεις 2.50 σημαίνουν ότι θα κερδίσετε 2.5 νομίσματα για κάθε 1 νόμισμα που στοιχηματίζετε. Οι χαμηλότερες αποδόσεις υποδηλώνουν φαβορί, ενώ οι υψηλότερες αποδόσεις υποδηλώνουν αουτσάιντερ.'
                },
                {
                    title: 'Επίδραση Βαθμολογίας NTRP',
                    content: 'Οι βαθμολογίες NTRP επηρεάζουν σημαντικά τις αποδόσεις. Ένας παίκτης 4.5 συνήθως έχει καλύτερες αποδόσεις από έναν παίκτη 4.0. Ωστόσο, οι ίδιες βαθμολογίες (4.0 vs 4.0) οδηγούν σε πολύ κοντινές αποδόσεις, με άλλους παράγοντες να γίνονται πιο σημαντικοί.'
                },
                {
                    title: 'Δυναμική Προσαρμογή Αποδόσεων',
                    content: 'Οι αποδόσεις μπορεί να αλλάζουν καθώς γίνονται διαθέσιμες νέες πληροφορίες ή καθώς τοποθετούνται περισσότερες προβλέψεις. Πάντα ελέγξτε τις τρέχουσες αποδόσεις πριν επιβεβαιώσετε την πρόβλεψή σας.'
                },
                {
                    title: 'Περιθώριο και Κέρδος',
                    content: 'Οι αποδόσεις μας περιλαμβάνουν ένα 5% περιθώριο για να εξασφαλίσουμε τη βιωσιμότητα της πλατφόρμας. Αυτό σημαίνει ότι οι πραγματικές πιθανότητες είναι ελαφρώς διαφορετικές από τις εμφανιζόμενες αποδόσεις, αλλά το σύστημα παραμένει δίκαιο και διαφανές.'
                }
            ]
        },
        {
            id: 'coin-system',
            title: 'Σύστημα Νομισμάτων και Ανταμοιβών',
            category: 'Ανταμοιβές',
            content: 'Όλα όσα χρειάζεται να γνωρίζετε για την απόκτηση, δαπάνη και διαχείριση των νομισμάτων σας στο NetProphet.',
            tags: ['νομίσματα', 'ανταμοιβές', 'πίνακας'],
            sections: [
                {
                    title: 'Απόκτηση Νομισμάτων',
                    content: 'Ξεκινήστε με 100 δωρεάν νομίσματα κατά την εγγραφή. Κερδίστε περισσότερα κάνοντας σωστές προβλέψεις. Το ποσό που κερδίζετε εξαρτάται από τις αποδόσεις της πρόβλεψής σας - οι υψηλότερες αποδόσεις σημαίνουν υψηλότερες δυνητικές ανταμοιβές.'
                },
                {
                    title: 'Υπολογισμοί Κερδών',
                    content: 'Τα κέρδη σας = (Ποσό Στοιχήματος × Αποδόσεις) - Ποσό Στοιχήματος. Για παράδειγμα, στοιχηματίζοντας 10 νομίσματα σε αποδόσεις 2.50: (10 × 2.50) - 10 = 15 νομίσματα κέρδος αν είναι σωστό.'
                },
                {
                    title: 'Σύστημα Πίνακα Κατάταξης',
                    content: 'Αγωνιστείτε με άλλους παίκτες στους εβδομαδιαίους και μηνιαίους πίνακες κατάταξης. Οι βαθμολογίες βασίζονται στο συνολικό ποσό νομισμάτων που κερδίσατε και το ποσοστό νίκης. Οι κορυφαίοι επιδόσεις λαμβάνουν αναγνώριση και ειδικές ανταμοιβές.'
                },
                {
                    title: 'Συμβουλές Διαχείρισης Νομισμάτων',
                    content: '• Ξεκινήστε με μικρά στοιχήματα για να μάθετε το σύστημα\n• Διαφοροποιήστε τις προβλέψεις σας σε πολλούς αγώνες\n• Μην στοιχηματίζετε όλα τα νομίσματά σας σε μία πρόβλεψη\n• Λάβετε υπόψη την αναλογία κινδύνου-ανταμοιβής πριν στοιχηματίσετε'
                },
                {
                    title: 'Ημερήσιες Ανταμοιβές',
                    content: 'Συνδεθείτε καθημερινά για να λάβετε μπόνους νομίσματα. Όσο μεγαλύτερη είναι η σειρά σας, τόσο καλύτερες είναι οι ανταμοιβές. Το να χάσετε μια μέρα επαναφέρει τη σειρά σας, οπότε μείνετε συνεπείς!'
                }
            ]
        },
        {
            id: 'match-statuses',
            title: 'Κατανόηση Κατάστασης Αγώνων',
            category: 'Αγώνες',
            content: 'Μάθετε για τις διαφορετικές καταστάσεις αγώνων και τι σημαίνουν για τις προβλέψεις σας.',
            tags: ['αγώνες', 'κατάσταση', 'ζωντανό'],
            sections: [
                {
                    title: 'Επερχόμενοι Αγώνες',
                    content: 'Αγώνες προγραμματισμένοι για το μέλλον. Αυτοί είναι διαθέσιμοι για προβλέψεις μέχρι να αρχίσουν ή να φτάσουν στην ώρα κλειδώματος. Ιδανικοί για προγραμματισμό των προβλέψεών σας εκ των προτέρων.'
                },
                {
                    title: 'Ζωντανοί Αγώνες',
                    content: 'Αγώνες που βρίσκονται σε εξέλιξη. Αυτοί μπορεί να δέχονται ακόμα προβλέψεις ανάλογα με το τρέχον σετ και την ώρα κλειδώματος. Οι ζωντανοί αγώνες εμφανίζουν ενημερώσεις βαθμολογίας σε πραγματικό χρόνο.'
                },
                {
                    title: 'Ολοκληρωμένοι Αγώνες',
                    content: 'Ολοκληρωμένοι αγώνες όπου τα αποτελέσματα είναι οριστικά. Αν προβλέψατε σωστά, τα κέρδη σας προστίθενται αυτόματα στον λογαριασμό σας. Οι λανθασμένες προβλέψεις οδηγούν στην απώλεια των στοιχηματισμένων νομισμάτων σας.'
                },
                {
                    title: 'Ακυρωμένοι Αγώνες',
                    content: 'Αγώνες που ακυρώθηκαν πριν την ολοκλήρωσή τους. Όλες οι προβλέψεις για ακυρωμένους αγώνες επιστρέφονται αυτόματα στον λογαριασμό σας εντός 24 ωρών.'
                },
                {
                    title: 'Κλειδωμένοι Αγώνες',
                    content: 'Αγώνες που έχουν περάσει την ώρα κλειδώματος και δεν δέχονται πλέον προβλέψεις. Αυτοί οι αγώνες εμφανίζονται με εικονίδιο κλειδού και δεν μπορούν να προβλεφθούν.'
                }
            ]
        },
        {
            id: 'account-management',
            title: 'Διαχείριση Λογαριασμού',
            category: 'Λογαριασμός',
            content: 'Πλήρης οδηγός για τη διαχείριση του λογαριασμού, του προφίλ και των προτιμήσεών σας στο NetProphet.',
            tags: ['λογαριασμός', 'προφίλ', 'ρυθμίσεις'],
            sections: [
                {
                    title: 'Πληροφορίες Προφίλ',
                    content: 'Ενημερώστε το όνομα εμφάνισης, τη διεύθυνση email και την εικόνα προφίλ στις ρυθμίσεις λογαριασμού. Κρατήστε τις πληροφορίές σας ενημερωμένες για καλύτερη επικοινωνία και ασφάλεια λογαριασμού.'
                },
                {
                    title: 'Ρυθμίσεις Απορρήτου',
                    content: 'Ελέγξτε ποιες πληροφορίες είναι ορατές σε άλλους παίκτες. Μπορείτε να επιλέξετε να δείξετε ή να κρύψετε το ιστορικό προβλέψεών σας, το ποσοστό νίκης και τη θέση στον πίνακα κατάταξης.'
                },
                {
                    title: 'Προτιμήσεις Ειδοποιήσεων',
                    content: 'Προσαρμόστε πώς λαμβάνετε ειδοποιήσεις: ειδοποιήσεις email για αποτελέσματα αγώνων, push ειδοποιήσεις για ζωντανούς αγώνες και ενημερώσεις για την απόδοση των προβλέψεών σας.'
                },
                {
                    title: 'Χαρακτηριστικά Ασφαλείας',
                    content: 'Ενεργοποιήστε την επαλήθευση δύο παραγόντων για επιπλέον ασφάλεια. Ενημερώνετε τακτικά τον κωδικό πρόσβασής σας και ελέγχετε τη δραστηριότητα του λογαριασμού σας. Αναφέρετε οποιαδήποτε ύποπτη δραστηριότητα αμέσως.'
                },
                {
                    title: 'Εξαγωγή Δεδομένων',
                    content: 'Ζητήστε ένα αντίγραφο του ιστορικού προβλέψεών σας και των δεδομένων λογαριασμού. Αυτό το χαρακτηριστικό σας βοηθά να παρακολουθείτε την απόδοσή σας και να διατηρείτε αρχεία της δραστηριότητάς σας.'
                }
            ]
        },
        {
            id: 'technical-support',
            title: 'Τεχνικά Θέματα και Υποστήριξη',
            category: 'Τεχνικά',
            content: 'Λύσεις σε κοινά τεχνικά προβλήματα και πώς να λάβετε βοήθεια όταν τη χρειάζεστε.',
            tags: ['τεχνικά', 'υποστήριξη', 'αντιμετώπιση'],
            sections: [
                {
                    title: 'Κοινά Θέματα',
                    content: '• Η σελίδα δεν φορτώνει: Καθαρίστε την προσωρινή μνήμη και τα cookies του browser σας\n• Οι προβλέψεις δεν αποθηκεύονται: Ελέγξτε τη σύνδεσή σας στο internet\n• Οι αποδόσεις δεν ενημερώνονται: Ανανεώστε τη σελίδα\n• Προβλήματα σύνδεσης: Επαληθεύστε το email και τον κωδικό πρόσβασής σας'
                },
                {
                    title: 'Συμβατότητα Browser',
                    content: 'Το NetProphet λειτουργεί καλύτερα με Chrome, Firefox, Safari και Edge browsers. Βεβαιωθείτε ότι χρησιμοποιείτε την τελευταία έκδοση για βέλτιστη απόδοση. Απενεργοποιήστε τα ad blockers αν αντιμετωπίζετε προβλήματα.'
                },
                {
                    title: 'Απόδοση Κινητού',
                    content: 'Για την καλύτερη εμπειρία κινητού, χρησιμοποιήστε την εφαρμογή κινητού μας ή βεβαιωθείτε ότι το browser κινητού σας είναι ενημερωμένο. Ορισμένα χαρακτηριστικά μπορεί να είναι περιορισμένα σε παλιότερες συσκευές ή browsers.'
                },
                {
                    title: 'Λήψη Βοήθειας',
                    content: 'Αν δεν μπορείτε να λύσετε ένα θέμα: 1) Ελέγξτε την ενότητα FAQ μας 2) Επικοινωνήστε με την υποστήριξη μέσω της φόρμας επαφής 3) Στείλτε email στο support@netprophetapp.com 4) Χρησιμοποιήστε το χαρακτηριστικό ζωντανής συνομιλίας (όταν είναι διαθέσιμο)'
                },
                {
                    title: 'Αναφορά Σφαλμάτων',
                    content: 'Βοηθήστε μας να βελτιωθούμε αναφέροντας σφάλματα. Συμπεριλάβετε: τον τύπο και την έκδοση του browser σας, τα βήματα για αναπαραγωγή του θέματος, στιγμιότυπα οθόνης αν είναι δυνατόν, και το email του λογαριασμού σας (για παρακολούθηση).'
                }
            ]
        },
        {
            id: 'mobile-app',
            title: 'Χρήση της Εφαρμογής Κινητού',
            category: 'Κινητό',
            content: 'Πλήρης οδηγός για τη χρήση του NetProphet στην κινητή σας συσκευή για προβλέψεις εν κινήσει.',
            tags: ['κινητό', 'εφαρμογή', 'χαρακτηριστικά'],
            sections: [
                {
                    title: 'Εγκατάσταση Εφαρμογής',
                    content: 'Κατεβάστε το NetProphet από το App Store (iOS) ή το Google Play Store (Android). Η εφαρμογή είναι δωρεάν και συγχρονίζεται αυτόματα με τον λογαριασμό web σας.'
                },
                {
                    title: 'Χαρακτηριστικά Κινητού',
                    content: 'Η εφαρμογή κινητού περιλαμβάνει όλα τα χαρακτηριστικά web: περιήγηση αγώνων, προβλέψεις, πίνακας κατάταξης και διαχείριση λογαριασμού. Απολαύστε push ειδοποιήσεις για ενημερώσεις αγώνων και αποτελέσματα.'
                },
                {
                    title: 'Λειτουργικότητα Offline',
                    content: 'Ενώ οι προβλέψεις απαιτούν σύνδεση internet, μπορείτε να δείτε το ιστορικό προβλέψεών σας και τις πληροφορίες λογαριασμού offline. Ο συγχρονισμός γίνεται αυτόματα όταν επανασυνδεθείτε.'
                },
                {
                    title: 'Συμβουλές Ειδικά για Κινητό',
                    content: '• Χρησιμοποιήστε λειτουργία landscape για καλύτερη προβολή αγώνων\n• Ενεργοποιήστε ειδοποιήσεις για ενημερώσεις ζωντανών αγώνων\n• Προσθέστε σελιδοδείκτες αγαπημένα τουρνουά\n• Χρησιμοποιήστε βιομετρική σύνδεση για γρήγορη πρόσβαση'
                },
                {
                    title: 'Βελτιστοποίηση Απόδοσης',
                    content: 'Κλείστε άλλες εφαρμογές για να εξασφαλίσετε ομαλή απόδοση. Κρατήστε την εφαρμογή ενημερωμένη για τα τελευταία χαρακτηριστικά και διορθώσεις σφαλμάτων. Καθαρίστε την προσωρινή μνήμη της εφαρμογής αν αντιμετωπίζετε προβλήματα.'
                }
            ]
        }
    ]
};

const categories = {
    en: ['All', 'Basics', 'Predictions', 'Odds', 'Rewards', 'Matches', 'Account', 'Technical', 'Mobile'],
    el: ['Όλα', 'Βασικά', 'Προβλέψεις', 'Αποδόσεις', 'Ανταμοιβές', 'Αγώνες', 'Λογαριασμός', 'Τεχνικά', 'Κινητό']
};

export default function HelpCenterPage() {
    const params = useParams();
    const lang = params.lang as 'en' | 'el';
    const { dict } = useDictionary();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(lang === 'el' ? 'Όλα' : 'All');
    const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

    const articles = helpArticles[lang] || helpArticles.en;

    // Set the first article as selected by default
    useEffect(() => {
        if (articles.length > 0 && !selectedArticle) {
            setSelectedArticle(articles[0].id);
        }
    }, [articles, selectedArticle]);
    const availableCategories = categories[lang as keyof typeof categories] || categories.en;

    const filteredArticles = articles.filter(article => {
        const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory = selectedCategory === availableCategories[0] ||
            selectedCategory === 'All' ||
            selectedCategory === 'Όλα' ||
            article.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    const selectedArticleData = selectedArticle ? articles.find(a => a.id === selectedArticle) : null;

    const helpSections = [
        {
            icon: BookOpen,
            title: lang === 'el' ? 'Οδηγοί' : 'Guides',
            description: lang === 'el' ? 'Βήμα-βήμα οδηγοί για να ξεκινήσετε' : 'Step-by-step guides to get you started',
            color: 'bg-blue-600'
        },
        {
            icon: Video,
            title: lang === 'el' ? 'Βίντεο' : 'Videos',
            description: lang === 'el' ? 'Εκπαιδευτικά βίντεο και οδηγοί' : 'Educational videos and tutorials',
            color: 'bg-green-600'
        },
        {
            icon: FileText,
            title: lang === 'el' ? 'Άρθρα' : 'Articles',
            description: lang === 'el' ? 'Αναλυτικά άρθρα και τεκμηρίωση' : 'Detailed articles and documentation',
            color: 'bg-purple-600'
        },
        {
            icon: MessageCircle,
            title: lang === 'el' ? 'Επικοινωνία' : 'Contact',
            description: lang === 'el' ? 'Επικοινωνήστε με την ομάδα υποστήριξης' : 'Get in touch with our support team',
            color: 'bg-orange-600'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <Header lang={lang} />
            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">
                        {lang === 'el' ? 'Κέντρο Βοήθειας' : 'Help Center'}
                    </h1>
                    <p className="text-slate-400 text-lg">
                        {lang === 'el'
                            ? 'Βρείτε απαντήσεις και μάθετε πώς να χρησιμοποιείτε το NetProphet'
                            : 'Find answers and learn how to use NetProphet'
                        }
                    </p>
                </div>

                {/* Help Sections */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {helpSections.map((section, index) => (
                        <div key={index} className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors">
                            <div className={`w-12 h-12 ${section.color} rounded-lg flex items-center justify-center mb-4`}>
                                <section.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
                            <p className="text-slate-400 text-sm">{section.description}</p>
                        </div>
                    ))}
                </div>

                {/* Search and Filters */}
                <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 mb-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder={lang === 'el' ? 'Αναζήτηση άρθρων...' : 'Search articles...'}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="md:w-64">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {availableCategories.map((category) => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Articles List */}
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <h2 className="text-2xl font-semibold mb-6">
                            {lang === 'el' ? 'Άρθρα' : 'Articles'}
                        </h2>
                        <div className="space-y-2">
                            {filteredArticles.map((article) => (
                                <button
                                    key={article.id}
                                    onClick={() => setSelectedArticle(article.id)}
                                    className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedArticle === article.id
                                        ? 'bg-blue-600 border-blue-500'
                                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold mb-1">{article.title}</h3>
                                            <p className="text-slate-400 text-sm line-clamp-2">{article.content}</p>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {article.tags.slice(0, 2).map((tag, index) => (
                                                    <span key={index} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-400 ml-2" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        {selectedArticleData ? (
                            <div className="bg-slate-800/50 rounded-lg p-8 border border-slate-700">
                                <div className="mb-6">
                                    <span className="inline-block bg-blue-600 text-white text-sm px-3 py-1 rounded-full mb-4">
                                        {selectedArticleData.category}
                                    </span>
                                    <h1 className="text-3xl font-bold mb-4">{selectedArticleData.title}</h1>
                                    <p className="text-slate-300 text-lg">{selectedArticleData.content}</p>
                                </div>

                                {/* Article Sections */}
                                {selectedArticleData.sections && selectedArticleData.sections.length > 0 && (
                                    <div className="space-y-6">
                                        {selectedArticleData.sections.map((section, index) => (
                                            <div key={index} className="border-l-4 border-blue-500 pl-6">
                                                <h3 className="text-xl font-semibold mb-3 text-blue-400">
                                                    {section.title}
                                                </h3>
                                                <div className="text-slate-300 whitespace-pre-line">
                                                    {section.content}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="border-t border-slate-700 pt-6 mt-8">
                                    <h3 className="text-lg font-semibold mb-3">
                                        {lang === 'el' ? 'Σχετικά θέματα' : 'Related Topics'}
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedArticleData.tags.map((tag, index) => (
                                            <span key={index} className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-sm">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-800/50 rounded-lg p-8 border border-slate-700 text-center">
                                <BookOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold mb-2">
                                    {lang === 'el' ? 'Επιλέξτε ένα άρθρο' : 'Select an article'}
                                </h3>
                                <p className="text-slate-400">
                                    {lang === 'el'
                                        ? 'Επιλέξτε ένα άρθρο από τη λίστα για να δείτε το περιεχόμενό του'
                                        : 'Choose an article from the list to view its content'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact CTA */}
                <div className="mt-12 text-center">
                    <div className="bg-slate-800/30 rounded-lg p-8 border border-slate-700">
                        <h3 className="text-2xl font-semibold mb-4">
                            {lang === 'el' ? 'Χρειάζεστε περισσότερη βοήθεια;' : 'Need more help?'}
                        </h3>
                        <p className="text-slate-400 mb-6">
                            {lang === 'el'
                                ? 'Η ομάδα υποστήριξής μας είναι εδώ για να σας βοηθήσει'
                                : 'Our support team is here to help you'
                            }
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a
                                href={`/${lang}/contact`}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                            >
                                {lang === 'el' ? 'Επικοινωνία' : 'Contact Support'}
                            </a>
                            <a
                                href={`/${lang}/faq`}
                                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                            >
                                {lang === 'el' ? 'Συχνές Ερωτήσεις' : 'FAQ'}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <Footer lang={lang} dict={dict} />
        </div>
    );
}
