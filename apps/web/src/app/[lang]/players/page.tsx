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
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
                    <p className="mt-4 text-gray-400">Loading players...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">
                    {dict?.players?.title || 'Players'}
                </h1>
                <p className="text-gray-400">
                    {dict?.players?.subtitle || 'Discover detailed player statistics and performance data'}
                </p>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 sm:mb-8 space-y-4">
                {/* Search */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder={dict?.players?.searchPlaceholder || "Search players..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        🔍
                    </div>
                </div>

                {/* Surface Filter */}
                <div className="flex flex-wrap gap-2">
                    {surfaces.map((surface) => (
                        <button
                            key={surface}
                            onClick={() => setSelectedSurface(surface)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedSurface === surface
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700/50'
                                }`}
                        >
                            {surface === 'all' ? (dict?.players?.allSurfaces || 'All Surfaces') : surface}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 sm:mb-6">
                <p className="text-gray-400">
                    {filteredPlayers.length} {dict?.players?.playersFound || 'players found'}
                </p>
            </div>

            {/* Players Grid */}
            {filteredPlayers.length === 0 ? (
                <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-8 text-center">
                        <div className="text-gray-400 text-lg mb-2">
                            {dict?.players?.noPlayersFound || 'No players found'}
                        </div>
                        <p className="text-gray-500">
                            {dict?.players?.tryDifferentSearch || 'Try adjusting your search criteria'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {filteredPlayers.map((player) => (
                        <PlayerCard key={player.id} player={player} />
                    ))}
                </div>
            )}
        </div>
    );
}
