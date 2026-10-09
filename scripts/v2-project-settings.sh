#!/usr/bin/env bash
# Apply the hosted v2 project's API and auth settings through the Supabase Management API.
# Run it yourself: it puts the Resend key into Supabase's SMTP settings.
#
#   SUPABASE_ACCESS_TOKEN  personal access token (supabase.com/dashboard/account/tokens); read from .env.local if unset
#   RESEND_API_KEY_V2      a Resend key with "sending access" for netprophetapp.com (prompted if unset)
#
# What it sets:
#   - Data API: only the `api` schema is exposed (base tables in `core` stay private)
#   - Auth: 6-digit email code valid 1 hour, site URL and redirect URLs, Google off until it has credentials
#   - Email: all auth emails go out through Resend SMTP from noreply@netprophetapp.com,
#     using supabase-v2/templates (code, not link)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="mssedfnhcozeifgflkaq"
API="https://api.supabase.com/v1/projects/$REF"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  SUPABASE_ACCESS_TOKEN="$(grep '^SUPABASE_ACCESS_TOKEN=' "$ROOT/.env.local" | cut -d= -f2- | tr -d '"')"
fi
[[ -n "$SUPABASE_ACCESS_TOKEN" ]] || { echo "set SUPABASE_ACCESS_TOKEN" >&2; exit 1; }
if [[ -z "${RESEND_API_KEY_V2:-}" ]]; then
  read -r -s -p "Resend API key for v2 (sending access): " RESEND_API_KEY_V2
  echo
fi
export RESEND_API_KEY_V2

auth=(-H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json")

echo "Data API: expose only the api schema"
curl -sf -X PATCH "$API/postgrest" "${auth[@]}" \
  -d '{"db_schema":"api","db_extra_search_path":"extensions","max_rows":1000}' >/dev/null

echo "Auth: code login, URLs, Resend SMTP, templates"
python3 - "$ROOT/supabase-v2/templates" <<'EOF' > "${TMPDIR:-/tmp}/np-v2-auth.json"
import json, os, sys
t = sys.argv[1]
subject = "Ο κωδικός σου για το NetProphet"
print(json.dumps({
    "site_url": "https://app.netprophet.gr",
    "uri_allow_list": "netprophet://auth/callback,https://netprophet.gr/auth/callback,http://localhost:8081",
    "external_email_enabled": True,
    "mailer_autoconfirm": False,
    "mailer_otp_length": 6,
    "mailer_otp_exp": 3600,
    "external_google_enabled": False,
    "smtp_host": "smtp.resend.com",
    "smtp_port": "465",
    "smtp_user": "resend",
    "smtp_pass": os.environ["RESEND_API_KEY_V2"],
    "smtp_admin_email": "noreply@netprophetapp.com",
    "smtp_sender_name": "NetProphet",
    "smtp_max_frequency": 60,
    "rate_limit_email_sent": 100,
    "mailer_subjects_confirmation": subject,
    "mailer_subjects_magic_link": subject,
    "mailer_templates_confirmation_content": open(os.path.join(t, "confirmation.html"), encoding="utf-8").read(),
    "mailer_templates_magic_link_content": open(os.path.join(t, "magic_link.html"), encoding="utf-8").read(),
}, ensure_ascii=False))
EOF
trap 'rm -f "${TMPDIR:-/tmp}/np-v2-auth.json"' EXIT
curl -sf -X PATCH "$API/config/auth" "${auth[@]}" --data-binary @"${TMPDIR:-/tmp}/np-v2-auth.json" >/dev/null

echo "Check"
curl -sf "$API/postgrest" "${auth[@]}" | python3 -c "import json,sys; print('  exposed schemas:', json.load(sys.stdin)['db_schema'])"
curl -sf "$API/config/auth" "${auth[@]}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for k in ('site_url', 'mailer_otp_length', 'smtp_host', 'smtp_admin_email', 'mailer_subjects_magic_link'):
    print(f'  {k}: {d.get(k)}')"
