# NetProphet

Greek amateur tennis, as a daily game.

> **The previous contents of this file — a ~1.300 line specification for the
> "Night Court" betting UI — described the product being retired.** It was
> misdirecting sessions into rebuilding it. Recoverable at
> `git show ccd28f9:CLAUDE.md` if any of it is ever wanted.

---

## Where the project is

**Pivoting** from a coins-and-predictions betting app to a daily game about the
Athens amateur tennis scene. Two specs carry the plan; read them before working
on anything in `lib/daily/`:

- **`daily-run-port-spec.md`** — porting the standalone prototype into the app.
  Steps 1–9 are complete, plus the rapid bonus round.
- **`daily-run-content-spec.md`** — filling it with real questions, the
  bilingual copy layer, onboarding, monetisation, and the rollout that retires
  the old app.

The working prototype the port came from is `netprophet-app-demo-v7.html` at the
repo root. It is the reference for behaviour and for Greek copy.

---

## Hard rules

**No betting. No gambling vocabulary.** In either language. The linter in
`lib/daily/content/validate.ts` blocks these on sight:

- Greek: κέρδη, δελτίο, κουπόνι, παρολί, στοίχημα, τζόγος, ποντάρισμα, and
  **απόδοση** in the odds sense
- English: winnings, slip, coupon, parlay, bet, stake, odds

Use instead: **πόντοι, πρόβλεψη, μαζεύεις** / points, prediction, collect.

**Never sell advantage.** No purchase may move a player up the ranking. The
leaderboard ranks on **accuracy**; points are a separate progression currency
that passes, multipliers and shields feed. Keep the two apart.

**Greek copy is source of truth.** Strings ported from the prototype are
verbatim. Do not "improve" them. The fixes already applied and to be kept:

- σερί never declines — **ασφάλεια σερί**, not σεριού
- **Διπλή πρόβλεψη**, not δίδυμο
- **Η ανατροπή**, not το καρφί
- **Σε αναμονή**, not εκκρεμή
- **Βγήκαν τα αποτελέσματα**, not "Η διπλή σου λύθηκε"
- **Μικρή δόνηση σε κάθε επιλογή**, not ανατροφοδότηση
- **Ανάλυση παίκτη**, not report

**Greek drops its accents in all-caps.** `Σάββατο` → `ΣΑΒΒΑΤΟ`, never `ΣΆΒΒΑΤΟ`.
Use `greekCaps()`, not `toUpperCase()`.

**Both languages, permanently.** `el` and `en`. The Greek has to be genuinely
good; the English has to be correct. Greek names transliterate for `en` — never
show Greek script inside English copy. See content spec §9.6.

---

## The Daily Run

Lives in `apps/web/src`, isolated from the rest of the app:

```
app/(prototype)/          standalone layout, no app chrome, noindexed
  daily/page.tsx          onboarding | hub | run | bonus round
lib/daily/
  types.ts                GameCard union — the spec pins this, do not edit casually
  tokens.ts               every colour, radius and motion value
  styles.ts               the stylesheet, built from tokens, scoped to .np-root
  storage.ts              one versioned localStorage key, np_daily_v1
  scoring.ts              pure functions, unit tested — scoring.test.ts
  session.ts              seeded run building
  generators/             one per card kind, reading from providers/
  providers/mock.ts       the fixture, and the default
components/daily/         Onboarding, Hub, run shell, answers/, ScratchPanel, Celebration
hooks/                    useHaptics, useCountUp
```

**Zero coupling, while it lasts.** Nothing the *game* touches may import from the
rest of the app. If something is needed, copy it in. This rule has a planned
ending — see content spec §9.5 — but it is still load-bearing today. Check it
with:

```bash
grep -rn "@netprophet/" apps/web/src/lib/daily apps/web/src/components/daily | grep -v /review/
```

**One documented exception: the review tool.** `components/daily/review/` uses
the app's Supabase auth so a reviewer is a real admin account rather than
whoever holds a shared secret. Deliberate — the review screen is internal, never
ships to a player, and real identities on corrections are worth more than
purity. The game itself stays deletable in one commit.

**Design system.** `tokens.ts` holds every colour — no hex literals anywhere
else. `styles.ts` builds the stylesheet from those tokens; components carry
`np-` classes rather than inline styles, so `:active`, media queries and
`prefers-reduced-motion` all work. Ember/amber on near-black, phone-first, with
two breakpoints at 768px and 1080px.

**Local state only.** No auth, no database, no writes. Everything lives under
`np_daily_v1`. `?reset=1` wipes it — testers need that.

**Tests.** `npx vitest run` in `apps/web`. Scoped to `src/lib/daily/**`.

---

## Legacy after the pivot

Do not build on these. They belong to the app being retired:

`bets`, `parlays`, `transactions`, the coin wallet, power-ups, safe-bet tokens,
and the `bet_stats` / `parlay_stats` / `safe_bet_token_stats` views. The
`/matches` prediction slip, the reward shop, and the marketing pages that sell a
coins product.

Two that need rebuilding rather than deleting:

- `get_weekly_leaderboard_stats` computes `FROM bets` — the ranking has no source
  after the pivot, and moves to accuracy anyway
- Legal pages describe a coin economy and purchases. They are wrong the day the
  pivot ships and carry actual exposure

Users hold coin balances bought through Stripe. Retiring that is a decision, not
a deletion.

---

## Stack

Next.js 15 App Router · TypeScript · Tailwind · Supabase · pnpm workspaces ·
Turbo. `apps/web` is the app, `apps/admin` the back office, `packages/lib` the
shared data layer. Super Sans VF is the font — do not add another.

Dev server on port 3050 via the browser preview, not `npm run dev` in a shell.
