'use client';

import { motion } from 'framer-motion';

interface EmptyStateProps {
    dict?: any;
}

export function EmptyState({ dict }: EmptyStateProps) {
    return (
        <div className="text-center py-6 text-slate-400">
            <BettingSlipIcon className="h-10 w-10 mx-auto mb-3 text-slate-600" />
            <p className="text-sm">{dict?.matches?.noPredictionsYet || 'No predictions yet'}</p>
            <p className="text-xs">{dict?.matches?.selectMatchesToAdd || 'Select matches to add to your slip'}</p>
        </div>
    );
}

function BettingSlipIcon({ className = "h-8 w-8 text-green-500" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
    );
}
