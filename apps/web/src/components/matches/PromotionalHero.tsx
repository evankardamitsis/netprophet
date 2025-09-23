'use client';

import { motion } from 'framer-motion';
import { Match } from '@/types/dashboard';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';

interface PromotionalHeroProps {
    featuredMatches: Match[];
    onSelectMatch: (match: Match) => void;
    lang: string;
}



export function PromotionalHero({
    featuredMatches,
    onSelectMatch,
    lang
}: PromotionalHeroProps) {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [cardsPerView, setCardsPerView] = useState(1);
    const [dragStart, setDragStart] = useState<number | null>(null);
    const [dragOffset, setDragOffset] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);




    // Promotional content items - Mixed layout
    const promotionalItems = [
        // Featured Match 1
        ...(featuredMatches[0] ? [{
            type: 'match',
            id: featuredMatches[0].id,
            title: featuredMatches[0].tournament || 'Tournament',
            subtitle: featuredMatches[0].round || 'Match',
            time: featuredMatches[0].time || 'TBD',
            players: [
                { name: featuredMatches[0].player1.name, odds: featuredMatches[0].player1.odds },
                { name: featuredMatches[0].player2.name, odds: featuredMatches[0].player2.odds }
            ],
            image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop&crop=center',
            action: () => onSelectMatch(featuredMatches[0]),
            actionText: lang === 'el' ? 'Δες Λεπτομέρειες' : 'View Details',
            secondaryAction: null,
            secondaryActionText: ''
        }] : []),
        // Power-ups promotion - Tennis themed
        {
            type: 'promo',
            id: 'power-ups',
            title: lang === 'el' ? 'Power-ups' : 'Power-ups',
            subtitle: lang === 'el' ? 'Βελτίωσε τις προβλέψεις σου' : 'Boost Your Predictions',
            time: lang === 'el' ? 'Διαθέσιμα τώρα' : 'Available Now',
            players: [],
            image: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeTYwNTQ0emJra3BoaWdkdDZsYXNpYWh1ZjJicmd0MG1pa3dlOWg0eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ls9hrqiE3ezVW5u7iE/giphy.gif', // Power-ups animation
            action: () => router.push(`/${lang}/power-ups`),
            actionText: lang === 'el' ? 'Δες Power-ups' : 'View Power-ups',
            secondaryAction: null,
            secondaryActionText: ''
        },
        // Featured Match 2
        ...(featuredMatches[1] ? [{
            type: 'match',
            id: featuredMatches[1].id,
            title: featuredMatches[1].tournament || 'Tournament',
            subtitle: featuredMatches[1].round || 'Match',
            time: featuredMatches[1].time || 'TBD',
            players: [
                { name: featuredMatches[1].player1.name, odds: featuredMatches[1].player1.odds },
                { name: featuredMatches[1].player2.name, odds: featuredMatches[1].player2.odds }
            ],
            image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop&crop=center',
            action: () => onSelectMatch(featuredMatches[1]),
            actionText: lang === 'el' ? 'Δες Λεπτομέρειες' : 'View Details',
            secondaryAction: null,
            secondaryActionText: ''
        }] : []),
        // Coin packs promotion - Tennis themed
        {
            type: 'promo',
            id: 'coin-packs',
            title: lang === 'el' ? 'Coin Packs' : 'Coin Packs',
            subtitle: lang === 'el' ? 'Αγόρασε νομίσματα' : 'Buy Coins',
            time: lang === 'el' ? 'Ειδικές προσφορές' : 'Special Offers',
            players: [],
            image: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGxhd3d1OTdkNWxiOXBjNzl5N2dycmxoa2M4NWl0Z3VnaHo1YjVndSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xUPGcJaL5ODxniWMNO/giphy.gif', // Coins dropping animation
            action: () => router.push(`/${lang}/shop`),
            actionText: lang === 'el' ? 'Αγόρασε' : 'Buy Now',
            secondaryAction: null,
            secondaryActionText: ''
        },
        // Featured Match 3
        ...(featuredMatches[2] ? [{
            type: 'match',
            id: featuredMatches[2].id,
            title: featuredMatches[2].tournament || 'Tournament',
            subtitle: featuredMatches[2].round || 'Match',
            time: featuredMatches[2].time || 'TBD',
            players: [
                { name: featuredMatches[2].player1.name, odds: featuredMatches[2].player1.odds },
                { name: featuredMatches[2].player2.name, odds: featuredMatches[2].player2.odds }
            ],
            image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop&crop=center',
            action: () => onSelectMatch(featuredMatches[2]),
            actionText: lang === 'el' ? 'Δες Λεπτομέρειες' : 'View Details',
            secondaryAction: null,
            secondaryActionText: ''
        }] : []),
        // Tournament results - Tennis themed
        {
            type: 'promo',
            id: 'tournament-results',
            title: lang === 'el' ? 'Αποτελέσματα' : 'Tournament Results',
            subtitle: lang === 'el' ? 'Δες τα τελευταία αποτελέσματα' : 'View Latest Results',
            time: lang === 'el' ? 'Ενημερωμένα' : 'Updated',
            players: [],
            image: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHM4ZzlyODZ2ZjZmNDJxMGRxYXAyY2liemUzdThnODJpaGVhbXc3OSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/tDQlA2505j56E2YEv8/giphy.gif', // Tennis tournament results animation
            action: () => router.push(`/${lang}/tournaments`),
            actionText: lang === 'el' ? 'Δες Αποτελέσματα' : 'View Results',
            secondaryAction: null,
            secondaryActionText: ''
        }
    ];

    // Navigation functions
    const scrollLeft = useCallback(() => {
        if (promotionalItems.length > cardsPerView) {
            setCurrentIndex(prev => {
                const maxIndex = promotionalItems.length - cardsPerView;
                return prev > 0 ? prev - 1 : maxIndex;
            });
        }
    }, [promotionalItems.length, cardsPerView]);

    const scrollRight = useCallback(() => {
        if (promotionalItems.length > cardsPerView) {
            setCurrentIndex(prev => {
                const maxIndex = promotionalItems.length - cardsPerView;
                return prev < maxIndex ? prev + 1 : 0;
            });
        }
    }, [promotionalItems.length, cardsPerView]);

    // Drag gesture handlers
    const handleDragStart = useCallback((clientX: number) => {
        setDragStart(clientX);
        setDragOffset(0);
        setIsPaused(true);
    }, []);

    const handleDragMove = useCallback((clientX: number) => {
        if (dragStart !== null) {
            setDragOffset(clientX - dragStart);
        }
    }, [dragStart]);

    const handleDragEnd = useCallback(() => {
        if (dragStart !== null) {
            const threshold = 50;
            if (Math.abs(dragOffset) > threshold) {
                if (dragOffset > 0) {
                    scrollLeft();
                } else {
                    scrollRight();
                }
            }
            setDragStart(null);
            setDragOffset(0);
            setIsPaused(false);
        }
    }, [dragStart, dragOffset, scrollLeft, scrollRight]);

    // Responsive cards per view calculation
    useEffect(() => {
        const updateCardsPerView = () => {
            const width = window.innerWidth;
            if (width >= 1536) { // 2xl
                setCardsPerView(4);
            } else if (width >= 1280) { // xl
                setCardsPerView(3);
            } else if (width >= 1024) { // lg
                setCardsPerView(2);
            } else {
                setCardsPerView(1);
            }
        };

        updateCardsPerView();
        window.addEventListener('resize', updateCardsPerView);
        return () => window.removeEventListener('resize', updateCardsPerView);
    }, []);

    // Auto-scroll functionality
    useEffect(() => {
        if (!isPaused && promotionalItems.length > cardsPerView) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex((prevIndex) => {
                    const maxIndex = promotionalItems.length - cardsPerView;
                    return (prevIndex + 1) % (maxIndex + 1);
                });
            }, 4000); // Change slide every 4 seconds
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isPaused, promotionalItems.length, cardsPerView]);

    if (!featuredMatches || featuredMatches.length === 0) {
        return null;
    }

    return (
        <div className="w-full mb-8">
            {/* Navigation arrows - right aligned */}
            {promotionalItems.length > cardsPerView && (
                <div className="flex justify-end mb-4">
                    {/* Desktop arrows */}
                    <div className="hidden lg:flex gap-2">
                        <button
                            onClick={scrollLeft}
                            className="w-8 h-8 text-white flex items-center justify-center transition-all duration-200 hover:text-yellow-400 hover:scale-110 hover:bg-slate-700/50 rounded-full"
                            aria-label="Scroll left"
                        >
                            ←
                        </button>
                        <button
                            onClick={scrollRight}
                            className="w-8 h-8 text-white flex items-center justify-center transition-all duration-200 hover:text-yellow-400 hover:scale-110 hover:bg-slate-700/50 rounded-full"
                            aria-label="Scroll right"
                        >
                            →
                        </button>
                    </div>
                    {/* Mobile arrows */}
                    <div className="flex lg:hidden gap-2">
                        <button
                            onClick={scrollLeft}
                            className="w-6 h-6 text-white flex items-center justify-center transition-all duration-200 hover:text-yellow-400 hover:scale-110 hover:bg-slate-700/50 rounded-full"
                            aria-label="Scroll left"
                        >
                            ←
                        </button>
                        <button
                            onClick={scrollRight}
                            className="w-6 h-6 text-white flex items-center justify-center transition-all duration-200 hover:text-yellow-400 hover:scale-110 hover:bg-slate-700/50 rounded-full"
                            aria-label="Scroll right"
                        >
                            →
                        </button>
                    </div>
                </div>
            )}

            {/* Carousel Container */}
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
                {/* Carousel Track */}
                <motion.div
                    className="flex"
                    animate={{ x: -(currentIndex * (100 / cardsPerView)) + '%' }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                    {promotionalItems.map((item, index) => (
                        <div
                            key={item.id}
                            className={`flex-shrink-0 px-2 ${cardsPerView === 1 ? 'w-full' :
                                cardsPerView === 2 ? 'w-1/2' :
                                    cardsPerView === 3 ? 'w-1/3' :
                                        'w-1/4'
                                }`}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="group"
                            >
                                {item.type === 'match' ? (
                                    // Featured Match Card - Same height as promo cards
                                    <div className="border rounded-2xl border-yellow-400 bg-slate-800/50 backdrop-blur-sm hover:bg-yellow-900/10 cursor-pointer group transition-all duration-150 h-64 relative overflow-hidden">
                                        {/* Featured Badge */}
                                        <span className="absolute top-3 left-3 text-[9px] font-bold px-2 py-1 rounded-full bg-yellow-400/20 text-yellow-300">
                                            FEATURED
                                        </span>

                                        {/* Content */}
                                        <div className="relative z-10 h-full flex flex-col p-3 pt-12">
                                            {/* Match Header */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex flex-col">
                                                    <div className="text-yellow-400 text-xs font-bold truncate">
                                                        {item.title}
                                                    </div>
                                                    {item.subtitle && item.subtitle !== 'Match' && (
                                                        <div className="text-gray-300 text-xs truncate">
                                                            {item.subtitle}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-white text-sm font-bold">
                                                    {item.time}
                                                </div>
                                            </div>

                                            {/* Diagonal Split Players Section */}
                                            <div className="flex-1 relative mb-3">
                                                {/* Player 1 - Top Left */}
                                                <div className="absolute top-2 left-2 w-3/5 h-3/5 flex flex-col justify-center items-start">
                                                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-lg p-3 w-full">
                                                        <div className="text-white text-sm font-bold mb-1 leading-tight">
                                                            {item.players[0]?.name || 'Player 1'}
                                                        </div>
                                                        <div className="text-yellow-400 text-xs font-bold">
                                                            {item.players[0]?.odds.toFixed(2) || '1.19'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Player 2 - Bottom Right */}
                                                <div className="absolute bottom-2 right-2 w-3/5 h-3/5 flex flex-col justify-center items-end">
                                                    <div className="bg-gradient-to-br from-red-500/20 to-red-600/30 rounded-lg p-3 w-full">
                                                        <div className="text-white text-sm font-bold mb-1 text-right leading-tight">
                                                            {item.players[1]?.name || 'Player 2'}
                                                        </div>
                                                        <div className="text-yellow-400 text-xs font-bold text-right">
                                                            {item.players[1]?.odds.toFixed(2) || '17.75'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* VS in Center */}
                                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                                    <div className="bg-yellow-400/20 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center">
                                                        <span className="text-yellow-400 text-xs font-bold">VS</span>
                                                    </div>
                                                </div>

                                                {/* Diagonal Line */}
                                                <div className="absolute top-0 left-0 w-full h-full">
                                                    <div className="absolute top-0 left-0 w-full h-full">
                                                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                            <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>


                                            {/* Action Button */}
                                            <div className="flex-shrink-0">
                                                <button
                                                    onClick={item.action}
                                                    className="w-full px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                                                >
                                                    {item.actionText}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Hover Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </div>
                                ) : (
                                    // Promotional Card - Enhanced Style
                                    <div className="relative overflow-hidden rounded-2xl border border-white/20 hover:border-yellow-400/50 transition-all duration-300 h-64 shadow-2xl">
                                        {item.id === 'coin-packs' ? (
                                            // Coin Packs - Coin Pattern Image Background
                                            <div
                                                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                                                style={{
                                                    backgroundImage: `url(${item.image})`,
                                                }}
                                            >
                                                <div className="absolute inset-0 bg-black/60"></div>
                                            </div>
                                        ) : (
                                            // Other promos - Image Background
                                            <div
                                                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                                                style={{
                                                    backgroundImage: `url(${item.image})`,
                                                }}
                                            >
                                                <div className="absolute inset-0 bg-black/60"></div>
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="relative z-10 h-full flex flex-col p-4">
                                            {/* Header */}
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                                                    <span className="text-black text-lg font-bold">NP</span>
                                                </div>
                                            </div>

                                            {/* Promo Content */}
                                            <div className="flex-1 flex flex-col justify-center">
                                                <div className="text-white text-2xl font-bold mb-2">
                                                    {item.title}
                                                </div>
                                                <div className="text-white text-lg mb-4">
                                                    {item.subtitle}
                                                </div>
                                                <div className="text-white text-sm mb-4">
                                                    {item.time}
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <div className="space-y-2">
                                                <button
                                                    onClick={item.action}
                                                    className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-lg"
                                                >
                                                    {item.actionText}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    ))}
                </motion.div>

                {/* Carousel Indicators */}
                {promotionalItems.length > cardsPerView && (
                    <div className="flex justify-center mt-4 space-x-2">
                        {Array.from({ length: promotionalItems.length - cardsPerView + 1 }).map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentIndex
                                    ? 'bg-yellow-400 w-8'
                                    : 'bg-white/30 hover:bg-white/50'
                                    }`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
