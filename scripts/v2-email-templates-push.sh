#!/usr/bin/env bash
# Push only the sign-in code emails (subject + HTML) to the hosted v2 project through the Supabase Management API.
# Nothing else changes (SMTP, URLs, code length stay as scripts/v2-project-settings.sh set them). Run it yourself.
#
#   SUPABASE_ACCESS_TOKEN  personal access token (supabase.com/dashboard/account/tokens); read from .env.local if unset
#
# The templates are generated from apps/admin/src/lib/v2/emailLayout.ts:
#   UPDATE_EMAIL_TEMPLATES=1 pnpm --filter @netprophet/admin test emailTemplates
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="mssedfnhcozeifgflkaq"
API="https://api.supabase.com/v1/projects/$REF"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  SUPABASE_ACCESS_TOKEN="$(grep '^SUPABASE_ACCESS_TOKEN=' "$ROOT/.env.local" | cut -d= -f2- | tr -d '"')"
fi
[[ -n "$SUPABASE_ACCESS_TOKEN" ]] || { echo "set SUPABASE_ACCESS_TOKEN" >&2; exit 1; }
auth=(-H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json")

BODY="${TMPDIR:-/tmp}/np-v2-email-templates.json"
trap 'rm -f "$BODY"' EXIT
python3 - "$ROOT/supabase-v2/templates" <<'PY' > "$BODY"
import json, os, sys
t = sys.argv[1]
subject = "Ο κωδικός σου για το NetProphet"
print(json.dumps({
    "mailer_subjects_confirmation": subject,
    "mailer_subjects_magic_link": subject,
    "mailer_templates_confirmation_content": open(os.path.join(t, "confirmation.html"), encoding="utf-8").read(),
    "mailer_templates_magic_link_content": open(os.path.join(t, "magic_link.html"), encoding="utf-8").read(),
}, ensure_ascii=False))
PY

echo "Auth emails: subjects and templates"
curl -sf -X PATCH "$API/config/auth" "${auth[@]}" --data-binary @"$BODY" >/dev/null

echo "Check"
curl -sf "$API/config/auth" "${auth[@]}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for k in ('mailer_subjects_magic_link', 'mailer_subjects_confirmation'):
    print(f'  {k}: {d.get(k)}')
for k in ('mailer_templates_magic_link_content', 'mailer_templates_confirmation_content'):
    v = d.get(k) or ''
    print(f'  {k}: {len(v)} chars, logo', 'yes' if 'netprophetapp.com/email/logo@2x.png' in v else 'NO')"
