import { Suspense } from 'react';
import { MatchesList } from '@/components/MatchesList';

export default function MatchesPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Tennis Matches</h1>
            <Suspense fallback={<div>Loading matches...</div>}>
                <MatchesList />
            </Suspense>
        </div>
    );
} 