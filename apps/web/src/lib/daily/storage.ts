// lib/daily/storage.ts
//
// The prototype has no server and no account. Everything a tester accumulates
// lives under one versioned localStorage key. Wiping the key resets the tester.

export const DAILY_KEY = 'np_daily_v1';

export interface DailyState {
    v: 1;
    profile: {
        playType: 'comp' | 'fun' | 'watch'; claimedId: string | null;
        club: string | null; friendIds: string[]
    } | null;
    streak: number;
    lastPlayedOn: string | null;   // ISO date, drives "already played today"
    totalPoints: number;
    seenCardIds: string[];         // prevents repeats across runs
    shield: boolean;
    /** the settings toggle; ignored entirely on devices without vibration */
    haptics: boolean;
    /** pending predictions the tester has already uncovered on the hub */
    resolvedIds: string[];
    history: { date: string; points: number; correct: number; total: number }[];
}

/** The shape onboarding writes once, and the hub reads on every mount. */
export type DailyProfile = NonNullable<DailyState['profile']>;

export function defaultDailyState(): DailyState {
    return {
        v: 1,
        profile: null,
        streak: 0,
        lastPlayedOn: null,
        totalPoints: 0,
        seenCardIds: [],
        shield: false,
        haptics: true,
        resolvedIds: [],
        history: [],
    };
}

/**
 * The "daily" boundary is the device clock. Known limitation of a prototype
 * with no server — a tester can move it by changing their clock.
 */
export function today(): string {
    return new Date().toISOString().slice(0, 10);
}

export function playedToday(s: DailyState): boolean {
    return s.lastPlayedOn === today();
}

function isDailyState(v: unknown): v is DailyState {
    return typeof v === 'object' && v !== null && (v as DailyState).v === 1;
}

/** Reads once on mount. Returns a fresh state on SSR, bad JSON or a stale version. */
export function loadDailyState(): DailyState {
    if (typeof window === 'undefined') return defaultDailyState();
    try {
        const raw = window.localStorage.getItem(DAILY_KEY);
        if (!raw) return defaultDailyState();
        const parsed: unknown = JSON.parse(raw);
        if (!isDailyState(parsed)) return defaultDailyState();
        return { ...defaultDailyState(), ...parsed };
    } catch {
        return defaultDailyState();
    }
}

/** Called on every meaningful change. Silently no-ops if storage is unavailable. */
export function saveDailyState(state: DailyState): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(DAILY_KEY, JSON.stringify(state));
    } catch {
        /* private mode, quota, or storage disabled — the prototype keeps playing */
    }
}

/** Read, patch, write. Returns the state that was written. */
export function patchDailyState(patch: Partial<DailyState>): DailyState {
    const next = { ...loadDailyState(), ...patch, v: 1 as const };
    saveDailyState(next);
    return next;
}

/** Backing the hidden `/daily?reset=1` escape hatch testers will need. */
export function clearDailyState(): DailyState {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.removeItem(DAILY_KEY);
        } catch {
            /* nothing to do */
        }
    }
    return defaultDailyState();
}
