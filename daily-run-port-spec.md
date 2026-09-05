# Daily Run — porting spec

Port the standalone prototype at `docs/prototypes/daily-run-demo.html` into the NetProphet
app as a self-contained, feature-flagged route. Nothing in the existing prediction/coins
flow should change.

Branch: `feat/daily-run`

---

## 1. Ground rules

This ships as a **parallel prototype**, not a feature inside the product. It shares the
repo and the toolchain, nothing else.

- **Zero imports from the existing app.** No shared components, providers, hooks, stores
  or utils. If something is needed, copy it into `lib/daily/`. The only shared things are
  the framework, Tailwind and the font.
- **No auth.** Testers open a link and play. No login, no account, no Supabase.
- **No DB.** All state lives in `localStorage` under a single `np_daily_v1` key. Wiping it
  resets the tester.
- **No writes anywhere.** Nothing in this branch may touch existing tables or endpoints.
- **Its own layout.** `app/(prototype)/layout.tsx` renders no app chrome, no nav, no
  header. It is a standalone screen.
- **Greek copy is source of truth.** Strings come from the prototype verbatim unless a fix
  is listed in section 7. Do not "improve" Greek copy.
- **Mock data only.** The generators read from `providers/mock.ts`. A Supabase provider is
  out of scope for this branch entirely.
- Design tokens (colours, radii, motion) live in `lib/daily/tokens.ts` and are used
  everywhere. No hardcoded hex outside that file.

**Why this way:** the point of the branch is to find out whether the loop holds with real
players, not to integrate anything. Isolation means it can be deleted in one commit if the
answer is no, and merged deliberately if the answer is yes.

---

## 2. File tree to create

```
app/(prototype)/
  layout.tsx                   standalone shell, no app chrome, sets viewport-fit
  daily/
    page.tsx                   client entry, reads local state, renders the app

lib/daily/
  types.ts                     GameCard union + run/session types
  tokens.ts                    colour + motion tokens ported from the prototype
  storage.ts                   localStorage read/write, versioned key np_daily_v1
  scoring.ts                   combo multiplier, shield, keep/half/double resolution
  session.ts                   builds a run: pick 8 cards, seeded shuffle, no repeats
  generators/
    index.ts                   registry: card type -> generator
    result.ts  score.ts  poll.ts  upset.ts  order.ts  guess.ts
    thisThat.ts  award.ts  combo.ts  rapid.ts
  providers/
    mock.ts                    hardcoded players/matches from the prototype

components/daily/
  Onboarding.tsx               play type, claim profile, club, friends
  Hub.tsx                      Σήμερα / Παίκτες / Κατάταξη / Pro
  RunProgress.tsx              story-style segment bar
  RunHeader.tsx                streak, combo multiplier, shield, points
  CardStage.tsx                hero: kicker, question, lede
  answers/
    PlayerPair.tsx  OptionList.tsx  RowList.tsx  ThisOrThat.tsx  OrderList.tsx
  FeedbackSheet.tsx            bottom sheet, win/lose/info variants
  RiskChoice.tsx               Κράτα / Τα μισά / Διπλασίασε
  ScratchPanel.tsx             canvas foil + dust particles
  Celebration.tsx              full-screen takeover, count-up, confetti
  Portrait.tsx                 procedural SVG player portrait

hooks/
  useHaptics.ts
  useCountUp.ts
```

Everything above is new. No existing file is modified except `CLAUDE.md` and, if the
prototype needs a font weight that is not yet loaded, the font config.

---

## 3. Types (write these first, exactly)

```ts
// lib/daily/types.ts
export type CardKind =
  | 'result' | 'score' | 'poll' | 'upset'
  | 'order' | 'guess' | 'thisThat' | 'award' | 'combo';

export type RevealStyle = 'instant' | 'scratch';

interface CardBase {
  id: string;              // stable, used for the seen-set
  kind: CardKind;
  kicker: string;          // e.g. 'Προημιτελικός · 2 ώρες 14 λεπτά'
  question: string;
  lede?: string;
  points: number;
  reveal: RevealStyle;
  explanation: string;     // shown after answering, may contain <b>
  scoring: boolean;        // false for poll/award/thisThat
}

export interface PlayerRef {
  id: string; name: string; club: string; ntrp: string;
  rating: number; streak: number; clay: number; hard: number;
  form: ('w' | 'l')[];
}

export type GameCard =
  | (CardBase & { kind: 'result'; a: PlayerRef; b: PlayerRef;
      correctId: string; crowdSplit: [number, number] })
  | (CardBase & { kind: 'score' | 'guess'; options: string[];
      correctIndex: number; clues?: string[] })
  | (CardBase & { kind: 'poll' | 'award'; options: string[]; crowdSplit: number[] })
  | (CardBase & { kind: 'thisThat';
      options: { title: string; sub: string; gradient: string }[];
      crowdSplit: [number, number] })
  | (CardBase & { kind: 'upset'; rows: { label: string; right: string }[];
      correctIndex: number })
  | (CardBase & { kind: 'order'; items: PlayerRef[]; correctOrder: string[] })
  | (CardBase & { kind: 'combo'; rows: { label: string; right: string }[];
      pickCount: number });

export interface RunState {
  cards: GameCard[];
  index: number;
  points: number;      // banked this run
  pending: number;     // on the table, not yet banked
  combo: number;       // consecutive correct, drives multiplier
  shield: boolean;
  answers: Record<string, unknown>;
}
```

Every generator returns `GameCard`. Every answer component takes the narrowed card type
and an `onAnswer` callback. No component reads global state directly.

---

## 4. Porting order

Do these as separate commits. Each should be reviewable on its own.

1. **Scaffolding** — route group, standalone layout, types, tokens, storage, mock
   provider. Route renders "Σήμερα" and a start button. No games yet.
2. **Onboarding** — four steps with the tournament-player branch, writes `profile` to
   storage.
3. **Run shell** — `RunProgress`, `RunHeader`, `CardStage`, `FeedbackSheet`, and the
   `result` card end to end. This proves the loop.
4. **Remaining card types** — one commit per two or three types, reusing the answer
   primitives. `combo` and `order` have the fiddliest state, do them last.
5. **Scoring and risk** — `scoring.ts` plus `RiskChoice`. Pure functions, unit tested.
6. **Scratch panel** — canvas port. See gotchas.
7. **Celebration** — overlay, count-up, confetti. Render through a portal.
8. **Haptics** — `useHaptics`, wired at the call sites listed in section 6.
9. **Hub screens** — Παίκτες, Κατάταξη, Pro. Pro is a static page here; nothing is
   purchasable in the prototype.

---

## 5. Gotchas from the prototype

**Scratch canvas.** Two stacked canvases: foil (erased with
`globalCompositeOperation = 'destination-out'`) and dust (particles). Size both by
`devicePixelRatio` and set CSS width/height separately or it blurs on retina. Coverage is
tracked on a 24×11 grid marked by circle-distance, sampled along the segment between
pointer events so fast drags do not leave gaps. Clears at 68%. Call
`setPointerCapture` on pointerdown and use `touch-action: none`, otherwise the page
scrolls under the finger on mobile. Measure coverage **during** the move, not on
pointerup — that was a real bug in an earlier version.

**Celebration.** Mount via `createPortal` to `document.body`, not inside the run
container, or the blur backdrop clips. The count-up must drive both the big number and
the running total in the same frame loop.

**Haptics.** `navigator.vibrate` is Android/Chrome only. iOS Safari does not support it.
`useHaptics` should expose `supported` so the settings toggle can say so honestly. If the
app ever goes native or Capacitor, swap the implementation behind the same hook.

**Reduced motion.** Respect `prefers-reduced-motion`: skip confetti, rays and the count-up
animation, show final values immediately. The scratch still works, it just does not spawn
dust.

**Fonts.** The prototype uses Roboto Condensed. Use the existing Super Sans VF at its
heaviest weight instead and adjust the display sizes down until it reads the same. Do not
add a new font family.

---

## 6. Haptic call sites

| Moment | Pattern |
|---|---|
| Any tap / nav | `8` |
| Selecting an answer | `14` |
| Locking a prediction, banking points | `[14,45,22]` |
| Correct answer | `[16,42,28]` |
| Wrong answer | `[48,70,48]` |
| While scratching | `5`, throttled every ~34px of travel |
| Rapid round, last 5 seconds | `5` per second |
| Streak increment, scratch cleared | `[12,30,12,30,26]` |
| Celebration impact | `[24,50,18,50,34]` |
| Celebration count-up | `5` every ~110ms |

---

## 7. Copy fixes already applied — keep these

- σερί never declines: **ασφάλεια σερί**, not σεριού
- **Διπλή πρόβλεψη**, not δίδυμο. Pro row reads "Πόντοι στη διπλή πρόβλεψη ×2"
- **Η ανατροπή**, not το καρφί
- **Σε αναμονή**, not εκκρεμή
- **Βγήκαν τα αποτελέσματα**, not "Η διπλή σου λύθηκε"
- **Μικρή δόνηση σε κάθε επιλογή**, not ανατροφοδότηση
- **Ανάλυση παίκτη**, not report
- Pro subtitle: "Δωρεάν έχεις όλα τα παιχνίδια. Με την Pro έχεις και όλα τα δεδομένα."

No gambling vocabulary anywhere: no κέρδη, δελτίο, κουπόνι, παρολί. Use πόντοι,
πρόβλεψη, μαζεύεις.

---

## 8. State and distribution

### Local state only

One versioned key, written on every meaningful change, read once on mount:

```ts
// lib/daily/storage.ts
interface DailyState {
  v: 1;
  profile: { playType: 'comp'|'fun'|'watch'; claimedId: string|null;
             club: string|null; friendIds: string[] } | null;
  streak: number;
  lastPlayedOn: string | null;   // ISO date, drives "already played today"
  totalPoints: number;
  seenCardIds: string[];         // prevents repeats across runs
  shield: boolean;
  history: { date: string; points: number; correct: number; total: number }[];
}
```

A hidden reset is useful during testing: `/daily?reset=1` clears the key and returns to
onboarding. Keep it, testers will need it.

Because there is no server, the "daily" boundary is the device clock. That is fine for a
prototype. Note it as a known limitation rather than trying to solve it.

### Getting it to testers

Preferred: **Vercel preview deployment of the branch.** Every push gives a URL, nothing
touches production, and there is no route to guess on the live domain. If the project has
deployment protection on, either disable it for this branch or set a shared password so
testers are not asked to log in to Vercel.

If it must live on the production domain instead, put it at `/lab/daily`, add
`X-Robots-Tag: noindex` for that path, and leave it unlinked from anywhere in the app. Do
not add a flag-checking server component; the isolation is the point, an unlinked route is
enough for a closed test.

Add a one-line footer on the hub with a build identifier so feedback can be tied to a
version.

---

## 9. Done when

- [ ] `grep -r "from '@/components" components/daily lib/daily` returns nothing outside
      `components/daily` — proves zero coupling to the existing app
- [ ] Existing app runs and builds unchanged; `git diff main --stat` shows only new files
      plus CLAUDE.md
- [ ] Onboarding completes and persists; reload returns to the hub, not to step one
- [ ] All eight card types playable on mock data
- [ ] Combo, shield, keep/half/double behave per `scoring.ts` tests
- [ ] Scratch clears on a single continuous drag on a real phone
- [ ] Celebration fires on double-prediction resolve and on a successful ×2
- [ ] Haptics fire at every site in section 6, and degrade silently on iOS
- [ ] `prefers-reduced-motion` respected
- [ ] No repeats within a run
- [ ] `?reset=1` returns a tester to a clean state
- [ ] Preview URL opens on an iPhone and an Android phone with no login
