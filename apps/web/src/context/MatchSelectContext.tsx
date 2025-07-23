import { createContext, useContext } from 'react';

export const MatchSelectContext = createContext<(match: any) => void>(() => { });

export function useMatchSelect() {
    return useContext(MatchSelectContext);
} 