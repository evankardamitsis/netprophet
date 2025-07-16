import { Suspense } from 'react';
import { MatchesList } from '@/components/MatchesList';

export default function MatchesPage() {
    return (
        <div className="h-screen flex flex-col">
            <div className="flex-shrink-0 p-6">
                <h1 className="text-3xl font-bold">Tennis Matches</h1>
            </div>
            <div className="flex-1 overflow-hidden px-6 pb-6">
                <Suspense fallback={<div>Loading matches...</div>}>
                    <MatchesList />
                </Suspense>
            </div>
        </div>
    );
} 