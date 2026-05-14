'use client';

import { useState, useEffect, useMemo } from 'react';
import { Player } from '@netprophet/lib';
import { fetchActivePlayers } from '@netprophet/lib';
import { PlayerCard } from '@/components/players/PlayerCard';
import { useDictionary } from '@/context/DictionaryContext';
import { normalizeText } from '@/lib/utils';

const GENDER_OPTIONS = [
    { value: 'all',   label: 'Όλοι' },
    { value: 'men',   label: 'Άντρες' },
    { value: 'women', label: 'Γυναίκες' },
];

export default function PlayersPage() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGender, setSelectedGender] = useState<string>('all');
    const { dict } = useDictionary();

    useEffect(() => {
        fetchActivePlayers()
            .then(setPlayers)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filteredPlayers = useMemo(() => {
        return players.filter(player => {
            const matchesSearch = searchTerm === '' ||
                normalizeText(player.firstName).includes(normalizeText(searchTerm)) ||
                normalizeText(player.lastName).includes(normalizeText(searchTerm));
            const gender = (player as any).gender;
            const matchesGender = selectedGender === 'all' || gender === selectedGender;
            return matchesSearch && matchesGender;
        });
    }, [players, searchTerm, selectedGender]);

    if (loading) {
        return (
            <div className="px-4 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="rounded-2xl bg-[#161F35] border border-white/[0.06] overflow-hidden animate-pulse">
                            <div className="aspect-[4/3] bg-[#1E2A45]" />
                            <div className="p-4 space-y-3">
                                <div className="h-4 bg-[#1E2A45] rounded-full w-3/4" />
                                <div className="h-3 bg-[#1E2A45] rounded-full w-1/2" />
                                <div className="h-2 bg-[#1E2A45] rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-6 space-y-6 np-page-pad">
            {/* Page header */}
            <div>
                <h1 className="text-xl font-black text-white tracking-tight">
                    {dict?.athletes?.title || 'Αθλητές'}
                </h1>
                <p className="text-[13px] text-[#94A3B8] mt-0.5">
                    {dict?.athletes?.subtitle || 'Στατιστικά & επίδοση'}
                </p>
            </div>

            {/* Search + filters */}
            <div className="space-y-3">
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5975]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder={dict?.athletes?.searchPlaceholder || 'Αναζήτηση αθλητή...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-[#161F35] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-[#4B5975] focus:outline-none focus:border-white/[0.2] transition-colors"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5975] hover:text-white transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {GENDER_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setSelectedGender(opt.value)}
                            className={[
                                'px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-all duration-150',
                                selectedGender === opt.value
                                    ? 'bg-[#FFD60A]/10 border-[#FFD60A]/30 text-[#FFD60A]'
                                    : 'bg-[#161F35] border-white/[0.06] text-[#94A3B8] hover:border-white/[0.12] hover:text-white',
                            ].join(' ')}
                        >
                            {opt.label}
                        </button>
                    ))}
                    <span className="ml-auto text-[11px] font-bold text-[#4B5975] tabular-nums">
                        {filteredPlayers.length} αθλητές
                    </span>
                </div>
            </div>

            {/* Grid */}
            {filteredPlayers.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-4 text-center">
                    <span className="text-5xl opacity-30">🎾</span>
                    <p className="text-base font-bold text-white">{dict?.athletes?.noAthletesFound || 'Δεν βρέθηκαν αθλητές'}</p>
                    <p className="text-sm text-[#94A3B8]">{dict?.athletes?.tryDifferentSearch || 'Δοκίμασε διαφορετική αναζήτηση'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPlayers.map(player => (
                        <PlayerCard key={player.id} player={player} />
                    ))}
                </div>
            )}
        </div>
    );
}
