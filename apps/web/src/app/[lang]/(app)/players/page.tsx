'use client';

import { useState, useEffect, useMemo } from 'react';
import { Player } from '@netprophet/lib';
import { fetchActivePlayers } from '@netprophet/lib';
import { PlayerCard } from '@/components/players/PlayerCard';
import { useDictionary } from '@/context/DictionaryContext';
import { Card, CardContent } from '@netprophet/ui';
import { normalizeText } from '@/lib/utils';

export default function PlayersPage() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSurface, setSelectedSurface] = useState<string>('all');
    const { dict } = useDictionary();

    useEffect(() => {
        const loadPlayers = async () => {
            try {
                setLoading(true);
                const fetchedPlayers = await fetchActivePlayers();
                setPlayers(fetchedPlayers);
            } catch (error) {
                console.error('Error loading players:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPlayers();
    }, []);

    const filteredPlayers = useMemo(() => {
        return players.filter(player => {
            const matchesSearch = searchTerm === '' ||
                normalizeText(player.firstName).includes(normalizeText(searchTerm)) ||
                normalizeText(player.lastName).includes(normalizeText(searchTerm));

            const matchesSurface = selectedSurface === 'all' ||
                player.surfacePreference.toLowerCase() === selectedSurface.toLowerCase();

            return matchesSearch && matchesSurface;
        });
    }, [players, searchTerm, selectedSurface]);

    const surfaces = useMemo(() => {
        const uniqueSurfaces = Array.from(new Set(players.map(p => p.surfacePreference)));
        return ['all', ...uniqueSurfaces];
    }, [players]);

    if (loading) {
        return (
            <div className="min-h-screen relative" style={{ backgroundColor: '#121A39' }}>
                <div className="text-center py-12">
                    <div className="inline-block p-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto" />
                    </div>
                    <p className="text-white text-lg font-bold">Loading players...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative" style={{ backgroundColor: '#121A39' }}>
            {/* Decorative circles */}
            <div className="absolute top-20 left-10 w-32 h-32 bg-purple-400 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute top-40 right-20 w-48 h-48 bg-pink-400 rounded-full opacity-15 blur-3xl"></div>
            <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-indigo-400 rounded-full opacity-20 blur-3xl"></div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 relative z-10">
                {/* Header */}
                <div className="mb-8 sm:mb-12 text-center">
                    <div className="inline-block px-4 py-2 rounded-full mb-4" style={{ backgroundColor: '#BE05A1' }}>
                        <p className="text-sm sm:text-base text-white font-bold">
                            👥 {dict?.players?.title || 'Players'}
                        </p>
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
                        {dict?.players?.title || 'Players'}
                    </h1>
                    <p className="text-lg sm:text-xl text-white/90 font-bold max-w-2xl mx-auto">
                        {dict?.players?.subtitle || 'Discover detailed player statistics and performance data'}
                    </p>
                </div>

                {/* Search and Filters */}
                <div className="mb-8 sm:mb-10 space-y-6">
                    {/* Search */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={dict?.players?.searchPlaceholder || "Search players..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-6 py-4 bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-purple-500/30 rounded-2xl text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 transition-all text-lg"
                            />
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-2xl">
                                🔍
                            </div>
                        </div>
                    </div>

                    {/* Surface Filter */}
                    <div className="flex flex-wrap gap-3">
                        {surfaces.map((surface) => (
                            <button
                                key={surface}
                                onClick={() => setSelectedSurface(surface)}
                                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all transform hover:scale-105 ${selectedSurface === surface
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                                    : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700/70 border border-slate-600/50'
                                    }`}
                            >
                                {surface === 'all' ? (dict?.players?.allSurfaces || 'All Surfaces') : surface}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Results Count */}
                <div className="mb-6 sm:mb-8">
                    <div className="inline-block bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-purple-500/30">
                        <p className="text-white font-bold">
                            <span className="text-purple-300">{filteredPlayers.length}</span> {dict?.players?.playersFound || 'players found'}
                        </p>
                    </div>
                </div>

                {/* Players Grid */}
                {filteredPlayers.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="inline-block p-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mb-4">
                            <span className="text-4xl">🎾</span>
                        </div>
                        <div className="text-white text-lg font-bold mb-2">
                            {dict?.players?.noPlayersFound || 'No players found'}
                        </div>
                        <p className="text-purple-300">
                            {dict?.players?.tryDifferentSearch || 'Try adjusting your search criteria'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                        {filteredPlayers.map((player) => (
                            <PlayerCard key={player.id} player={player} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
