"use client";
import { useState } from "react";
import { useDictionary } from "@/context/DictionaryContext";

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
  isActive?: boolean;
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

function formatRoundLabel(round: string): string | null {
  const trimmed = round?.trim();
  if (!trimmed) return null;
  return ROUND_MAP[trimmed] ?? trimmed;
}

function getRoundProminence(round: string): "final" | "semifinal" | null {
  const r = round.trim().toLowerCase();
  if (r.includes("semifinal")) return "semifinal";
  if (r.includes("final") && !r.includes("semi") && !r.includes("quarter")) return "final";
  return null;
}

const SURFACE_STYLE: Record<string, { color: string; emoji: string }> = {
  "Clay Court":  { color: "text-[#CD7F32]", emoji: "🟤" },
  "Hard Court":  { color: "text-[#38BDF8]", emoji: "🔵" },
  "Grass Court": { color: "text-[#00E676]", emoji: "🟢" },
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
  const { prepForUppercaseDisplay } = useDictionary();
  const sel = selectedPlayer !== undefined ? selectedPlayer : localSel;

  const handleSelect = (p: "player1" | "player2") => {
    const next = sel === p ? null : p;
    setLocalSel(next);
    if (next) onSelectPlayer?.(id, p);
  };

  const isUnderdog1 = player1.odds > player2.odds * 1.8;
  const isUnderdog2 = player2.odds > player1.odds * 1.8;
  const surfaceInfo = surface ? SURFACE_STYLE[surface] : null;
  const roundLabel = formatRoundLabel(round);
  const roundProminence = getRoundProminence(round);

  return (
    <article
      className={[
        "relative overflow-hidden rounded-[20px] p-4 mb-3 cursor-pointer",
        "border-2 transition-all duration-150",
        "animate-fade-in-up",
        isActive
          ? "bg-[#161F35] border-[#00E676] shadow-glow-green"
          : isFeatured
          ? "bg-gradient-to-br from-[#1E2A45] to-[#1a2340] border-[#8B5CF6]/40 shadow-glow-violet"
          : "bg-[#161F35] border-white/[0.06] hover:border-white/[0.12] hover:-translate-y-px hover:shadow-elevated",
      ].join(" ")}
      onClick={() => onViewDetail?.(id)}
    >
      {/* Shine line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

      {/* META ROW */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex flex-col gap-1 min-w-0 max-w-[55%]">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full w-fit max-w-full
                           bg-[#8B5CF6]/10 border border-[#8B5CF6]/28
                           text-[10px] font-bold text-[#C4B5FD] tracking-[0.03em] truncate">
            {isFeatured && "⭐ "}{tournament}
          </span>
          {roundLabel && (
            <span
              className={[
                "w-fit max-w-full truncate tracking-[0.04em]",
                roundProminence === "final"
                  ? "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-[#FFD60A]/15 border border-[#FFD60A]/50 text-[#FFD60A] shadow-glow-gold"
                  : roundProminence === "semifinal"
                  ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FFD60A]/10 border border-[#FFD60A]/35 text-[#FFD60A]"
                  : "text-[10px] font-bold text-[#94A3B8] pl-0.5",
              ].join(" ")}
            >
              {roundProminence === "final" && "🏆 "}
              {roundProminence === "semifinal" && "⚡ "}
              {roundProminence
                ? prepForUppercaseDisplay(roundLabel)
                : roundLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 text-[#94A3B8] text-[11px] pt-0.5">
          {isLive && (
            <span className="px-2 py-0.5 rounded-full bg-[#FF4545]/12 border border-[#FF4545]/30
                             text-[#FF4545] text-[10px] font-bold animate-pulse">
              🔴 LIVE
            </span>
          )}
          <span className="tabular-nums">{time}</span>
          <span className="text-[#4B5975]">{date}</span>
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
          prepForUppercaseDisplay={prepForUppercaseDisplay}
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
          prepForUppercaseDisplay={prepForUppercaseDisplay}
          onClick={() => handleSelect("player2")}
        />
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06] gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-[#4B5975] tracking-[0.05em] uppercase">
            {prepForUppercaseDisplay(category)}
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
  player, isSelected, isUnderdog, isFavorite, side, prepForUppercaseDisplay, onClick,
}: {
  player: Player;
  isSelected: boolean;
  isUnderdog: boolean;
  isFavorite: boolean;
  side: "left" | "right";
  prepForUppercaseDisplay: (text: string) => string;
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
        {prepForUppercaseDisplay(abbreviate(player.name))}
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
