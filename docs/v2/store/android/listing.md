# Google Play listing (production)

Drafted 22 Oct 2026 for the founder's review. Built on `docs/v2/store-listing.md` (16 Oct) and the website copy
(`apps/site/src/content.ts`), brought up to date with the app as it is now (home tab Τουρνουά, Pro with the 7-day
store trial, 8,99€ / 69,99€ / founding 49,99€). The iOS package lives next to this folder (`docs/v2/store/`);
wording should stay the same on both stores.

Rules applied, and to keep when editing: Greek first; no betting words (στοίχημα, απόδοση, ποντάρω, κέρδη, bet,
odds, wager); no em dashes; «level», never «επίπεδο»; «Ladder» in English, «Κατάταξη» in Greek as the app says it;
no accents on Greek capitals. Play also asks for no ALL CAPS shouting, no emoji, no «#1» or «best» claims and no
price or promotion in the title, so the section heads below are in sentence case (the old draft used capitals).

## Store settings

| Field | Value |
|---|---|
| App name (default el-GR, 30) | NetProphet: Τένις (17) |
| App name (en-US, 30) | NetProphet: Tennis (18) |
| Default language | Ελληνικά, el-GR |
| Other language | English (United States), en-US |
| App or game | App |
| Category | Sports |
| Tags (pick up to 5 from Play's list) | Tennis; Sports news and scores; Trivia (the daily questions). Do not pick anything with «fantasy» or «betting». |
| Email | hello@monadlabs.gr |
| Website | https://netprophetapp.com |
| Phone | leave empty (optional on Play) |
| Privacy policy | https://netprophetapp.com/privacy |
| Account deletion (Data safety) | https://netprophetapp.com/delete-account (new in this PR) |
| Developer name shown | Monad Labs |

For the founder: the name says «Τένις» while the app is built multi-sport. When padel arrives the name can change in
an update (Play allows it); «NetProphet» alone is also fine but finds fewer «τένις» searches.

## Ελληνικά (el-GR, default)

**Σύντομη περιγραφή (80):** Ποιος παίζει σήμερα, ποιος κέρδισε χθες, ποιος είναι ο αντίπαλός σου. (70)

**Πλήρης περιγραφή (4000):**

```
Τα πάντα για το ερασιτεχνικό τένις, στο κινητό σου.

Ποιος παίζει σήμερα
Όλα τα σημερινά ματς των τουρνουά: ποιος παίζει, σε ποιο γήπεδο και τι ώρα. Ταμπλό και πρόγραμμα για κάθε τουρνουά, και οι δικοί σου πάντα πρώτοι.

Ποιος κέρδισε χθες
Τα αποτελέσματα με σκορ και ανατροπές, ανά μέρα και ανά τουρνουά, ενημερωμένα μόνα τους μέσα στη μέρα.

Ποιος είναι ο αντίπαλός σου
Η κάρτα του αντιπάλου σου: φόρμα, τελευταία ματς, τα μεταξύ σας και πώς παίζει.

Και ένα παιχνίδι για κάθε μέρα
Ψήφισε ποιος κερδίζει, μάθε αν το είπες σωστά και μάζεψε πόντους. Κράτα σερί, ανέβα level και μπες ψηλά στην Κατάταξη του μήνα. Χρήματα δεν παίζονται πουθενά: μόνο πόντοι και η τιμή σου.

Ακόμα
• Οι 6 ερωτήσεις της ημέρας.
• Φίλοι, αποστολές και badges.
• Ο Baller σου: ένα μπαλάκι με χαρακτήρα, που το ονομάζεις και το ντύνεις όπως θέλεις.
• Τα ματς σου: πέρασε ένα φιλικό ή ένα ματς τουρνουά και μπαίνει στο ιστορικό σου.

NetProphet Pro
Για όσους παίζουν τουρνουά: ειδοποίηση μόλις βγει η κλήρωση ή αλλάξει η ώρα του ματς σου, υπενθύμιση πριν το ματς, ο αντίπαλός σου με όλο του το ιστορικό, τα στατιστικά σου και η σεζόν σου. 8,99€ τον μήνα ή 69,99€ τον χρόνο, με 7 μέρες δωρεάν. Ακυρώνεις όποτε θες από το Google Play.
Το Pro δεν αγοράζει ποτέ πόντους ή θέση στην Κατάταξη. Τα ματς, τα αποτελέσματα και το παιχνίδι μένουν δωρεάν για όλους.

Οι ανήλικοι παίκτες δεν εμφανίζονται ποτέ στην εφαρμογή.

Μια εφαρμογή της Monad Labs. Ερωτήσεις: hello@monadlabs.gr
```

## English (en-US)

**Short description (80):** Who plays today, who won yesterday, who your opponent is. (57)

**Full description (4000):**

```
Everything about amateur tennis, on your phone.

Who plays today
All of today's tournament matches: who plays, on which court and when. Draws and schedules for every tournament, with your people always first.

Who won yesterday
Results with scores and upsets, by day and by tournament, updated on their own through the day.

Who is your opponent
Your opponent's card: form, recent matches, your head to head and how they play.

And a game for every day
Call who wins, find out if you were right and collect points. Keep your streak, go up a level and climb the month's Ladder. No money is played anywhere: just points and the glory.

Also
• The day's 6 questions.
• Friends, quests and badges.
• Your Baller: a ball with character that you name and dress up your way.
• Your matches: log a friendly or a tournament match and it joins your history.

NetProphet Pro
For tournament players: an alert the moment the draw is out or your match time changes, a reminder before your match, your opponent's whole history, your stats and your season. €8.99 a month or €69.99 a year, with 7 days free. Cancel any time in Google Play.
Pro never buys points or a place in the Ladder. Matches, results and the game stay free for everyone.

Minors are never shown in the app.

An app by Monad Labs. Questions: hello@monadlabs.gr
```

Before pasting: if the founding plan (49,99€ until 31/12) is live on Play at launch, add one line after the prices:
«Μέχρι 31/12, το ιδρυτικό πακέτο: 49,99€ τον πρώτο χρόνο.» / «Until 31 December, the founding plan: €49.99 for the
first year.» The website says «49,99€ τον χρόνο» without «πρώτο»; the founder's plan (17 Oct) says it renews at
69,99€. One of the two needs to change so the site, the stores and the Play offer say the same.

## Graphics

| Asset | Play spec | Status |
|---|---|---|
| App icon | 512 x 512 PNG, 32-bit, up to 1 MB | `icon-512.png` here, scaled from `apps/app/assets/icon.png` (1024) with `sips -Z 512`. Play adds its own mask and shadow: upload as is. |
| Feature graphic | 1024 x 500 PNG or JPEG, no alpha needed | `feature-graphic.png` (el, default) and `feature-graphic-en.png`. Ink background, the logo from `apps/site/public/logo-on-ink.svg`, the three questions in Sofia Sans Extra Condensed 800 and a line in Commissioner 600, faint court lines. No lime except the logo's ball. |
| Phone screenshots | 2 to 8, PNG or JPEG, each side 320 to 3840 px, the long side at most twice the short side; 9:16 at 1080 x 1920 or more is what Play promotes | Not made yet, see below. |
| 7" and 10" tablet screenshots | Optional; the app is phone only (`supportsTablet: false` on iOS) | Skip. |
| Promo video | Optional | Skip. |

How the feature graphic was made (to remake it after a copy change): a small HTML page per language with
`@font-face` pointing at the two TTFs in `node_modules/@expo-google-fonts/`, the logo SVG as an `<img>`, rendered by
headless Chrome: `"Google Chrome" --headless=new --hide-scrollbars --force-device-scale-factor=1
--window-size=1024,500 --screenshot=feature-graphic.png file://.../fg-el.html`.

### Phone screenshots

Shot list (same six as the iOS set, captions Greek first):

1. Σήμερα with «Οι δικοί σου» and today's tournaments. «Ποιος παίζει σήμερα;»
2. Αποτελέσματα with an upset. «Ποιος κέρδισε χθες;»
3. «Ο αντίπαλος πριν το ματς» (Pro). «Ποιος είναι ο αντίπαλός σου;»
4. A result card «Το είπες!» with points and σερί. «Ψήφισε, μάθε, ανέβα.»
5. Κατάταξη. «Ο μήνας σου απέναντι σε όσους ξέρεις.»
6. Εγώ with the Baller in gear. «Ο Baller σου.»

Reusing the iOS screenshots: only if they have no iOS status bar (no notch clock, no Dynamic Island) and no iOS-only
controls, and only after cropping or re-rendering to a ratio of 2:1 or less. A raw 6.9" iPhone capture is
1320 x 2868 (2.17:1) and Play rejects it. A marketing frame (caption on ink above a phone) at 1080 x 1920 or
1290 x 2294 works on both stores if the phone drawn is neutral.

Capturing on Android: this Mac has the AVD `Medium_Phone` (API 37, Play Store image, 1080 x 2400) under
`~/Library/Android/sdk`, but no installable build of the app to put on it. The only local Android artifact is the
production AAB from 21 Oct (version code 2), which needs a real sign-in, and a local Gradle build is not practical
here (no NDK, no Gradle cache, disk 94% full). What is missing, for the founder:
1. One cloud development build: `eas build -p android --profile development` (an APK; the sample-data guest exists
   only in `__DEV__` builds, `guestAllowed` in `src/lib/auth.tsx`, so a preview build would not have it).
2. Start Metro with `EXPO_PUBLIC_DEV_GUEST=1` (port 8085 as for the simulator), boot the AVD
   (`~/Library/Android/sdk/emulator/emulator -avd Medium_Phone`), `adb install` the APK, open it on
   `http://10.0.2.2:8085`, choose the guest, hide the dev menu bubble, walk the shot list,
   `adb exec-out screencap -p > shot.png`. Stop Metro and the emulator after.
3. The emulator screen is 1080 x 2400 (2.22:1): crop away the status and navigation bars to 1080 x 1920, or frame
   the shot with a caption on ink at 1080 x 1920.
