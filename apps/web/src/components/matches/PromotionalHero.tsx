'use client';

import { Match } from '@/types/dashboard';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import CoinIcon from '@/components/CoinIcon';

interface PromotionalHeroProps {
    featuredMatches: Match[];
    onSelectMatch: (match: Match) => void;
    lang: string;
}

export function PromotionalHero({ featuredMatches, onSelectMatch, lang }: PromotionalHeroProps) {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [cardsPerView, setCardsPerView] = useState(1);
    const [dragStart, setDragStart] = useState<number | null>(null);
    const [dragOffset, setDragOffset] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const abbreviateName = (name: string) => {
        const parts = name.trim().split(/\s+/);
        if (parts.length < 2) return name;
        return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
    };

    const items = [
        { type: 'coins' as const, id: 'coin-packs' },
        ...(featuredMatches || []).slice(0, 3).map(m => ({
            type: 'match' as const,
            id: m.id,
            match: m,
        })),
    ];

    const maxIndex = Math.max(0, items.length - cardsPerView);
    const safeIndex = Math.min(currentIndex, maxIndex);

    const scrollLeft = useCallback(() => {
        setCurrentIndex(prev => {
            const max = Math.max(0, items.length - cardsPerView);
            return prev > 0 ? prev - 1 : max;
        });
    }, [items.length, cardsPerView]);

    const scrollRight = useCallback(() => {
        setCurrentIndex(prev => {
            const max = Math.max(0, items.length - cardsPerView);
            return prev < max ? prev + 1 : 0;
        });
    }, [items.length, cardsPerView]);

    const handleDragStart = useCallback((clientX: number) => {
        setDragStart(clientX);
        setDragOffset(0);
        setIsPaused(true);
    }, []);

    const handleDragMove = useCallback((clientX: number) => {
        if (dragStart !== null) setDragOffset(clientX - dragStart);
    }, [dragStart]);

    const handleDragEnd = useCallback(() => {
        if (dragStart !== null) {
            if (Math.abs(dragOffset) > 50) {
                dragOffset > 0 ? scrollLeft() : scrollRight();
            }
            setDragStart(null);
            setDragOffset(0);
            setIsPaused(false);
        }
    }, [dragStart, dragOffset, scrollLeft, scrollRight]);

    useEffect(() => {
        const update = () => {
            const w = window.innerWidth;
            setCardsPerView(w >= 1280 ? 3 : w >= 1024 ? 2 : 1);
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    useEffect(() => {
        if (!isPaused && items.length > cardsPerView) {
            intervalRef.current = setInterval(scrollRight, 4500);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isPaused, items.length, cardsPerView, scrollRight]);

    return (
        <div className="w-full mb-8">
            <div
                ref={containerRef}
                className="relative overflow-hidden"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onMouseDown={(e) => handleDragStart(e.clientX)}
                onMouseMove={(e) => handleDragMove(e.clientX)}
                onMouseUp={handleDragEnd}
                onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
                onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
                onTouchEnd={handleDragEnd}
            >
                <motion.div
                    className="flex"
                    animate={{ x: `${-(safeIndex * (100 / cardsPerView))}%` }}
                    transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                >
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className={`flex-shrink-0 px-1.5 ${
                                cardsPerView === 1 ? 'w-full' :
                                cardsPerView === 2 ? 'w-1/2' : 'w-1/3'
                            }`}
                        >
                            {item.type === 'coins' ? (
                                <CoinPackCard
                                    lang={lang}
                                    onClick={() => router.push(`/${lang}/rewards`)}
                                />
                            ) : (
                                <MatchHeroCard
                                    match={item.match!}
                                    onPredict={() => onSelectMatch(item.match!)}
                                    abbreviateName={abbreviateName}
                                    lang={lang}
                                />
                            )}
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Dot indicators */}
            {items.length > cardsPerView && (
                <div className="flex items-center justify-center gap-1.5 mt-3">
                    {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === safeIndex
                                    ? 'w-6 bg-[#FFD60A]'
                                    : 'w-1.5 bg-white/20 hover:bg-white/40'
                            }`}
                            aria-label={`Slide ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Coin Pack monetization card ── */
function CoinPackCard({ lang, onClick }: { lang: string; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="relative overflow-hidden rounded-2xl border border-[#FFD60A]/25 bg-[#161F35] cursor-pointer group h-[200px] flex flex-col p-4 hover:border-[#FFD60A]/45 hover:-translate-y-px transition-all duration-150"
        >
            {/* Top shine */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFD60A]/20 to-transparent" />
            {/* Corner glow */}
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[#FFD60A]/08 blur-2xl pointer-events-none" />

            {/* Badge */}
            <div className="mb-auto">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FFD60A]/10 border border-[#FFD60A]/30 text-[#FFD60A] text-[10px] font-black tracking-wide">
                    <CoinIcon size={12} /> ΝΟΜΙΣΜΑΤΑ
                </span>
            </div>

            {/* Body */}
            <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-white font-black text-xl leading-tight">
                        Αγόρασε<br />Νομίσματα
                    </p>
                    <p className="text-[#94A3B8] text-[12px] mt-1 leading-snug">
                        Κάνε προβλέψεις &amp; ανέβα στην κατάταξη
                    </p>
                    <p className="text-[#FFD60A] text-[11px] font-bold mt-1 flex items-center gap-1">
                        Από €1,99 · 500 <CoinIcon size={13} />
                    </p>
                </div>
                <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    <CoinIcon size={56} />
                </div>
            </div>

            {/* CTA */}
            <button
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="w-full mt-3 py-2.5 rounded-xl bg-[#FFD60A] text-[#080C18] font-black text-sm shadow-[0_4px_16px_rgba(255,214,10,0.25)] hover:bg-[#FFE033] active:scale-[0.98] transition-all duration-150"
            >
                {lang === 'el' ? 'Αγόρασε Τώρα' : 'Buy Now'}
            </button>
        </div>
    );
}

/* ── Featured match card ── */
function MatchHeroCard({
    match,
    onPredict,
    abbreviateName,
    lang,
}: {
    match: Match;
    onPredict: () => void;
    abbreviateName: (name: string) => string;
    lang: string;
}) {
    const p1Fav = match.player1.odds <= match.player2.odds;
    const isLive = match.status === 'live' || match.status === 'in_progress';

    return (
        <div
            onClick={onPredict}
            className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#161F35] h-[200px] flex flex-col p-4 hover:border-white/[0.12] hover:-translate-y-px transition-all duration-150 cursor-pointer"
        >
            {/* Top shine */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 min-w-0">
                    {isLive && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#FF4545]/12 border border-[#FF4545]/30 text-[#FF4545] text-[9px] font-black flex-shrink-0">
                            🔴 LIVE
                        </span>
                    )}
                    <span className="text-[#94A3B8] text-[11px] font-semibold truncate">
                        {match.tournament}
                        {match.round && (
                            <span className="text-[#4B5975]"> · {match.round}</span>
                        )}
                    </span>
                </div>
                <span className="text-[#4B5975] text-[11px] tabular-nums flex-shrink-0">
                    {match.time}
                </span>
            </div>

            {/* Odds panels */}
            <div className="flex items-stretch gap-2 flex-1">
                {/* Player 1 */}
                <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-2 rounded-xl bg-[#1E2A45] border border-white/[0.06] gap-1 min-w-0">
                    <span className="text-[10px] font-bold text-[#94A3B8] leading-tight w-full truncate">
                        {abbreviateName(match.player1.name)}
                    </span>
                    <span className={`text-2xl font-black tabular-nums leading-none ${p1Fav ? 'text-[#38BDF8]' : 'text-[#FF6B2B]'}`}>
                        {match.player1.odds.toFixed(2)}
                        <span className="text-sm opacity-60 ml-0.5">×</span>
                    </span>
                </div>

                {/* VS */}
                <div className="flex items-center justify-center w-5 flex-shrink-0">
                    <span
                        className="text-[8px] font-black text-[#4B5975] tracking-[0.1em]"
                        style={{ writingMode: 'vertical-rl' }}
                    >
                        VS
                    </span>
                </div>

                {/* Player 2 */}
                <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-2 rounded-xl bg-[#1E2A45] border border-white/[0.06] gap-1 min-w-0">
                    <span className="text-[10px] font-bold text-[#94A3B8] leading-tight w-full truncate">
                        {abbreviateName(match.player2.name)}
                    </span>
                    <span className={`text-2xl font-black tabular-nums leading-none ${!p1Fav ? 'text-[#38BDF8]' : 'text-[#FF6B2B]'}`}>
                        {match.player2.odds.toFixed(2)}
                        <span className="text-sm opacity-60 ml-0.5">×</span>
                    </span>
                </div>
            </div>

            {/* CTA */}
            <button
                onClick={(e) => { e.stopPropagation(); onPredict(); }}
                className="w-full mt-3 py-2 rounded-xl bg-[#FFD60A] text-[#080C18] font-black text-sm shadow-[0_4px_16px_rgba(255,214,10,0.25)] hover:bg-[#FFE033] active:scale-[0.98] transition-all duration-150"
            >
                {lang === 'el' ? 'Κάνε Πρόβλεψη' : 'Make a Prediction'}
            </button>
        </div>
    );
}
