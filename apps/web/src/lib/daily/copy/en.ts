// lib/daily/copy/en.ts
//
// Written to read as English, not as translated Greek. Where a literal
// translation would be stilted the phrasing changes — the Greek stays the source
// of truth for meaning, not for word order.
//
// The banned vocabulary applies here too: no winnings, slip, coupon, parlay,
// bet, stake or odds.

import type { Copy } from './types';

const points = (n: number) => `${n} ${n === 1 ? 'point' : 'points'}`;
const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

export const en: Copy = {
    common: {
        continue: 'Continue',
        next: 'Next',
        finish: 'Finish',
        done: 'Done',
        back: 'Back',
        points,
        days,
        pointsCaption: 'POINTS',
        noResults: 'No results.',
    },

    onboarding: {
        eyebrow: 'Athens · daily game',
        step: (n: number, total: number) => `Step ${n} of ${total}`,
        welcome: {
            tagline: 'Do you know the local scene better than anyone?',
            sub: 'Eight games a day, built on real matches from the Athens draws. Predictions, polls, votes. And every player’s numbers alongside them.',
            cta: 'Start',
        },
        playType: {
            tagline: 'Do you play too?',
            sub: 'So we know whether to put your own matches in the game.',
        },
        claim: {
            tagline: 'Find yourself.',
            sub: 'If you have played a local draw, you are already on the list. Pick your profile to see your matches and your numbers.',
            search: 'Type your name',
            yes: 'That’s me',
            no: 'I’m not on the list',
        },
        club: {
            tagline: 'Which club?',
            sub: 'You will join your club’s standings and see its matches first.',
        },
        friends: {
            tagline: 'Who do you know?',
            sub: 'Friends, partners, rivals. You will see their matches first and measure yourself against them.',
            search: 'Search for a player',
            go: (n: number) => `Let’s go (${n})`,
            none: 'Pick at least one',
        },
    },

    hub: {
        tabs: { today: 'Today', players: 'Players', board: 'Leaderboard', pro: 'Pro' },
        today: {
            heroDone: 'You have played today',
            heroOpen: 'Eight games are waiting',
            ledeDone: 'Come back tomorrow at 09:00.',
            ledeOpen: 'Result, score, this or that, poll, upset, order, vote, double prediction.',
            play: 'Play now',
            played: 'Completed',
            yourProfile: (club: string, ntrp: string) =>
                `Your profile · ${club} · NTRP ${ntrp}`,
            pending: 'PENDING',
            yourPlayers: 'YOUR PLAYERS',
            yourWeek: 'YOUR WEEK',
            settings: 'SETTINGS',
            stats: { points: 'POINTS', accuracy: 'ACCURACY', streak: 'STREAK' },
            bonus: {
                title: 'Rapid round',
                unlocked: 'UNLOCKED',
                lede: (streak: number) =>
                    `You earned it with a ${streak}+ day streak. Five questions in 18 seconds.`,
                play: 'Play the round',
            },
        },
        settings: {
            haptics: 'Vibration',
            hapticsOn: 'A small buzz on every choice',
            hapticsUnsupported: 'Not supported on this device',
            language: 'Language',
            languageSub: 'English',
        },
        players: {
            title: 'Players',
            count: (n: number) => `Attica · ${n}`,
            search: 'Search for a player or club',
            form: 'FORM · LAST 5',
            bySurface: 'BY SURFACE',
            recent: 'RECENT MATCHES',
            deeper: 'DEEPER STATS',
            clay: 'CLAY',
            hard: 'HARD',
            back: '← Players',
            meta: (ntrp: string, hand: string, age: number) =>
                `NTRP ${ntrp} · ${hand} · ${age}`,
            sub: (club: string, ntrp: string) => `${club} · NTRP ${ntrp}`,
            streakLine: (streak: number, winRate: number) =>
                `Active streak: ${streak} · Wins: ${winRate}%`,
            lockedNote: 'Full history of 38 matches, by opponent and by season',
            lockTitle: 'Full stats & history',
            win: 'W',
            loss: 'L',
        },
        board: {
            title: 'Leaderboard',
            week: 'WEEK 36',
            attica: 'ATTICA',
            clubs: 'CLUBS',
            you: 'You',
            noClub: 'No club',
        },
        pro: {
            title: 'NetProphet Pro',
            badge: '7 DAYS FREE',
            heading: 'More games, all the data',
            lede: 'Free gets you every game. Pro gets you every number behind them.',
            free: 'FREE',
            pro: 'PRO',
            best: 'BEST VALUE',
            trial: '7-day trial. Cancel whenever you like.',
            store: 'ONE-OFFS',
        },
    },

    run: {
        confirm: 'Confirm',
        lock: 'Lock it in',
        pick: (n: number) => `Pick ${n}`,
        pickMore: (n: number) => `Pick ${n} more`,
        scratchFirst: 'Scratch first',
        scratch: 'Scratch',
        streakDays: days,
        shieldLabel: 'streak shield',
        kinds: {
            result: 'THE RESULT',
            score: 'THE SCORE',
            thisThat: 'THIS OR THAT',
            poll: 'THE POLL',
            upset: 'THE UPSET',
            order: 'PUT IN ORDER',
            award: 'PLAYER OF THE WEEK',
            combo: 'THE DOUBLE',
            guess: '',
        },
        titles: {
            result: { win: 'Correct!', lose: 'Not this time' },
            score: { win: 'Exactly', lose: 'Close' },
            upset: { win: 'You got it', lose: 'Not that one' },
            order: { win: 'Right order', lose: 'Wrong order' },
        },
        info: {
            poll: 'Voted',
            award: 'Voted',
            thisThat: 'Voted',
            combo: 'Locked in',
        },
        recorded: 'Recorded',
    },

    risk: {
        onTable: (n: number) => `You have ${points(n)} on the table.`,
        keep: 'Keep',
        half: 'Take half',
        double: 'Double it',
        halfSub: (n: number) => `${n} + shield`,
        doubleSub: (n: number) => `${n} or nothing`,
    },

    double: {
        atRisk: (n: number) => `⚡ ${n} POINTS AT RISK`,
        kind: 'DOUBLE OR NOTHING',
        lede: 'Answer right and you double it. Answer wrong and you lose the lot.',
        won: 'Doubled',
        lost: 'All gone',
        celebrationLabel: 'DOUBLE OR NOTHING',
        celebrationTitle: 'You took it',
    },

    celebration: {
        total: 'TOTAL',
        runLabel: 'ROUND OVER',
        runTitle: (streak: number) => `${streak}-day streak`,
        runSub: 'Come back tomorrow at 09:00 for eight new games.',
    },

    rapid: {
        label: 'RAPID ROUND',
        seconds: (n: number) => `${n} seconds`,
        outOf: (correct: number, total: number) => `${correct} out of ${total}`,
        earned: (n: number) => `You earned <b>${points(n)}</b> in the rapid round.`,
        wrong: 'False',
        right: 'True',
    },
};
