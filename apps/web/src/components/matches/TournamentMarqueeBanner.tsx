'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@netprophet/lib';
import { createSlug } from '@/lib/utils';

interface ActiveTournament {
    id: string;
    name: string;
}

interface TournamentMarqueeBannerProps {
    lang?: string;
}

export function TournamentMarqueeBanner({ lang = 'el' }: TournamentMarqueeBannerProps) {
    const [tournaments, setTournaments] = useState<ActiveTournament[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const now = new Date().toISOString().split('T')[0];
                const { data, error } = await supabase
                    .from('tournaments')
                    .select('id, name')
                    .lte('start_date', now)
                    .gte('end_date', now)
                    .order('name', { ascending: true });
                if (error) throw error;
                setTournaments(data || []);
            } catch (error) {
                console.error('Error loading active tournaments:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading || tournaments.length === 0) return null;

    const renderItems = (keyPrefix: string) =>
        tournaments.flatMap((t) => [
            <Link
                key={`${keyPrefix}-${t.id}`}
                href={`/${lang}/tournaments/${createSlug(t.name)}`}
                className="flex-shrink-0 whitespace-nowrap px-4 font-black text-purple-900 hover:text-purple-800 transition-colors text-xs sm:text-sm md:text-base"
            >
                {t.name}
            </Link>,
            <span key={`${keyPrefix}-sep-${t.id}`} className="flex-shrink-0 px-2 text-purple-600 font-bold">•</span>
        ]).slice(0, -1); // Remove trailing separator

    return (
        <div className="relative z-[60] w-full flex-shrink-0 overflow-hidden bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 border-b-2 border-yellow-500 shadow-lg">
            <div className="flex animate-tournament-marquee w-max">
                <div className="flex items-center py-1 md:py-2">
                    {renderItems('a')}
                </div>
                <div className="flex items-center py-1 md:py-2" aria-hidden>
                    {renderItems('b')}
                </div>
            </div>
        </div>
    );
}
