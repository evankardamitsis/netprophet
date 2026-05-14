# NetProphet — Design System Implementation
## Instructions for Claude Code

You are implementing a complete UI/UX overhaul of the NetProphet app on the `new-ui-test` branch.
The goal is to make it feel like a **fun, polished mobile game** — not a data table or a betting form.

**Stack:** Next.js 14+ App Router · TypeScript · Tailwind CSS · shadcn/ui · Super Sans VF font
**Branch:** new-ui-test (already created)
**Dev server:** `npm run dev` on port 3001

Before starting, run `git status` to confirm you are on `new-ui-test`.

---

## Design Philosophy — "Night Court"

Deep dark backgrounds. Electric accent colors. Odds numbers that feel like a scoreboard.
Every screen should feel like you're about to make a play, not fill out a form.

Core rules:
- Match cards, NOT tables. Never use `<table>` for match listings.
- Odds numbers are the HERO — largest, boldest element on every match card.
- Gold (`#FFD60A`) = coins only. Green (`#00E676`) = wins only. Orange (`#FF6B2B`) = streaks only.
- Mobile-first. Bottom nav on mobile. Cards everywhere.
- No gambling vocabulary: replace ΔΕΛΤΙΟ→"Οι Προβλέψεις Μου", Κουπόνι→"Λίστα Προβλέψεων", Παρολί→"Συνδυαστική Πρόβλεψη"

---

## STEP 1 — Update globals.css

Find the file at `app/globals.css` (or `src/app/globals.css`).
Keep the existing `@tailwind` directives. Replace or merge everything else with the following:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --court-void:    #080C18;
  --court-dark:    #0F1628;
  --court-base:    #161F35;
  --court-raised:  #1E2A45;
  --court-high:    #263354;

  --background:         220 60% 5%;
  --foreground:         210 40% 98%;
  --card:               220 50% 9%;
  --card-foreground:    210 40% 98%;
  --popover:            220 50% 9%;
  --popover-foreground: 210 40% 98%;
  --primary:            47 100% 52%;
  --primary-foreground: 220 60% 5%;
  --secondary:          220 35% 17%;
  --secondary-foreground: 210 40% 98%;
  --muted:              220 35% 17%;
  --muted-foreground:   215 20% 55%;
  --accent:             47 100% 52%;
  --accent-foreground:  220 60% 5%;
  --destructive:        0 80% 62%;
  --destructive-foreground: 210 40% 98%;
  --border:             220 40% 18%;
  --input:              220 40% 18%;
  --ring:               47 100% 52%;
  --radius:             0.75rem;

  --gold:          #FFD60A;
  --gold-dim:      #C9980A;
  --gold-bg:       rgba(255,214,10,0.12);
  --gold-border:   rgba(255,214,10,0.3);
  --neon-green:    #00E676;
  --win-green:     #00C853;
  --green-bg:      rgba(0,230,118,0.12);
  --green-border:  rgba(0,230,118,0.3);
  --loss-red:      #FF4545;
  --red-bg:        rgba(255,69,69,0.12);
  --red-border:    rgba(255,69,69,0.3);
  --hot-orange:    #FF6B2B;
  --orange-bg:     rgba(255,107,43,0.12);
  --orange-border: rgba(255,107,43,0.3);
  --violet:        #8B5CF6;
  --violet-bg:     rgba(139,92,246,0.12);
  --violet-border: rgba(139,92,246,0.3);
  --sky:           #38BDF8;
  --sky-bg:        rgba(56,189,248,0.1);
  --text-primary:   #FFFFFF;
  --text-secondary: #94A3B8;
  --text-muted:     #4B5975;
  --text-inverse:   #080C18;
  --border-subtle:  rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.12);
  --border-strong:  rgba(255,255,255,0.24);
  --shadow-card:     0 2px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3);
  --shadow-elevated: 0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4);
  --shadow-sheet:    0 -8px 40px rgba(0,0,0,0.8);
  --glow-gold:    0 0 24px rgba(255,214,10,0.3),  0 0 8px rgba(255,214,10,0.15);
  --glow-green:   0 0 24px rgba(0,230,118,0.25),  0 0 8px rgba(0,230,118,0.12);
  --glow-orange:  0 0 24px rgba(255,107,43,0.25), 0 0 8px rgba(255,107,43,0.12);
  --glow-violet:  0 0 24px rgba(139,92,246,0.25), 0 0 8px rgba(139,92,246,0.12);
  --radius-sm:  8px;
  --radius-md:  12px;
  --radius-lg:  16px;
  --radius-xl:  20px;
  --radius-2xl: 24px;
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
  --bottom-nav-h: 64px;
}

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

body {
  background-color: var(--court-void);
  color: var(--text-primary);
  font-family: 'Super Sans VF', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-image:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(30,42,69,0.5), transparent),
    repeating-linear-gradient(-45deg, transparent, transparent 60px,
      rgba(255,255,255,0.008) 60px, rgba(255,255,255,0.008) 61px);
  background-attachment: fixed;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 2px; }

/* Animations */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes coin-pop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.4) translateY(-8px); }
  70%  { transform: scale(0.95); }
  100% { transform: scale(1); }
}
@keyframes odds-pulse {
  0%, 90%, 100% { transform: scale(1); }
  94% { transform: scale(1.04); }
  97% { transform: scale(0.99); }
}
@keyframes win-flash {
  0%, 100% { border-color: var(--green-border); }
  50% { border-color: var(--neon-green); box-shadow: var(--glow-green); }
}
@keyframes streak-pulse {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: var(--glow-orange); }
}
@keyframes slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
@keyframes number-tick {
  0%   { transform: translateY(0); opacity: 1; }
  40%  { transform: translateY(-4px); opacity: 0.6; }
  60%  { transform: translateY(4px); opacity: 0.6; }
  100% { transform: translateY(0); opacity: 1; }
}

.animate-fade-in-up  { animation: fade-in-up 250ms var(--ease-smooth) both; }
.animate-coin-pop    { animation: coin-pop 500ms var(--ease-bounce); }
.animate-odds-pulse  { animation: odds-pulse 5s ease-in-out infinite; }
.animate-win-flash   { animation: win-flash 1.5s ease-in-out 3; }
.animate-streak-pulse{ animation: streak-pulse 2s ease-in-out infinite; }
.animate-slide-up    { animation: slide-up 400ms var(--ease-smooth) both; }
.animate-number-tick { animation: number-tick 300ms ease; }

/* Staggered list reveals */
.np-card-list > *:nth-child(1)  { animation-delay: 0ms; }
.np-card-list > *:nth-child(2)  { animation-delay: 50ms; }
.np-card-list > *:nth-child(3)  { animation-delay: 100ms; }
.np-card-list > *:nth-child(4)  { animation-delay: 150ms; }
.np-card-list > *:nth-child(5)  { animation-delay: 200ms; }
.np-card-list > *:nth-child(6)  { animation-delay: 250ms; }
.np-card-list > *:nth-child(7)  { animation-delay: 300ms; }
.np-card-list > *:nth-child(8)  { animation-delay: 350ms; }

/* Mobile page padding (clears bottom nav + slip peek) */
.np-page-pad { padding-bottom: calc(var(--bottom-nav-h) + 72px); }
@media (min-width: 1024px) { .np-page-pad { padding-bottom: 0; } }
```

---

## STEP 2 — Update tailwind.config.ts

Find `tailwind.config.ts` (or `.js`) in the project root.
Merge the following into the existing `theme.extend` block. Do NOT replace the whole file.

```typescript
// Add inside theme: { extend: { ... } }

colors: {
  "court-void":   "#080C18",
  "court-dark":   "#0F1628",
  "court-base":   "#161F35",
  "court-raised": "#1E2A45",
  "court-high":   "#263354",
  "gold":         "#FFD60A",
  "gold-dim":     "#C9980A",
  "neon-green":   "#00E676",
  "win-green":    "#00C853",
  "loss-red":     "#FF4545",
  "hot-orange":   "#FF6B2B",
  "violet":       "#8B5CF6",
  "sky":          "#38BDF8",
  // keep all existing colors too
},

borderRadius: {
  "sm":  "8px",
  "md":  "12px",
  "lg":  "16px",
  "xl":  "20px",
  "2xl": "24px",
  "3xl": "32px",
},

boxShadow: {
  "card":        "0 2px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)",
  "elevated":    "0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)",
  "sheet":       "0 -8px 40px rgba(0,0,0,0.8)",
  "glow-gold":   "0 0 24px rgba(255,214,10,0.3), 0 0 8px rgba(255,214,10,0.15)",
  "glow-green":  "0 0 24px rgba(0,230,118,0.25), 0 0 8px rgba(0,230,118,0.12)",
  "glow-orange": "0 0 24px rgba(255,107,43,0.25), 0 0 8px rgba(255,107,43,0.12)",
  "glow-violet": "0 0 24px rgba(139,92,246,0.25), 0 0 8px rgba(139,92,246,0.12)",
},

keyframes: {
  "fade-in-up": {
    from: { opacity: "0", transform: "translateY(12px)" },
    to:   { opacity: "1", transform: "translateY(0)" },
  },
  "coin-pop": {
    "0%":   { transform: "scale(1)" },
    "40%":  { transform: "scale(1.4) translateY(-8px)" },
    "70%":  { transform: "scale(0.95)" },
    "100%": { transform: "scale(1)" },
  },
  "odds-pulse": {
    "0%, 90%, 100%": { transform: "scale(1)" },
    "94%": { transform: "scale(1.04)" },
    "97%": { transform: "scale(0.99)" },
  },
  "win-flash": {
    "0%, 100%": { borderColor: "rgba(0,230,118,0.3)" },
    "50%": { borderColor: "#00E676" },
  },
  "streak-pulse": {
    "0%, 100%": { boxShadow: "none" },
    "50%": { boxShadow: "0 0 24px rgba(255,107,43,0.25)" },
  },
  "slide-up": {
    from: { transform: "translateY(100%)" },
    to:   { transform: "translateY(0)" },
  },
},

animation: {
  "fade-in-up":    "fade-in-up 250ms cubic-bezier(0.4,0,0.2,1) both",
  "coin-pop":      "coin-pop 500ms cubic-bezier(0.34,1.56,0.64,1)",
  "odds-pulse":    "odds-pulse 5s ease-in-out infinite",
  "win-flash":     "win-flash 1.5s ease-in-out 3",
  "streak-pulse":  "streak-pulse 2s ease-in-out infinite",
  "slide-up":      "slide-up 400ms cubic-bezier(0.4,0,0.2,1) both",
},

transitionTimingFunction: {
  "bounce-in": "cubic-bezier(0.34, 1.56, 0.64, 1)",
  "smooth":    "cubic-bezier(0.4, 0, 0.2, 1)",
  "snappy":    "cubic-bezier(0.2, 0, 0, 1)",
},

screens: {
  "xs": "375px",
},
```

After updating, verify with: `npm run dev` — no errors means the tokens are live.

---

## STEP 3 — Layout Shell

### 3a. Update the root layout header

Find the main header component (likely in `app/[lang]/layout.tsx` or `components/layout/Header.tsx`).

Replace the header with this pattern:
- Background: `bg-[#080C18]/95 backdrop-blur-xl border-b border-white/[0.06]`
- Height: `h-[60px]`
- Logo: `Net` in white + `Prophet` in `text-[#FFD60A]`, `font-black text-xl tracking-tight`
- Coin balance pill: `bg-[#FFD60A]/12 border border-[#FFD60A]/30 rounded-full px-3 py-1.5 text-[#FFD60A] font-bold text-sm tabular-nums`
  - Format: `🪙 {balance.toLocaleString('el-GR')}`
- Desktop nav links: `text-sm font-semibold text-[#94A3B8] hover:text-white hover:bg-white/[0.06] px-2.5 py-1.5 rounded-lg transition-all`
- Active nav link: `text-white bg-white/[0.08]`
- Avatar button: `w-8 h-8 rounded-full bg-[#1E2A45] border border-white/12 text-sm font-bold`

### 3b. Create BottomNav component

Create `components/layout/BottomNav.tsx`:

```tsx
"use client";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { label: "Αγώνες",    icon: "🎾", path: "/matches"      },
  { label: "Κατάταξη",  icon: "🏆", path: "/leaderboard"  },
  { label: "SLIP",      icon: "📋", path: null, isFab: true },
  { label: "Αθλητές",   icon: "👤", path: "/players"      },
  { label: "Προφίλ",    icon: "👛", path: "/my-picks"     },
];

export function BottomNav({
  predictionCount = 0,
  onSlipToggle,
  lang = "el",
}: {
  predictionCount?: number;
  onSlipToggle?: () => void;
  lang?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0F1628]/97 backdrop-blur-xl
                    border-t border-white/[0.06] flex items-center justify-around
                    z-[60] pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
      {NAV_ITEMS.map((item) => {
        if (item.isFab) {
          return (
            <button
              key="fab"
              onClick={onSlipToggle}
              className="relative flex items-center justify-center
                         w-[52px] h-[52px] -mt-4 rounded-full
                         bg-[#FFD60A] text-[#080C18] text-xl font-black
                         shadow-[0_4px_16px_rgba(255,214,10,0.4)]
                         active:scale-95 transition-transform duration-75"
              aria-label="Οι Προβλέψεις Μου"
            >
              📋
              {predictionCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px]
                                 bg-[#FF4545] rounded-full border-2 border-[#0F1628]
                                 text-white text-[9px] font-black
                                 flex items-center justify-center px-1">
                  {predictionCount}
                </span>
              )}
            </button>
          );
        }

        const isActive = pathname.includes(item.path!);
        return (
          <button
            key={item.path}
            onClick={() => router.push(`/${lang}${item.path}`)}
            className={`flex flex-col items-center gap-[3px] px-3 py-1
                        transition-colors duration-150
                        ${isActive ? "text-[#FFD60A]" : "text-[#4B5975]"}`}
          >
            <span className={`text-[22px] leading-none
                              ${isActive ? "drop-shadow-[0_0_8px_rgba(255,214,10,0.5)]" : ""}`}>
              {item.icon}
            </span>
            <span className="text-[9px] font-bold tracking-[0.05em] uppercase">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
```

Add `<BottomNav />` to `app/[lang]/layout.tsx`, inside the body, after the main content.
Add `className="pb-16 lg:pb-0"` to the main content wrapper so it doesn't hide behind the nav.

---

## STEP 4 — Match Card Component

Create `components/matches/MatchCard.tsx`. This replaces ALL existing table-row match display.

```tsx
"use client";
import { useState } from "react";

interface Player {
  id: string;
  name: string;
  ntrp: number;
  odds: number;
}

interface MatchCardProps {
  id: string;
  tournament: string;
  round: string;
  category: string;
  surface?: "Clay Court" | "Hard Court" | "Grass Court";
  time: string;
  date: string;
  player1: Player;
  player2: Player;
  isActive?: boolean;    // user already has a prediction
  isFeatured?: boolean;
  isLive?: boolean;
  selectedPlayer?: "player1" | "player2" | null;
  onSelectPlayer?: (matchId: string, player: "player1" | "player2") => void;
  onViewDetail?: (matchId: string) => void;
}

const ROUND_MAP: Record<string, string> = {
  "Round of 64": "Β΄ Φάση", "Round of 32": "32άδα", "Round of 16": "16άδα",
  "Quarterfinals": "Προημ/κοί", "Semifinals": "Ημιτελικοί",
  "Finals": "Τελικός", "Final": "Τελικός",
};

const SURFACE_STYLE: Record<string, { color: string; emoji: string }> = {
  "Clay Court":  { color: "text-[#CD7F32]", emoji: "🟤" },
  "Hard Court":  { color: "text-sky",       emoji: "🔵" },
  "Grass Court": { color: "text-neon-green", emoji: "🟢" },
};

function abbreviate(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0].charAt(0)}. ${parts.slice(1).join(" ")}`;
}

export function MatchCard({
  id, tournament, round, category, surface, time, date,
  player1, player2, isActive, isFeatured, isLive,
  selectedPlayer, onSelectPlayer, onViewDetail,
}: MatchCardProps) {
  const [localSel, setLocalSel] = useState<"player1" | "player2" | null>(null);
  const sel = selectedPlayer !== undefined ? selectedPlayer : localSel;

  const handleSelect = (p: "player1" | "player2") => {
    const next = sel === p ? null : p;
    setLocalSel(next);
    if (next) onSelectPlayer?.(id, p);
  };

  const isUnderdog1 = player1.odds > player2.odds * 1.8;
  const isUnderdog2 = player2.odds > player1.odds * 1.8;
  const surfaceInfo = surface ? SURFACE_STYLE[surface] : null;

  return (
    <article
      className={[
        "relative overflow-hidden rounded-[20px] p-4 mb-3 cursor-pointer",
        "border transition-all duration-150",
        "animate-fade-in-up",
        isFeatured
          ? "bg-gradient-to-br from-[#1E2A45] to-[#1a2340] border-[#8B5CF6]/30 shadow-glow-violet"
          : isActive
          ? "bg-[#161F35] border-[#00E676]/25"
          : "bg-[#161F35] border-white/[0.06] hover:border-white/[0.12] hover:-translate-y-px hover:shadow-elevated",
      ].join(" ")}
      onClick={() => onViewDetail?.(id)}
    >
      {/* Shine line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

      {/* META ROW */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full
                         bg-[#8B5CF6]/10 border border-[#8B5CF6]/28
                         text-[10px] font-bold text-[#C4B5FD] tracking-[0.03em]
                         truncate max-w-[180px]">
          {isFeatured && "⭐ "}{tournament}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0 text-[#94A3B8] text-[11px]">
          {isLive && (
            <span className="px-2 py-0.5 rounded-full bg-[#FF4545]/12 border border-[#FF4545]/30
                             text-[#FF4545] text-[10px] font-bold animate-pulse">
              🔴 LIVE
            </span>
          )}
          <span className="tabular-nums">{time}</span>
          <span className="text-[#4B5975]">{date}</span>
          <span className="text-[#4B5975] hidden sm:inline">
            {ROUND_MAP[round] ?? round}
          </span>
        </div>
      </div>

      {/* ODDS BUTTONS */}
      <div className="flex items-stretch gap-2" onClick={e => e.stopPropagation()}>
        <OddsBtn
          player={player1}
          isSelected={sel === "player1"}
          isUnderdog={isUnderdog1}
          isFavorite={player1.odds < player2.odds}
          side="left"
          onClick={() => handleSelect("player1")}
        />
        <div className="flex items-center justify-center w-5 flex-shrink-0">
          <span className="text-[9px] font-black text-[#4B5975] tracking-[0.1em]"
                style={{ writingMode: "vertical-rl" }}>VS</span>
        </div>
        <OddsBtn
          player={player2}
          isSelected={sel === "player2"}
          isUnderdog={isUnderdog2}
          isFavorite={player2.odds < player1.odds}
          side="right"
          onClick={() => handleSelect("player2")}
        />
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06] gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-[#4B5975] tracking-[0.05em] uppercase">
            {category}
          </span>
          {surfaceInfo && (
            <span className={`text-[10px] font-semibold ${surfaceInfo.color}`}>
              {surfaceInfo.emoji} {surface!.replace(" Court", "")}
            </span>
          )}
          {(isUnderdog1 || isUnderdog2) && (
            <span className="px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 border border-[#FF6B2B]/30
                             text-[#FF6B2B] text-[10px] font-bold">
              🔥 UNDERDOG
            </span>
          )}
        </div>
        {isActive && (
          <span className="px-2 py-0.5 rounded-full bg-[#00E676]/10 border border-[#00E676]/30
                           text-[#00E676] text-[10px] font-bold flex-shrink-0">
            ✓ Έχεις Προβλέψει
          </span>
        )}
      </div>
    </article>
  );
}

function OddsBtn({
  player, isSelected, isUnderdog, isFavorite, side, onClick,
}: {
  player: Player;
  isSelected: boolean;
  isUnderdog: boolean;
  isFavorite: boolean;
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex-1 flex flex-col items-center justify-center gap-[3px]",
        "px-3 py-3 min-h-[72px] relative overflow-hidden",
        "border-2 transition-all duration-150 active:scale-95",
        side === "left" ? "rounded-l-2xl rounded-r-lg" : "rounded-r-2xl rounded-l-lg",
        isSelected
          ? "bg-[#00E676]/10 border-[#00E676] shadow-glow-green"
          : isUnderdog
          ? "bg-gradient-to-br from-[#1E2A45] to-[#FF6B2B]/08 border-[#FF6B2B]/30 hover:border-[#FF6B2B]/50"
          : "bg-[#1E2A45] border-white/[0.06] hover:bg-[#263354] hover:border-white/[0.12] hover:scale-[1.02]",
      ].join(" ")}
      aria-label={`${player.name} — απόδοση ${player.odds}x`}
    >
      {/* Shine */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

      <span className={`text-[10px] font-bold uppercase tracking-[0.04em] text-center leading-tight
                        ${isSelected ? "text-[#00E676]/80" : "text-[#94A3B8]"}`}>
        {abbreviate(player.name)}
      </span>
      <span className="text-[9px] text-[#4B5975]">NTRP {player.ntrp}</span>
      <span className={[
        "text-[28px] font-black tracking-[-0.03em] tabular-nums leading-none",
        isSelected  ? "text-[#00E676]"   :
        isUnderdog  ? "text-[#FF6B2B]"   :
        isFavorite  ? "text-[#38BDF8]"   : "text-white",
      ].join(" ")}>
        {player.odds.toFixed(2)}
        <span className="text-sm font-semibold ml-0.5 opacity-60">×</span>
      </span>

      {isSelected && (
        <span className="absolute top-2 right-2 text-[#00E676] text-xs font-black">✓</span>
      )}
      {isUnderdog && !isSelected && (
        <span className="absolute top-2 right-2 text-xs">🔥</span>
      )}
    </button>
  );
}
```

---

## STEP 5 — Replace Match List Table with Cards

Find the file rendering the matches table (look for `<table>` or `<tr>` elements in the matches page — likely `app/[lang]/matches/page.tsx` or a component like `MatchesTable.tsx` or `MatchList.tsx`).

Replace the table with:
```tsx
<div className="np-card-list space-y-0">
  {matches.map((match) => (
    <MatchCard
      key={match.id}
      id={match.id}
      tournament={match.tournament.name}
      round={match.round}
      category={translateCategory(match.category)}  // see helper below
      surface={match.surface}
      time={formatTime(match.scheduledAt)}
      date={formatDate(match.scheduledAt)}
      player1={{ id: match.player1.id, name: match.player1.name,
                 ntrp: match.player1.ntrp, odds: match.odds.player1 }}
      player2={{ id: match.player2.id, name: match.player2.name,
                 ntrp: match.player2.ntrp, odds: match.odds.player2 }}
      isActive={userPredictions.has(match.id)}
      isFeatured={match.featured}
      isLive={match.status === "live"}
      onSelectPlayer={handleSelectPlayer}
      onViewDetail={(id) => router.push(`/${lang}/matches/match/${id}`)}
    />
  ))}
</div>
```

Add this category translation helper near the top of the file:
```typescript
function translateCategory(cat: string): string {
  const map: Record<string, string> = {
    "MD/ADV": "Μέσο / Προχωρημένο",
    "MED/ADV": "Μέσο / Προχωρημένο",
    "MEDIUM": "Μεσαίο",
    "ADVANCED": "Προχωρημένο",
    "BEGINNER": "Αρχάριο",
    "-40": "Κάτω από 40",
    "40-49": "40–49 ετών",
    "50+": "50+ ετών",
  };
  // Strip leading "M " and look up
  const key = cat.replace(/^[MW]\s+/, "").trim();
  const gender = cat.startsWith("W") ? "Γυν. · " : "Ανδρ. · ";
  return gender + (map[key] ?? key);
}
```

---

## STEP 6 — Prediction Slip Redesign

Find the prediction slip / ΔΕΛΤΙΟ component (look for text "ΔΕΛΤΙΟ" or "slip" in component files).

Key changes:
1. Rename all instances of "ΔΕΛΤΙΟ" → "Οι Προβλέψεις Μου"
2. Rename "Κουπόνι" → "Λίστα Προβλέψεων"
3. Rename "Ενημέρωσε το Κουπόνι" → "Προσθήκη Πρόβλεψης"
4. Rename "Βάλε τις Προβλέψεις σου" → "Κάνε Πρόβλεψη"
5. Add auto-fill: when a prediction is added, default the ΠΟΣΟ (stake) input to `Math.min(100, userBalance)` instead of 0
6. Show live potential winnings: `Κερδίζεις: {(stake * odds).toFixed(0)} 🪙`

Slip container classes (mobile bottom sheet):
```
fixed bottom-16 left-0 right-0 z-50
bg-[#0F1628] border-t border-white/[0.12]
rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.8)]
transition-transform duration-400
```
- Hidden (no predictions): `translate-y-full`
- Peek (1+ predictions): `translate-y-[calc(100%-56px)]` (shows just the header bar)
- Open: `translate-y-0`

Submit button:
```
w-full py-4 rounded-xl bg-[#FFD60A] text-[#080C18]
font-black text-base tracking-wide
shadow-[0_4px_16px_rgba(255,214,10,0.3)]
hover:bg-[#FFE033] hover:-translate-y-px
active:scale-98 transition-all duration-150
disabled:bg-[#1E2A45] disabled:text-[#4B5975] disabled:shadow-none
```

---

## STEP 7 — Tournament Filter Tabs

Find the tournament filter (currently a carousel or button group at top of matches page).

Replace with this pattern:
```tsx
<div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -webkit-overflow-scrolling-touch">
  {tournaments.map((t) => (
    <button
      key={t.id}
      onClick={() => setActiveTournament(t.id)}
      className={[
        "flex-shrink-0 flex items-center gap-1.5 px-3.5 py-[7px]",
        "rounded-full text-[13px] font-semibold border transition-all duration-150",
        "whitespace-nowrap",
        activeTournament === t.id
          ? "bg-[#FFD60A]/10 border-[#FFD60A]/30 text-[#FFD60A]"
          : "bg-[#161F35] border-white/[0.06] text-[#94A3B8] hover:border-white/[0.12] hover:text-white",
      ].join(" ")}
    >
      {t.name}
      <span className={[
        "text-[11px] font-bold px-1.5 py-0.5 rounded-full",
        activeTournament === t.id
          ? "bg-[#FFD60A]/20"
          : "bg-white/[0.08]",
      ].join(" ")}>
        {t.matchCount}
      </span>
    </button>
  ))}
</div>
```

---

## STEP 8 — Leaderboard Page

Find `app/[lang]/leaderboard/page.tsx` (or similar).

1. Replace the empty state English text:
   - "No leaderboard data available yet..." →
   ```tsx
   <div className="flex flex-col items-center py-16 gap-4 text-center">
     <span className="text-5xl opacity-40">🏆</span>
     <p className="text-lg font-bold text-white">Δεν υπάρχει κατάταξη ακόμα</p>
     <p className="text-sm text-[#94A3B8] max-w-[260px]">
       Κάνε προβλέψεις αυτή την εβδομάδα και εμφανίσου στην κορυφή!
     </p>
     <button
       onClick={() => router.push(`/${lang}/matches`)}
       className="px-6 py-3 rounded-full bg-[#FFD60A] text-[#080C18] font-bold text-sm"
     >
       Πήγαινε στους Αγώνες →
     </button>
   </div>
   ```

2. Replace the stats row (0 / 0 / 0% / 0 participants) with a card grid:
   ```tsx
   <div className="grid grid-cols-2 gap-3 mb-6">
     {[
       { label: "Υψηλότερο Σκορ", value: topScore, icon: "⚡" },
       { label: "Καλύτερο Σερί",  value: bestStreak, icon: "🔥" },
       { label: "Μέση Ακρίβεια",  value: `${avgAccuracy}%`, icon: "🎯" },
       { label: "Παίκτες",        value: participants, icon: "👥" },
     ].map((s) => (
       <div key={s.label}
            className="bg-[#161F35] border border-white/[0.06] rounded-xl p-4">
         <div className="text-2xl mb-1">{s.icon}</div>
         <div className="text-xl font-black tabular-nums text-white">{s.value || "—"}</div>
         <div className="text-[11px] font-semibold text-[#4B5975] uppercase tracking-wide mt-0.5">
           {s.label}
         </div>
       </div>
     ))}
   </div>
   ```

3. Leaderboard row style:
   ```tsx
   <div className={[
     "flex items-center gap-3 p-4 rounded-xl border mb-2 transition-all",
     isMe ? "bg-[#00E676]/05 border-[#00E676]/25" :
     rank <= 3 ? "bg-[#161F35] border-[#FFD60A]/20" :
     "bg-[#161F35] border-white/[0.06]"
   ].join(" ")}>
     <span className={[
       "w-7 text-center font-black text-lg tabular-nums",
       rank === 1 ? "text-[#FFD60A]" :
       rank === 2 ? "text-[#C0C0C0]" :
       rank === 3 ? "text-[#CD7F32]" : "text-[#4B5975]"
     ].join(" ")}>
       {rank <= 3 ? ["🥇","🥈","🥉"][rank-1] : rank}
     </span>
     {/* avatar, name, score */}
   </div>
   ```

---

## STEP 9 — My Predictions Page (`/el/my-picks`)

Find the active predictions section.

1. Fix unlabelled numbers — add labels to each prediction card:
   ```tsx
   <div className="flex items-center justify-between text-sm mt-2">
     <span className="text-[#94A3B8]">
       Ποσό: <span className="text-white font-bold tabular-nums">
         {stake.toLocaleString("el-GR")} 🪙
       </span>
     </span>
     <span className="text-[#94A3B8]">
       Πιθανά Κέρδη: <span className="text-[#00E676] font-bold tabular-nums">
         {potentialWin.toLocaleString("el-GR")} 🪙
       </span>
     </span>
   </div>
   ```

2. Fix "Won" / "Lost" status badges:
   ```tsx
   const STATUS = {
     won:     { label: "✅ Κερδισμένη", class: "bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]" },
     lost:    { label: "❌ Χαμένη",    class: "bg-[#FF4545]/10 border-[#FF4545]/30 text-[#FF4545]" },
     pending: { label: "⏳ Σε Αναμονή", class: "bg-[#38BDF8]/10 border-[#38BDF8]/25 text-[#38BDF8]" },
     active:  { label: "🔥 Ενεργή",    class: "bg-[#FF6B2B]/10 border-[#FF6B2B]/30 text-[#FF6B2B]" },
   };
   ```

3. Fix "Πολ" column header → "Απόδοση"

4. Add summary strip at top of page:
   ```tsx
   <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-none">
     <StatPill icon="🎯" label="Ακρίβεια" value={`${accuracy}%`} />
     <StatPill icon="🪙" label="Κέρδη"    value={`+${earnings.toLocaleString("el-GR")}`} color="gold" />
     <StatPill icon="🔥" label="Σερί"     value={`${streak} ημ.`} color="orange" />
   </div>
   ```
   Where StatPill:
   ```tsx
   function StatPill({ icon, label, value, color = "default" }) {
     const colors = {
       default: "bg-[#161F35] border-white/[0.06] text-white",
       gold:    "bg-[#FFD60A]/10 border-[#FFD60A]/30 text-[#FFD60A]",
       orange:  "bg-[#FF6B2B]/10 border-[#FF6B2B]/30 text-[#FF6B2B]",
     };
     return (
       <div className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5
                        rounded-full border text-sm font-bold ${colors[color]}`}>
         <span>{icon}</span>
         <span className="text-[#94A3B8] font-medium">{label}:</span>
         <span className="tabular-nums">{value}</span>
       </div>
     );
   }
   ```

---

## STEP 10 — Shop / Rewards Page (`/el/rewards`)

Find the rewards page component.

1. Add a clear section separator between real-money and virtual-coin purchases:
   ```tsx
   {/* REAL MONEY SECTION */}
   <div className="mb-8">
     <div className="flex items-center gap-3 mb-1">
       <h2 className="text-base font-bold text-white">Αγορά Νομισμάτων</h2>
       <span className="px-2 py-0.5 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/25
                        text-[#38BDF8] text-[10px] font-bold">€ ΑΓΟΡΑ</span>
     </div>
     <p className="text-[13px] text-[#94A3B8] mb-4">
       Τα νομίσματα είναι εικονικά και χρησιμοποιούνται αποκλειστικά εντός της πλατφόρμας.
     </p>
     {/* coin pack cards */}
   </div>

   {/* DIVIDER */}
   <div className="flex items-center gap-3 my-6">
     <div className="flex-1 h-px bg-white/[0.06]" />
     <span className="text-[11px] font-bold text-[#4B5975] uppercase tracking-widest">
       ή ξόδεψε νομίσματα
     </span>
     <div className="flex-1 h-px bg-white/[0.06]" />
   </div>

   {/* VIRTUAL COINS SECTION */}
   <div>
     <h2 className="text-base font-bold text-white mb-4">Ενισχύσεις</h2>
     {/* power-up cards */}
   </div>
   ```

2. Make real-money buttons show price explicitly:
   ```tsx
   <button className="w-full py-3 rounded-xl bg-[#FFD60A] text-[#080C18] font-black text-sm
                      shadow-[0_4px_16px_rgba(255,214,10,0.3)] hover:bg-[#FFE033]
                      active:scale-98 transition-all">
     Αγορά — €{price}
   </button>
   ```

3. Remove "⭐ BEST DEAL" / "⭐ PRO" urgency labels. Replace with neutral:
   ```tsx
   {/* Instead of "BEST DEAL", show value calculation */}
   <span className="text-[11px] text-[#94A3B8]">
     {(coins / price).toFixed(0)} νομίσματα / €1
   </span>
   ```

4. Translate "Once per slip" → "Μία φορά ανά λίστα" and "Time-based" → "Χρονικά"

---

## STEP 11 — Match Detail Page

Find the match detail page (`app/[lang]/matches/match/[id]/page.tsx` or similar).

1. Fix "N: 17 Ήττες: 16":
   ```tsx
   <div className="flex items-center gap-3 text-sm">
     <span className="text-[#00E676] font-bold">✅ {wins} Νίκες</span>
     <span className="text-[#4B5975]">·</span>
     <span className="text-[#FF4545] font-bold">❌ {losses} Ήττες</span>
   </div>
   ```

2. Fix "Head-to-Head Record: No H2H details":
   ```tsx
   {h2hDetails
     ? <H2HStats data={h2hDetails} />
     : <p className="text-[#4B5975] text-sm">Δεν υπάρχουν κοινοί αγώνες</p>
   }
   ```

3. Fix "Best of 3" → "Καλύτερος από 3 σετ"

4. Auto-fill stake on prediction selection:
   ```typescript
   // When a player is selected, set default stake
   const defaultStake = Math.min(100, Math.floor(userBalance * 0.1));
   setStakeAmount(prev => prev > 0 ? prev : defaultStake);
   ```

5. Show live winnings preview immediately after stake is set:
   ```tsx
   {stakeAmount > 0 && selectedOdds && (
     <div className="flex items-center justify-between p-3 mt-3
                     bg-[#00E676]/08 border border-[#00E676]/25 rounded-xl">
       <span className="text-sm text-[#00E676]/70">Αν κερδίσεις:</span>
       <span className="text-lg font-black tabular-nums text-[#00E676]">
         {Math.floor(stakeAmount * selectedOdds).toLocaleString("el-GR")} 🪙
       </span>
     </div>
   )}
   ```

6. Replace "Ενημέρωσε το Κουπόνι" → "Προσθήκη Πρόβλεψης"

7. Add confirmation before final submission:
   ```tsx
   // Before calling the submit API, show a confirm step
   const [confirming, setConfirming] = useState(false);
   // Show: "Βάζεις X νομίσματα στη νίκη του ΠΑΙΚΤΗ. Αν κερδίσει → Y νομίσματα."
   // [Ναι, Κάνε Πρόβλεψη] [Ακύρωση]
   ```

---

## STEP 12 — Global Copy Fixes (grep + replace)

Run these replacements across ALL component files:

```
"ΔΕΛΤΙΟ"                    → "Οι Προβλέψεις Μου"
"Κουπόνι"                   → "Λίστα Προβλέψεων"  
"κουπόνι"                   → "λίστα προβλέψεων"
"Ενημέρωσε το Κουπόνι"      → "Προσθήκη Πρόβλεψης"
"παρολί"                    → "συνδυαστική πρόβλεψη"
"Παρολί"                    → "Συνδυαστική Πρόβλεψη"
"Won"                       → "Κερδισμένη"
"Lost"                      → "Χαμένη"
"No H2H details"            → "Δεν υπάρχουν κοινοί αγώνες"
"Best of 3"                 → "Καλύτερος από 3 σετ"
"Straight sets"             → "Χωρίς απώλεια σετ"
"No leaderboard data"       → "Δεν υπάρχουν ακόμα δεδομένα"
"TIME"  (table header)      → "ΩΡΑ"
"TOURNAMENT" (table header) → "ΤΟΥΡΝΟΥΑ"
"CATEGORY" (table header)   → "ΕΠΙΠΕΔΟ"
"ROUND" (table header)      → "ΦΑΣΗ"
"MATCH" (table header)      → "ΑΓΩΝΑΣ"
"ACTION" (table header)     → ""  (remove this column header entirely)
"Once per slip"             → "Μία φορά ανά λίστα"
"Time-based"                → "Χρονικά"
"Πολ" (table header)        → "Απόδοση"
"Welcome Bonus"             → "Μπόνους Εγγραφής"
"Leaderboard" (footer)      → "Κατάταξη"
"Player A vs Player B"      → actual match name from data
```

---

## Implementation Order

Do these steps in sequence. After each step, confirm the dev server still compiles:

1. globals.css + tailwind.config.ts (tokens)
2. BottomNav component + add to layout
3. Header update
4. MatchCard component
5. Replace match list table with MatchCard
6. Tournament filter tabs
7. Prediction slip rename + auto-fill + live winnings
8. Leaderboard empty state + row styles
9. My Predictions labels + status badges + summary strip
10. Shop section separator + copy fixes
11. Match detail fixes (stats, H2H, confirmation)
12. Global copy grep/replace

After all steps: run `npm run build` to catch any TypeScript errors.

---

## Notes

- Do NOT change any API calls, data fetching, or backend integration
- Do NOT remove any existing functionality — only change presentation
- Keep all existing routing, auth, and state management intact
- If a component is very large, make targeted edits rather than full rewrites
- Test on mobile viewport (375px) after each step
- The `Super Sans VF` font is already loaded — use it; don't import another font
