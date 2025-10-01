-- Update the Greek profile activated template with formatting fixes

UPDATE email_templates
SET 
    text_content = 'ΤΟ ΠΡΟΦΙΛ ΠΑΙΚΤΗ ΣΟΥ ΕΙΝΑΙ ΠΛΕΟΝ ΕΝΕΡΓΟ! 🎾

Γεια σου {{user_name}},

Υπέροχα νέα! Το προφίλ παίκτη σου δημιουργήθηκε και ενεργοποιήθηκε από την ομάδα μας. Μπορείς πλέον να συμμετέχεις σε αγώνες και τουρνουά!

ΤΟ ΠΡΟΦΙΛ ΠΑΙΚΤΗ ΣΟΥ:
- Όνομα Παίκτη: {{player_first_name}} {{player_last_name}}
- Κατάσταση: Ενεργό ✅

ΤΙ ΑΚΟΛΟΥΘΕΙ;
• Δες το προφίλ παίκτη και τα στατιστικά σου
• Συμμετοχή σε επερχόμενους αγώνες
• Παρακολούθησε την απόδοσή σου
• Διαγωνίσου σε τουρνουά

Δες το προφίλ σου: https://netprophetapp.com/{{language}}/players/{{player_id}}
Περιήγηση αγώνων: https://netprophetapp.com/{{language}}/matches

---
Καλώς ήρθες στο NetProphet! 🎾
Αν έχεις οποιεσδήποτε ερωτήσεις, επικοινώνησε με την ομάδα υποστήριξης.',
    updated_at = NOW()
WHERE type = 'profile_activated'
    AND language = 'el';

