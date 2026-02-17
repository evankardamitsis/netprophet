export interface PredictionOptions {
    winner: string;
    matchResult: string;
    set1Score: string;
    set2Score: string;
    set3Score: string;
    set4Score: string;
    set5Score: string;
    set1Winner: string;
    set2Winner: string;
    set3Winner: string;
    set4Winner: string;
    set5Winner: string;
    tieBreak: string;
    totalGames: string;
    acesLeader: string;
    doubleFaults: string;
    breakPoints: string;
    set1TieBreak: string;
    set2TieBreak: string;
    set1TieBreakScore: string;
    set2TieBreakScore: string;
    superTieBreak: string;
    superTieBreakScore: string;
    superTieBreakWinner: string;
}

export interface MatchDetails {
    player1: { name: string; odds: number; wins: number; losses: number; ntrpRating?: number; teamName?: string | null };
    player2: { name: string; odds: number; wins: number; losses: number; ntrpRating?: number; teamName?: string | null };
    round: string;
    surface: string;
    format: string;
}

export interface PredictionFormProps {
    matchId: string;
    formPredictions: PredictionOptions;
    onPredictionChange: (type: keyof PredictionOptions, value: string) => void;
    details: MatchDetails;
    isDoubles?: boolean;
    isBestOf5: boolean;
    isAmateurFormat: boolean;
    setsToShowFromResult: number;
    setWinnersFromResult: string[];
    renderSetScoreDropdown: (setNumber: number, value: string, onChange: (value: string) => void, onFocus?: () => void) => JSX.Element;
    getSetScore: (setNumber: number) => string;
    setSetScore: (setNumber: number, value: string) => void;
    getSetWinner: (setNumber: number) => string;
    setSetWinner: (setNumber: number, value: string) => void;
    locked?: boolean;
    onSubmitButton?: React.ReactNode;
    hasAnyPredictions?: boolean;
    hasFormChanged?: boolean;
    onSubmitSuccess?: () => void;
}
