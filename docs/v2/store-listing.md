# Store listing (App Store and Google Play)

> **iOS 1.0 (22 Oct 2026):** the App Store texts, screenshots and checklist are in `docs/v2/store/`; that folder wins over this draft for Apple. This file stays as the Google Play draft and the history. The «Before submitting» list below is out of date (deletion is built, restore and subscription terms were added).

Drafted 16 Oct 2026 for the founder's review. Greek first, then English. No betting words anywhere (Apple and Google
both read «prediction» apps closely; see implementation-plan §12). Category **Sports**, age rating **12+** (Apple)
and **Everyone 10+ / PEGI 12** equivalent on Play, because players see other people's names and can react to results.

Seller: **Monad Labs**. App ID: `gr.monadlabs.netprophet`. Support URL: `https://netprophetapp.com/support`.
Privacy policy URL: `https://netprophetapp.com/privacy`. Marketing URL: `https://netprophetapp.com`.

## Ελληνικά

**Όνομα (30):** NetProphet: Τένις

**Υπότιτλος, App Store (30):** Ποιος παίζει, ποιος κέρδισε

**Σύντομη περιγραφή, Play (80):** Ποιος παίζει σήμερα, ποιος κέρδισε χθες, ποιος είναι ο αντίπαλός σου.

**Περιγραφή:**

Τα πάντα για το ερασιτεχνικό τένις, στο κινητό σου.

ΠΟΙΟΣ ΠΑΙΖΕΙ ΣΗΜΕΡΑ
Όλα τα σημερινά ματς των τουρνουά της περιοχής σου: ποιος παίζει, πού και τι ώρα. Το δικό σου ματς πάντα πρώτο.

ΠΟΙΟΣ ΚΕΡΔΙΣΕ ΧΘΕΣ
Τα αποτελέσματα με σκορ, ανατροπές και τι έλεγε η κερκίδα, ενημερωμένα μόνα τους τρεις φορές τη μέρα.

ΠΟΙΟΣ ΕΙΝΑΙ Ο ΑΝΤΙΠΑΛΟΣ ΣΟΥ
Η κάρτα του αντιπάλου σου: φόρμα, τελευταία ματς, τα μεταξύ σας και πώς παίζει.

ΚΑΙ ΕΝΑ ΠΑΙΧΝΙΔΙ ΓΙΑ ΚΑΘΕ ΜΕΡΑ
Ψήφισε ποιος κερδίζει, μάθε απόψε αν το είπες σωστά και μάζεψε πόντους. Κράτα σερί, ανέβα level και μπες ψηλά στην Κατάταξη του μήνα. Χωρίς χρήματα, μόνο για την τιμή.

Ακόμα: τουρνουά και κληρώσεις, οι 6 ερωτήσεις της ημέρας, φίλοι, αποστολές και badges, και ο παίκτης σου, ένα μπαλάκι με χαρακτήρα που ντύνεις όπως θέλεις.

NETPROPHET PRO
Ειδοποιήσεις για τα τουρνουά σου, τις κληρώσεις και τα ματς σου, υπενθύμιση πριν το ματς, η κάρτα του αντιπάλου και τα στατιστικά σου. Όλα τα υπόλοιπα είναι δωρεάν.

**Λέξεις κλειδιά, App Store (100, με κόμματα):** τένις,τουρνουά,αποτελέσματα,ερασιτεχνικό,πρόγραμμα,κλήρωση,σκορ,αντίπαλος,κατάταξη,πάντελ

## English

**Name (30):** NetProphet: Tennis

**Subtitle, App Store (30):** Who plays, who won

**Short description, Play (80):** Who plays today, who won yesterday, who your opponent is.

**Description:**

Everything about amateur tennis, on your phone.

WHO PLAYS TODAY
All of today's matches in the tournaments near you: who plays, where and when. Your own match always first.

WHO WON YESTERDAY
Results with scores, upsets and what the crowd said, updated on their own three times a day.

WHO IS YOUR OPPONENT
Your opponent's card: form, recent matches, your head to head and how they play.

AND A GAME FOR EVERY DAY
Call who wins, find out tonight if you were right and collect points. Keep your streak, go up a level and climb the month's Ladder. No money, just the glory.

Also: tournaments and draws, the day's 6 questions, friends, quests and badges, and your player, a ball with character you dress up your way.

NETPROPHET PRO
Alerts for your tournaments, draws and matches, a reminder before your match, the opponent card and your stats. Everything else is free.

**Keywords, App Store (100, commas):** tennis,tournament,results,amateur,schedule,draw,score,opponent,ladder,padel

## Screenshots to make (6.7" iPhone and Play phone)

1. Σήμερα with «Το ματς σου» on top. Caption: «Ποιος παίζει σήμερα;»
2. Αποτελέσματα with an upset. Caption: «Ποιος κέρδισε χθες;»
3. The opponent card (Pro). Caption: «Ποιος είναι ο αντίπαλός σου;»
4. A result card «Το είπες! +10 · σερί 4». Caption: «Ψήφισε, μάθε απόψε, ανέβα.»
5. Κατάταξη. Caption: «Ο μήνας σου απέναντι σε όσους ξέρεις.»
6. Εγώ with the ball person in gear. Caption: «Ο παίκτης σου.»

## Before submitting

- In-app account deletion (Apple guideline 5.1.1(v)): not built yet. Required for App Store review.
- Sign in with Apple is offered next to Google (guideline 4.8): already in the app.
- Report and block on user content (guideline 1.2): in the app since M2.
- Subscription terms on the Pro screen (price, period, auto-renewal, links to terms and privacy) once the payment
  provider is chosen.

## Updates of 22 Oct 2026 (founder decisions, apply to the App Store too)

- Version **1.0.0** (build numbers stay with EAS).
- Terms of use: https://netprophetapp.com/terms (English /en/terms). Put it in the App Store description footer and in
  App Store Connect › App Information › License Agreement (custom EULA link), or keep Apple's standard EULA and still
  link ours on the Pro screen (it is linked there, next to the privacy policy).
- Countries and regions: all.
- Age rating: answer Apple's questionnaire for the real content (infrequent user-generated content, no gambling, no
  real-money contests, no unrestricted web access). Not 4+. The app only lets in people of 15 and over; do not pick the
  Kids category.
- Ads: the app shows in-app sponsored banners (our own, no ad SDK, no tracking). In App Privacy nothing changes. If
  the questionnaire asks about third-party advertising, the answer is no.
- Subscription terms on the Pro screen: price, period, auto-renewal, the 7-day trial, the founding plan (49,99€ the
  first year, then 69,99€ a year, until 31/12/2026) and links to the terms and the privacy policy are now in place.
