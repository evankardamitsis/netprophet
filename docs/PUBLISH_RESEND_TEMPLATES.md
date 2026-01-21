# Publish Resend Templates and Deploy Edge Functions

Step-by-step guide to publish templates in Resend and configure Edge Functions.

## Step 1: Run the Sync Script to Get Template IDs

First, run the sync script to create/update all templates in Resend:

```bash
npx tsx scripts/sync-email-templates-to-resend.ts
```

At the end, you'll see output like:

```json
--- RESEND_TEMPLATE_IDS (set as Edge Function secret) ---

{
  "admin_alert_en": "21614469-0f3f-4a9e-9fe8-5c427ad5fd80",
  "prediction_result_lost_el": "e7df5477-1b0b-473d-982e-3ce1b0079c6e",
  ...
}
```

**Copy this entire JSON object** - you'll need it in Step 3.

## Step 2: Publish Templates in Resend Dashboard

1. Go to [Resend Dashboard → Templates](https://resend.com/templates)
2. For each template that was created/updated:
   - Click on the template name
   - Click the **"Publish"** button (or **"Publish Version"** if it's an update)
   - Confirm the publish action

**Important:** Templates must be published before they can be used. Unpublished templates will cause email sending to fail.

### Quick Check: Verify All Templates Are Published

In the Resend dashboard, you should see a green "Published" badge or status for each template. If you see "Draft", click "Publish".

## Step 3: Set RESEND_TEMPLATE_IDS Secret in Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to: **Project Settings** → **Edge Functions** → **Secrets** (or **Settings** → **Edge Functions** → **Secrets**)
3. Click **"Add new secret"** or **"New secret"**
4. Set:
   - **Name:** `RESEND_TEMPLATE_IDS`
   - **Value:** Paste the JSON object from Step 1 (the entire `{...}` object)

   Example:
   ```json
   {"admin_alert_en":"21614469-0f3f-4a9e-9fe8-5c427ad5fd80","prediction_result_lost_el":"e7df5477-1b0b-473d-982e-3ce1b0079c6e","prediction_result_lost_en":"30f8001a-4940-4ecf-bd01-2569883c0861",...}
   ```

5. Click **"Save"** or **"Add secret"**

**Note:** The value must be valid JSON. Make sure there are no extra spaces or line breaks if you're pasting it.

## Step 4: Deploy Edge Functions

From your project root directory, deploy both Edge Functions:

```bash
# Deploy process-user-emails
supabase functions deploy process-user-emails

# Deploy process-admin-notifications
supabase functions deploy process-admin-notifications
```

**Alternative:** If you're using the Supabase CLI with a linked project:

```bash
supabase functions deploy process-user-emails --project-ref your-project-ref
supabase functions deploy process-admin-notifications --project-ref your-project-ref
```

## Step 5: Verify Deployment

After deployment, test that emails are working:

1. **Test a user email** (e.g., trigger a welcome email or prediction result)
2. **Test an admin email** (e.g., trigger a new user signup notification)
3. Check `email_logs` table in Supabase:
   ```sql
   SELECT id, to_email, template, language, status, error_message, sent_at
   FROM email_logs
   ORDER BY sent_at DESC NULLS LAST, id DESC
   LIMIT 10;
   ```
4. Verify `status` is `sent` and `error_message` is `NULL`

## Step 0: Clean Up Unused Templates (Optional)

Before setting up the secrets, you may want to clean up unused templates:

1. **Identify unused templates:**
   - Check which templates exist in Resend dashboard
   - Compare with templates actually used in your codebase (see list below)
   - Templates that are NOT in the list below can be safely deleted

2. **Templates currently used in the codebase:**
   - `admin_alert_en` - Admin notifications (new users, etc.)
   - `welcome_email_en`, `welcome_email_el` - Welcome emails for new users
   - `prediction_result_won_en`, `prediction_result_won_el` - Prediction win notifications
   - `prediction_result_lost_en`, `prediction_result_lost_el` - Prediction loss notifications
   - `profile_creation_request_en` - Admin notification for profile creation requests
   - `profile_claim_confirmation_en`, `profile_claim_confirmation_el` - User confirmation when claiming profile
   - `profile_creation_confirmation_en`, `profile_creation_confirmation_el` - User confirmation when creating profile
   - `profile_activated_en`, `profile_activated_el` - User notification when profile is activated
   - `winnings_en`, `winnings_el` - Winnings notifications (if used)
   - `promotional_en`, `promotional_el` - Promotional emails (if used)

3. **Delete unused templates from Resend:**
   - Go to [Resend Dashboard → Templates](https://resend.com/templates)
   - Delete any templates that are NOT in the list above
   - **Note:** You can also delete them via the sync script if you prefer

4. **When running the sync script:**
   - Only templates that exist in your `email_templates` table (with `is_active = true`) will be synced
   - Unused templates won't be included in the `RESEND_TEMPLATE_IDS` output

**Important:** If you delete a template from Resend, make sure it's also not in your `email_templates` table, or the sync script will try to recreate it.

## Troubleshooting

### Error: "Resend template not configured: X_Y"

- **Cause:** Template ID missing from `RESEND_TEMPLATE_IDS` or template not published
- **Fix:** 
  1. Check that the template exists in Resend dashboard
  2. Verify it's published (not in draft)
  3. Add the template ID to `RESEND_TEMPLATE_IDS` secret
  4. Redeploy the Edge Function (secrets are read at cold start)

### Error: "Template not found" or "Template ID invalid"

- **Cause:** Template ID is incorrect or template was deleted
- **Fix:**
  1. Run the sync script again to get correct template IDs
  2. Update `RESEND_TEMPLATE_IDS` with the new IDs
  3. Redeploy Edge Functions

### Emails Still Using Old Templates

- **Cause:** Edge Functions might be using cached secrets or old code
- **Fix:**
  1. Wait a few minutes (secrets are cached)
  2. Redeploy Edge Functions to force a refresh
  3. Check Edge Function logs in Supabase dashboard

## Next Steps

Once everything is working:

1. ✅ Monitor `email_logs` for any failures
2. ✅ Test all email types (welcome, prediction results, admin alerts, etc.)
3. ✅ (Optional) Deprecate the `email_templates` table after confirming everything works

---

**See also:**
- `docs/MIGRATION_RESEND_TEMPLATES.md` - Full migration guide
- `docs/TRANSACTIONAL_EMAIL_THIRD_PARTY_TEMPLATES.md` - Background and rationale
