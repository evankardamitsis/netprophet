"use client";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { label: "Αγώνες",   icon: "🎾", path: "/matches"     },
  { label: "Κατάταξη", icon: "🏆", path: "/leaderboard" },
  { label: "SLIP",     icon: "📋", path: null, isFab: true },
  { label: "Αθλητές",  icon: "👤", path: "/players"     },
  { label: "Προφίλ",   icon: "👛", path: "/my-picks"    },
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
