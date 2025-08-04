'use client';

import { useRouter, useParams } from 'next/navigation';
import { MatchDetail } from '@/components/matches/MatchDetail';
import { mockMatches } from '@/components/MatchesList';

export default function MatchDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id;
    const lang = params?.lang;
    const match = mockMatches.find(m => String(m.id) === String(id));

    if (!match) return <div className="p-8 text-center text-gray-500">Match not found</div>;

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full p-6">
            <MatchDetail
                match={match}
                onAddToPredictionSlip={() => { }}
                onBack={() => router.push(`/${lang}/matches`)}
            />
        </div>
    );
} 