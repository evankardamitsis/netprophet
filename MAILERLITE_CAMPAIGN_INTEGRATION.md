# MailerLite Campaign Integration

Wires NetProphet backend events to MailerLite automations. **Win/lose emails stay on Resend** (transactional).

## Environment variables

Copy from `env.example` into `.env.local` (admin cron) and **Supabase Edge Function secrets**:

- `MAILERLITE_API_KEY`
- `MAILERLITE_API_BASE` (default `https://connect.mailerlite.com/api`)
- `GROUP_*` — all group IDs from MailerLite dashboard
- `FIELD_*` — custom field keys (defaults match MailerLite field names)

## Architecture

| Layer | Role |
|-------|------|
| `packages/lib/src/services/mailerlite.ts` | Direct MailerLite REST API (cron / server) |
| `supabase/functions/_shared/mailerlite.ts` | Same API for Edge Functions |
| `mailerlite_logs` table | Async queue (non-blocking) |
| `mailerlite-process-queue` | Processes queue → MailerLite API |
| DB triggers | Signup, bet placed/settled, coin purchase |
| Admin crons | Weekly stats, inactivity, match alerts |
| `useAuth` | Login → `last_login_date` |

## Event hooks

| Event | Mechanism |
|-------|-----------|
| Registration | `handle_new_user` → `add_user_to_mailerlite` (NEW_USERS + welcome fields) |
| Login | `queue_mailerlite_login_sync()` from web `useAuth` |
| Prediction placed | Trigger on `bets` INSERT + wallet `place_bet` balance sync |
| Prediction settled | Trigger on `bets` status → won/lost (+ low-coin COIN_BUYERS) |
| Coin purchase | Trigger on `transactions` INSERT type=purchase |
| Weekly leaderboard | Cron `GET /api/cron/mailerlite/weekly` (Sun 17:00 UTC) |
| Inactivity 7d/30d | Cron `GET /api/cron/mailerlite/inactivity` (daily 06:00 UTC) |
| Match alerts | Cron Mon/Thu 06:50 UTC |
| New tournament | Admin POST `/api/admin/mailerlite/tournament` after create |

## Deploy steps

1. Apply migration: `supabase db push` (or run `20260521120000_mailerlite_campaign_integration.sql`)
2. Set Edge Function secrets (`GROUP_*`, `FIELD_*`, `MAILERLITE_API_KEY`)
3. Deploy functions: `mailerlite-process-queue`, `wallet-operations`
4. Configure DB webhook on `mailerlite_logs` INSERT → `mailerlite-process-queue` (see `docs/MAILERLITE_WEBHOOK_SETUP.md`)
5. Set Vercel env + deploy admin app (crons in root `vercel.json`)
6. Activate automations in MailerLite dashboard (URLs in `CLAUDE_CODE_MAILERLITE_1.md`)

## Resend decision

**Keep** prediction win/lose on Resend. MailerLite only receives field/group sync after settlement.

## Testing

See checklist in `CLAUDE_CODE_MAILERLITE_1.md` Step "Testing checklist".

Manual cron test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-admin.vercel.app/api/cron/mailerlite/weekly
```
