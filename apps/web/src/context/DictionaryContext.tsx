'use client';

import React, { createContext, useContext } from 'react';
import { Dictionary } from '@/types/dictionary';

interface DictionaryContextType {
    dict: Dictionary;
    lang: 'en' | 'el';
}

const DictionaryContext = createContext<DictionaryContextType | undefined>(undefined);

export function DictionaryProvider({ children, dict, lang }: { children: React.ReactNode; dict?: Dictionary; lang: 'en' | 'el' }) {
    return (
        <DictionaryContext.Provider value={{ dict: dict || {} as Dictionary, lang }}>
            {children}
        </DictionaryContext.Provider>
    );
}

export function useDictionary() {
    const context = useContext(DictionaryContext);
    if (context === undefined) {
        throw new Error('useDictionary must be used within a DictionaryProvider');
    }
    return context;
} 