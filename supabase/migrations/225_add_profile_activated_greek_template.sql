-- Add Greek version of profile activated email template

DELETE FROM email_templates 
WHERE type = 'profile_activated' AND language = 'el';

INSERT INTO email_templates
    (name, type, language, subject, html_content, text_content, variables, is_active)
VALUES
    (
        'Player Profile Activated - User Notification (Greek)',
        'profile_activated',
        'el',
        'Το Προφίλ Παίκτη σου είναι Ενεργό! 🎾',
        '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ενεργοποίηση Προφίλ</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Το Προφίλ Παίκτη σου είναι Ενεργό!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Μπορείς τώρα να συμμετέχεις σε αγώνες</p>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <div style="background: white; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h2 style="margin-top: 0; color: #059669;">✅ Το Προφίλ Δημιουργήθηκε Επιτυχώς</h2>
                <p style="margin: 10px 0; font-size: 16px;">Γεια σου <strong>{{user_name}}</strong>,</p>
                <p style="margin: 10px 0;">Υπέροχα νέα! Το προφίλ παίκτη σου δημιουργήθηκε και ενεργοποιήθηκε από την ομάδα μας. Μπορείς πλέον να συμμετέχεις σε αγώνες και τουρνουά!</p>
            </div>
            
            <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #495057;">🎾 Το Προφίλ Παίκτη σου</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Όνομα Παίκτη:</td>
                        <td style="padding: 8px 0; font-size: 18px; font-weight: bold;">{{player_first_name}} {{player_last_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Κατάσταση:</td>
                        <td style="padding: 8px 0;"><span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: bold;">Ενεργό</span></td>
                    </tr>
                </table>
            </div>
            
            <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #1e40af;">🚀 Τι Ακολουθεί;</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1e3a8a;">
                    <li style="margin-bottom: 10px;">Δες το προφίλ παίκτη και τα στατιστικά σου</li>
                    <li style="margin-bottom: 10px;">Συμμετέχε σε επερχόμενους αγώνες</li>
                    <li style="margin-bottom: 10px;">Παρακολούθησε την απόδοσή σου</li>
                    <li style="margin-bottom: 10px;">Διαγωνίσου σε τουρνουά</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="https://netprophetapp.com/{{language}}/players/{{player_id}}" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; margin-bottom: 10px;">
                    Δες το Προφίλ Παίκτη μου →
                </a>
                <br>
                <a href="https://netprophetapp.com/{{language}}/matches" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Περιήγηση Αγώνων →
                </a>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px;">
                <p>Καλώς ήρθες στο NetProphet! 🎾</p>
                <p style="font-size: 12px; margin: 5px 0;">Αν έχεις οποιεσδήποτε ερωτήσεις, επικοινώνησε με την ομάδα υποστήριξης.</p>
            </div>
        </div>
    </div>
</body>
</html>',
        'ΤΟ ΠΡΟΦΙΛ ΠΑΙΚΤΗ ΣΟΥ ΕΙΝΑΙ ΠΛΕΟΝ ΕΝΕΡΓΟ! 🎾

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
        '{
        "user_name": "",
        "player_first_name": "",
        "player_last_name": "",
        "player_id": "",
        "language": "el"
    }'
::jsonb,
    true
);

