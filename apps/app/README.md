# apps/app

Expo universal app (iOS, Android, web). Needs Node 22 (`nvm use 22`).

## Run against the local v2 database

```bash
scripts/v2-db-remote.sh start          # from the repo root; prints API_URL and ANON_KEY
cp apps/app/.env.example apps/app/.env.local   # fill in those two values
pnpm --filter @netprophet/app web
```

Sign in with any email; the code arrives in the local mail catcher at http://127.0.0.1:54424.
Without `.env.local` the app runs on the mock data in `src/mock/`.

## Layout

- `app/`: routes. `sign-in` is the only route without a session (`Stack.Protected` in `_layout.tsx`).
- `src/lib/supabase.ts`: the client (null without env), `auth.tsx`: session, email code, Google.
- `src/lib/feed.ts`: server feed cards to `CardMatch`; the only place database sides 1/2 become a/b.
- `src/lib/data.ts`: `useFeed`, `useMe`.
