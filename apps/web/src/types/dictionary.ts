export interface Dictionary {
    navigation: {
        matches: string;
        leaderboard: string;
        myPicks: string;
        rewards: string;
        myProfile: string;
        howItWorks: string;
    };
    auth: {
        signIn: string;
        signOut: string;
        welcome: string;
    };
    sidebar: {
        live: string;
        upcoming: string;
        liveMatches: string;
        expandSidebar: string;
        locked: string;
        hours: string;
        minutes: string;
        seconds: string;
        versus: string;
        lockIn: string;
        startedAgo: string;
        startsIn: string;
        makePrediction: string;
    };
    matches: {
        title: string;
        noMatches: string;
        loading: string;
        bettingSection: string;
        stake: string;
        multiplier: string;
        potentialWin: string;
        placeBet: string;
        clearAll: string;
        matchResult: string;
        setWinners: string;
        setScores: string;
        tiebreakScores: string;
        player1: string;
        player2: string;
        vs: string;
        format: string;
        bestOf3: string;
        bestOf5: string;
        withSuperTiebreak: string;
        amateurFormat: string;
    };
    leaderboard: {
        title: string;
        rank: string;
        player: string;
        points: string;
        wins: string;
        losses: string;
    };
    rewards: {
        title: string;
        availableRewards: string;
        redeem: string;
        points: string;
    };
    profile: {
        title: string;
        balance: string;
        totalWins: string;
        totalLosses: string;
        winRate: string;
        dailyStreak: string;
    };
    wallet: {
        balance: string;
        deposit: string;
        withdraw: string;
        transactions: string;
        availableCoins: string;
        pendingBets: string;
        matchesInSlip: string;
        dayStreak: string;
        netProfit: string;
        winRate: string;
        totalWinnings: string;
        totalLosses: string;
        totalEarned: string;
        totalSpent: string;
        recentActivity: string;
        viewAll: string;
        noTransactions: string;
        active: string;
    };
    common: {
        loading: string;
        error: string;
        success: string;
        cancel: string;
        save: string;
        delete: string;
        edit: string;
        close: string;
        back: string;
        next: string;
        previous: string;
        submit: string;
        confirm: string;
        yes: string;
        no: string;
        ago: string;
    };
} 