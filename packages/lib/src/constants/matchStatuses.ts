export const MATCH_STATUSES = {
    SCHEDULED: 'upcoming',
    LIVE: 'live',
    FINISHED: 'finished',
    CANCELLED: 'cancelled',
    POSTPONED: 'postponed'
} as const;

export type MatchStatus = typeof MATCH_STATUSES[keyof typeof MATCH_STATUSES];

export const MATCH_STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
    { value: MATCH_STATUSES.SCHEDULED, label: 'Scheduled' },
    { value: MATCH_STATUSES.LIVE, label: 'Live' },
    { value: MATCH_STATUSES.FINISHED, label: 'Finished' },
    { value: MATCH_STATUSES.CANCELLED, label: 'Cancelled' }
];

// Helper function to get status label
export const getMatchStatusLabel = (status: MatchStatus): string => {
    return MATCH_STATUS_OPTIONS.find(option => option.value === status)?.label || status;
};

// Helper function to check if status is active (for betting)
export const isActiveStatus = (status: MatchStatus): boolean => {
    return status === MATCH_STATUSES.SCHEDULED || status === MATCH_STATUSES.LIVE;
};

// Helper function to check if status is finished
export const isFinishedStatus = (status: MatchStatus): boolean => {
    return status === MATCH_STATUSES.FINISHED;
};
