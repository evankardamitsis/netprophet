# Supabase Email Templates Setup

## 🎯 Overview

This guide shows how to customize Supabase authentication emails to match NetProphet branding.

## 📧 Email Templates to Update

Supabase provides several authentication email templates that can be customized:

1. **Confirm signup** - Sent when users register (most important)
2. **Invite user** - Admin invitations
3. **Magic Link** - Passwordless login
4. **Change Email Address** - Email change confirmation
5. **Reset Password** - Password reset emails

## 🎨 Customizing the Confirm Signup Email

### Step 1: Access Email Templates

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/mgojbigzulgkjomgirrm)
2. Navigate to **Authentication** → **Email Templates**
3. Find **"Confirm signup"** template

### Step 2: Replace the Template

Replace the default template with the branded version from `SUPABASE_CONFIRM_EMAIL_TEMPLATE.html`

### Available Variables

Supabase provides these variables for the confirmation email:

- `{{ .ConfirmationURL }}` - The confirmation link
- `{{ .Token }}` - The confirmation token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address

### Design Features

Our custom template includes:

✅ **NetProphet branding** - Styled text logo (no external images)
✅ **Email-client safe logo** - Gradient div with text, always displays
✅ **Dark gradient background** - Matches app theme
✅ **Large CTA button** - "Επιβεβαίωση Email" in Greek
✅ **Link fallback** - Copy-paste option if button fails
✅ **Responsive design** - Works on mobile
✅ **Professional styling** - Glass morphism effects
✅ **Security note** - "Ignore if you didn't create this account"

### Logo Solution

Instead of using an external image (which email clients often block), we use a **styled div with text**:

```html
<div
  style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 12px; padding: 12px 24px;"
>
  <span style="color: white; font-weight: bold; font-size: 24px;"
    >NetProphet</span
  >
</div>
```

This ensures the logo **always displays**, even when images are blocked. ✅

## 🌍 Language Considerations

The template is currently in **Greek** by default (matching your app's default language).

### To add English version:

Supabase doesn't support multiple language templates directly, but you can:

**Option A:** Use English as default and add Greek as alternate
**Option B:** Create separate projects for EN/EL (not recommended)
**Option C:** Keep Greek (since most users are Greek)

**Recommendation:** Keep Greek as default since that's your primary market.

## 🔧 Reset Password Email Template

The reset password template is available in `SUPABASE_RESET_PASSWORD_EMAIL_TEMPLATE.html`

### To Apply:

1. Go to **Authentication** → **Email Templates** → **Reset Password**
2. Copy the HTML from `SUPABASE_RESET_PASSWORD_EMAIL_TEMPLATE.html`
3. Paste it in the **Message Body** field
4. **Subject line**: `🔐 Επαναφορά Κωδικού - NetProphet`
5. Click **Save**

### Features:

- ✅ Styled text logo (always displays)
- ✅ Security warning: "Link expires in 1 hour"
- ✅ Orange warning box for security notice
- ✅ Same NetProphet branding
- ✅ CTA button: "🔐 Επαναφορά Κωδικού"
- ✅ Link fallback

---

## 🔧 Other Email Templates (Optional)

### Magic Link Template Example

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Επαναφορά Κωδικού</title>
  </head>
  <body
    style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
  >
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <img
          src="https://netprophetapp.com/net-prophet-logo-with-icon.svg"
          alt="NetProphet"
          style="height: 60px; width: auto;"
        />
        <h1
          style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 20px 0 0 0;"
        >
          Επαναφορά Κωδικού
        </h1>
      </div>

      <div
        style="background: rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 40px; border: 1px solid rgba(255, 255, 255, 0.1);"
      >
        <p
          style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;"
        >
          Έλαβες αυτό το email γιατί ζήτησες επαναφορά του κωδικού σου στο
          NetProphet.
        </p>

        <div style="text-align: center; margin: 40px 0;">
          <a
            href="{{ .ConfirmationURL }}"
            style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 12px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);"
          >
            🔐 Επαναφορά Κωδικού
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 14px; margin: 30px 0 0 0;">
          Αν δεν ζήτησες αυτή την επαναφορά, αγνόησε αυτό το email.
        </p>

        <div
          style="margin-top: 20px; padding: 15px; background: rgba(59, 130, 246, 0.1); border-radius: 8px;"
        >
          <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0;">
            Εναλλακτικά, αντίγραψε αυτό το link:
          </p>
          <p
            style="color: #3b82f6; font-size: 12px; margin: 0; word-break: break-all;"
          >
            {{ .ConfirmationURL }}
          </p>
        </div>
      </div>

      <div
        style="text-align: center; color: #94a3b8; font-size: 14px; margin-top: 30px;"
      >
        <a
          href="https://netprophetapp.com"
          style="color: #3b82f6; text-decoration: none;"
          >netprophetapp.com</a
        >
      </div>
    </div>
  </body>
</html>
```

### Magic Link Template

Use similar styling with:

- Heading: "Σύνδεση στο NetProphet"
- Button text: "🔗 Σύνδεση"
- Variable: `{{ .ConfirmationURL }}`

## 📝 Instructions

1. Copy the HTML from `SUPABASE_CONFIRM_EMAIL_TEMPLATE.html`
2. Go to **Authentication** → **Email Templates** → **Confirm signup**
3. Paste the HTML in the **Message Body** field
4. **Subject line** (update this too):
   ```
   🎾 Επιβεβαίωση Email - NetProphet
   ```
5. Click **Save**
6. Test by registering a new account

## 🧪 Testing

After updating the template:

1. Register a test account
2. Check email (should arrive within seconds)
3. Verify the styling matches NetProphet branding
4. Click the confirmation button
5. Ensure you're redirected to the app

## ✅ Checklist

- [ ] Update "Confirm signup" template
- [ ] Update subject line to Greek
- [ ] Test with a real email
- [ ] Optionally update "Reset Password" template
- [ ] Optionally update "Magic Link" template

Your authentication emails will now match your brand! 🎨
