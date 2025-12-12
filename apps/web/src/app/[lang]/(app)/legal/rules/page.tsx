export default function RulesPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-10 text-white space-y-8">
            <header>
                <h1 className="text-3xl font-black mb-2">Οδηγός Παιχνιδιού NetProphet</h1>
                <p className="text-sm text-gray-300 font-semibold">Πώς παίζεται – Τι ισχύει – Τι πρέπει να γνωρίζεις</p>
            </header>

            <section className="space-y-3 text-sm text-gray-100">
                <p>
                    Ο παρών οδηγός περιγράφει με απλό και κατανοητό τρόπο πώς λειτουργεί το παιχνίδι προβλέψεων NetProphet, ποιες είναι οι βασικές αρχές του παιχνιδιού και ποιες επιλογές έχει ο Παίκτης.
                </p>
                <p className="font-semibold text-yellow-300">
                    Το NetProphet δεν αποτελεί πλατφόρμα στοιχήματος και δεν σχετίζεται με χρηματικά κέρδη. Όλες οι ανταμοιβές είναι εικονικές και χρησιμοποιούνται αποκλειστικά μέσα στο παιχνίδι.
                </p>
            </section>

            <section className="space-y-3 text-sm text-gray-100">
                <h2 className="text-xl font-bold">1. Στόχος του Παιχνιδιού</h2>
                <p>
                    Ο στόχος του NetProphet είναι να προβλέπεις σωστά τα αποτελέσματα ερασιτεχνικών αθλητικών γεγονότων και να κερδίζεις Νομίσματα, πόντους και επιβραβεύσεις μέσα στο παιχνίδι.
                </p>
                <p className="font-semibold">Με τα Νομίσματα μπορείς:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>να συμμετέχεις σε νέες προβλέψεις</li>
                    <li>να αποκτάς power-ups (βλ. Παρ.7)</li>
                    <li>να ανεβαίνεις επίπεδα</li>
                    <li>να ενισχύεις την παρουσία σου στο leaderboard</li>
                </ul>
                <p className="font-semibold text-yellow-300">Τα Νομίσματα δεν έχουν πραγματική χρηματική αξία.</p>
            </section>

            <section className="space-y-3 text-sm text-gray-100">
                <h2 className="text-xl font-bold">2. 🏆 Τύποι Αγώνων και Διοργανώσεων</h2>
                <p>Το NetProphet φιλοξενεί αγώνες από:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Ερασιτεχνικές αθλητικές διοργανώσεις</li>
                    <li>Ομίλους ή οργανισμούς που έχουν συμφωνήσει συνεργασία με το NetProphet</li>
                    <li>Αθλητές και ομάδες που έχουν δώσει άδεια εμφάνισης των στοιχείων τους</li>
                </ul>
                <p className="font-semibold">Κάθε αγώνας εμφανίζεται με:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>τα ονόματα των αθλητών/ομάδων</li>
                    <li>την κατηγορία</li>
                    <li>την ημερομηνία και ώρα</li>
                    <li>το format του αγώνα</li>
                    <li>τις εικονικές αποδόσεις (με βάση τον αλγόριθμο)</li>
                </ul>
            </section>

            <section className="space-y-3 text-sm text-gray-100">
                <h2 className="text-xl font-bold">3. Πώς κάνω Πρόβλεψη;</h2>
                <p>Για κάθε διαθέσιμο αγώνα, ο Παίκτης μπορεί να προβλέψει:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Νικητή αγώνα</li>
                    <li>Σκορ (όπου υπάρχει)</li>
                    <li>Ειδικές προβλέψεις (πχ. Εξέλιξη του αγώνα)</li>
                </ul>
                <p>
                    Κάθε πρόβλεψη απαιτεί συγκεκριμένο αριθμό νομισμάτων («κόστος συμμετοχής»). Το κόστος μπορεί να διαφέρει ανάλογα με:
                </p>
                <ul className="list-disc list-inside space-y-1">
                    <li>τη δημοφιλία του αγώνα</li>
                    <li>το επίπεδο δυσκολίας</li>
                    <li>την κατηγορία του αθλήματος</li>
                    <li>ειδικά events ή challenges</li>
                </ul>
            </section>

            <section className="space-y-3 text-sm text-gray-100">
                <h2 className="text-xl font-bold">4. 💰 Νομίσματα (In-Game Currency)</h2>
                <p className="font-semibold">Τα Νομίσματα είναι η κύρια in-game μονάδα του NetProphet.</p>
                <p className="font-semibold">Χρησιμοποιούνται σε:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>προβλέψεις</li>
                    <li>power-ups</li>
                    <li>συμμετοχή σε challenges</li>
                    <li>αλλαγές στο προφίλ ή cosmetic items (μελλοντική επιλογή)</li>
                </ul>
                <p className="font-semibold">Πώς κερδίζεις Νομίσματα</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Με σωστές προβλέψεις</li>
                    <li>Με streaks επιτυχιών</li>
                    <li>Με ολοκλήρωση challenges</li>
                    <li>Από τη δραστηριότητα στο leaderboard</li>
                    <li>Με power-ups</li>
                    <li>Με αγορά coin packs (προαιρετικά)</li>
                </ul>
                <p className="font-semibold text-yellow-300">
                    Η εγγραφή και η συμμετοχή στο παιχνίδι είναι εντελώς δωρεάν και δεν απαιτείται καμία αγορά ή άλλη καταβολή χρημάτων.
                </p>
                <p className="font-semibold text-yellow-300">
                    Τα Νομίσματα δεν έχουν πραγματική οικονομική αξία και δεν ανταλλάσσονται με χρήματα.
                </p>
            </section>

            <section className="space-y-3 text-sm text-gray-100">
                <h2 className="text-xl font-bold">5. 📊 Εικονικές Αποδόσεις (Virtual Odds)</h2>
                <p>Οι αποδόσεις που βλέπεις είναι εικονικές και παράγονται από τον αλγόριθμο του NetProphet.</p>
                <p className="font-semibold">Οι αποδόσεις:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>βασίζονται σε στατιστικά, ιστορικά δεδομένα και performance indicators</li>
                    <li>καθορίζουν τα εικονικά κέρδη σε περίπτωση σωστής πρόβλεψης</li>
                    <li>δεν έχουν σχέση με πραγματικές στοιχηματικές αποδόσεις</li>
                </ul>
                <p>Οι αποδόσεις μπορεί να τροποποιηθούν σε περίπτωση τεχνικού λάθους ή νέων δεδομένων.</p>
            </section>

            <section className="space-y-3 text-sm text-gray-100">
                <h2 className="text-xl font-bold">6. 🎁 Ανταμοιβές & Συστήματα Πόντων</h2>
                <p>Κάθε σωστή πρόβλεψη μπορεί να αποφέρει:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Νομίσματα</li>
                    <li>Πόντους Leaderboard</li>
                    <li>Streak multipliers</li>
                    <li>Εικονικά badges</li>
                    <li>Δώρα εντός παιχνιδιού</li>
                </ul>
                <p className="font-semibold">Οι ανταμοιβές διαμορφώνονται δυναμικά ανάλογα με:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>την απόδοση του αγώνα</li>
                    <li>τη δυσκολία</li>
                    <li>το στάδιο της διοργάνωσης</li>
                    <li>τυχόν power-ups που χρησιμοποιήθηκαν</li>
                </ul>
            </section>

            <section className="space-y-3 text-sm text-gray-100">
                <h2 className="text-xl font-bold">7. ⚡ Power-Ups</h2>
                <p>Ο παίκτης μπορεί να ενεργοποιεί ειδικές δυνατότητες που ενισχύουν το παιχνίδι του:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li><strong>Safe Slip</strong> – επιτρέπει 1 λάθος σε απλή πρόβλεψη</li>
                    <li><strong>Safe Parlay Slip</strong> – επιτρέπει 1 λάθος σε συνδυαστική πρόβλεψη</li>
                    <li><strong>Streak Multiplier</strong> – πολλαπλασιάζει τους πόντους από streaks</li>
                    <li><strong>Double XP Match</strong> – διπλασιάζει τους πόντους ενός αγώνα</li>
                    <li><strong>Prediction Insurance</strong> – 50% επιστροφή νομισμάτων σε χαμένη πρόβλεψη</li>
                </ul>
                <p className="font-semibold text-yellow-300">
                    Τα Power-ups είναι εικονικά αντικείμενα, δεν έχουν χρηματική αξία και δεν μεταφέρονται σε άλλον λογαριασμό.
                </p>
            </section>

            <section className="space-y-3 text-sm text-gray-100">
                <h2 className="text-xl font-bold">8. Leaderboard & Πόντοι</h2>
                <p>Το leaderboard ανανεώνεται συνεχώς και κατατάσσει τους παίκτες με βάση:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>συνολικούς πόντους</li>
                    <li>streaks</li>
                    <li>ποσοστό επιτυχίας</li>
                    <li>δραστηριότητα ανά διοργάνωση</li>
                </ul>
                <p className="font-semibold text-yellow-300">
                    Οι κατατάξεις είναι καθαρά αγωνιστικού χαρακτήρα και δεν συνδέονται με πραγματικές ανταμοιβές χρηματικής φύσης.
                </p>
            </section>

            <section className="space-y-3 text-sm text-gray-100">
                <h2 className="text-xl font-bold">9. Ακύρωση Αγώνων ή Προβλέψεων</h2>
                <p className="font-semibold">Ένας αγώνας μπορεί να ακυρωθεί:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>αν αλλάξει το πρόγραμμα</li>
                    <li>αν υπάρχουν σοβαρά προβλήματα εγκυρότητας ονομάτων/αποτελεσμάτων</li>
                    <li>λόγω τεχνικού λάθους εισαγωγής δεδομένων</li>
                </ul>
                <p className="font-semibold">Σε ακύρωση αγώνα:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>η πρόβλεψη ακυρώνεται</li>
                    <li>τα Νομίσματα συμμετοχής επιστρέφονται</li>
                    <li>δεν υπολογίζεται ως κερδισμένη ή χαμένη προσπάθεια</li>
                </ul>
            </section>

            <section className="space-y-3 text-sm text-gray-100">
                <h2 className="text-xl font-bold">10. Προφίλ Παίκτη & Δεδομένα</h2>
                <p>Ο παίκτης μπορεί να δει μέσα από το προφίλ του:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>ιστορικό προβλέψεων</li>
                    <li>κερδισμένα/χαμένα νομίσματα</li>
                    <li>ενεργά power-ups</li>
                    <li>κατάταξη leaderboard</li>
                    <li>επίπεδο δραστηριότητας</li>
                    <li>ρυθμίσεις ειδοποιήσεων</li>
                </ul>
                <p>Όλες οι πληροφορίες εμφανίζονται αποκλειστικά για προσωπική χρήση.</p>
            </section>

            <section className="space-y-3 text-sm text-gray-100">
                <h2 className="text-xl font-bold">11. Τεχνικά Θέματα & Ασφαλής Χρήση</h2>
                <p>Το NetProphet χρησιμοποιεί:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>cookies για λειτουργικούς σκοπούς</li>
                    <li>ασφαλείς μεθόδους ταυτοποίησης</li>
                    <li>συστήματα αποτροπής κατάχρησης</li>
                </ul>
                <p className="font-semibold">Σε περίπτωση ύποπτης συμπεριφοράς ή παραβίασης των κανόνων, η πλατφόρμα έχει δικαίωμα:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>προσωρινής ή μόνιμης ανάκλησης πρόσβασης</li>
                    <li>απενεργοποίησης power-ups</li>
                    <li>επανεξέτασης προβλέψεων</li>
                    <li>διαγραφής λογαριασμού</li>
                </ul>
            </section>

            <section className="space-y-3 text-sm text-gray-100">
                <h2 className="text-xl font-bold">12. Τι δεν είναι το NetProphet</h2>
                <ul className="list-disc list-inside space-y-1">
                    <li>Δεν είναι στοίχημα</li>
                    <li>Δεν προσφέρει χρηματικά έπαθλα</li>
                    <li>Δεν παρέχει οικονομικές συναλλαγές πέρα από coin packs</li>
                    <li>Δεν επιτρέπει μεταφορά νομισμάτων σε τρίτους ή άλλη οικονομική συναλλαγή μεταξύ των χρηστών</li>
                    <li>Δεν επιτρέπει πραγματική αγοραπωλησία δεδομένων ή αποτελεσμάτων</li>
                    <li>Είναι καθαρά ένα αγωνιστικό παιχνίδι γνώσης και προβλέψεων.</li>
                </ul>
            </section>
        </div>
    );
}
