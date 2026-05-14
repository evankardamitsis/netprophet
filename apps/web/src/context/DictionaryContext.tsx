'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { Dictionary } from '@/types/dictionary';
import { stripMonotonicGreekAccents } from '@/lib/greekTypography';

interface DictionaryContextType {
    dict: Dictionary;
    lang: 'en' | 'el';
    /** Use on strings shown with CSS `uppercase` (or all-caps) in Greek so tonos is dropped. */
    prepForUppercaseDisplay: (text: string) => string;
}

const DictionaryContext = createContext<DictionaryContextType | undefined>(undefined);

export function DictionaryProvider({ children, dict, lang }: { children: React.ReactNode; dict?: Dictionary; lang: 'en' | 'el' }) {
    const value = useMemo<DictionaryContextType>(
        () => ({
            dict: dict || ({} as Dictionary),
            lang,
            prepForUppercaseDisplay: (text: string) =>
                lang === 'el' ? stripMonotonicGreekAccents(text) : text,
        }),
        [dict, lang],
    );

    return <DictionaryContext.Provider value={value}>{children}</DictionaryContext.Provider>;
}

export function useDictionary() {
    const context = useContext(DictionaryContext);
    if (context === undefined) {
        throw new Error('useDictionary must be used within a DictionaryProvider');
    }
    return context;
} 