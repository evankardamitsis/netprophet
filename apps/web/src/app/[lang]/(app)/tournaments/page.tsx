'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTournaments } from '@netprophet/lib';
import { Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';
import { Trophy, Calendar, MapPin, Users, ArrowRight, Sparkles } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import { createSlug } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Tournament {
    id: string;
    name: string;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    status: string;
    surface: string;
    location: string | null;
    is_team_tournament: boolean;
}

export default function TournamentsPage() {
    const params = useParams();
    const router = useRouter();
    const { dict } = useDictionary();
    const lang = params?.lang;

    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTournaments();
    }, []);

    const loadTournaments = async () => {
        try {
            setLoading(true);
            const data = await getTournaments();
            // Filter to only show tournaments that are synced to web
            setTournaments(data as Tournament[]);
        } catch (error) {
            console.error('Error loading tournaments:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'TBD';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">{dict?.tournaments?.loadingTournaments || 'Loading tournaments...'}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Trophy className="h-8 w-8 text-yellow-400" />
                        <h1 className="text-4xl font-black text-white">{dict?.tournaments?.title || 'Tournaments'}</h1>
                    </div>
                    <p className="text-white/80 text-lg">
                        {dict?.tournaments?.exploreTournaments || 'Explore all active and upcoming tournaments'}
                    </p>
                </div>

                {/* Tournaments Grid */}
                {tournaments.length === 0 ? (
                    <Card className="bg-white/5 border-white/10">
                        <CardContent className="py-12 text-center">
                            <Trophy className="h-12 w-12 mx-auto mb-4 text-white/40" />
                            <p className="text-white/60">{dict?.tournaments?.noTournamentsAvailable || 'No tournaments available at this time.'}</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tournaments.map((tournament) => (
                            <Card
                                key={tournament.id}
                                className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                                onClick={() => router.push(`/${lang}/tournaments/${createSlug(tournament.name)}`)}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-white text-xl mb-2 group-hover:text-yellow-400 transition-colors">
                                                {tournament.name}
                                            </CardTitle>
                                            {tournament.is_team_tournament && (
                                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-semibold mb-2">
                                                    <Users className="h-3 w-3" />
                                                    {dict?.tournaments?.teamTournament || 'Team Tournament'}
                                                </div>
                                            )}
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-white/40 group-hover:text-yellow-400 transition-colors" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {tournament.description && (
                                        <div
                                            className="text-white/70 text-sm line-clamp-2"
                                            dangerouslySetInnerHTML={{ __html: tournament.description }}
                                        />
                                    )}
                                    <div className="flex flex-col gap-2 text-sm">
                                        {tournament.start_date && (
                                            <div className="flex items-center gap-2 text-white/80">
                                                <Calendar className="h-4 w-4 text-white/60" />
                                                <span>
                                                    {formatDate(tournament.start_date)}
                                                    {tournament.end_date && ` - ${formatDate(tournament.end_date)}`}
                                                </span>
                                            </div>
                                        )}
                                        {tournament.location && (
                                            <div className="flex items-center gap-2 text-white/80">
                                                <MapPin className="h-4 w-4 text-white/60" />
                                                <span>{tournament.location}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Trophy className="h-4 w-4 text-white/60" />
                                            <span className="px-2 py-1 bg-white/10 rounded text-white/80 text-xs font-semibold">
                                                {tournament.surface}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
