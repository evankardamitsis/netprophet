'use client';

import { createContext, createElement, useContext, type ReactNode } from 'react';
import { el } from './el';
import { en } from './en';
import { isLocale, type Copy, type Locale } from './types';

export type { Copy, Locale };
export { LOCALES, isLocale } from './types';

const DICTIONARIES: Record<Locale, Copy> = { el, en };

export function getCopy(locale: Locale): Copy {
    return DICTIONARIES[locale];
}

/** Greek unless the browser clearly says otherwise. */
export function detectLocale(): Locale {
    if (typeof navigator === 'undefined') return 'el';
    const tag = navigator.language?.toLowerCase() ?? '';
    if (tag.startsWith('el')) return 'el';
    return tag.startsWith('en') ? 'en' : 'el';
}

const CopyContext = createContext<{ copy: Copy; locale: Locale }>({
    copy: el,
    locale: 'el',
});

export function CopyProvider({
    locale, children,
}: {
    locale: Locale;
    children: ReactNode;
}) {
    // Context rather than a module-level value: changing language has to
    // re-render, unlike the haptics flag which is only read at fire time.
    return createElement(
        CopyContext.Provider,
        { value: { copy: getCopy(locale), locale } },
        children,
    );
}

export function useCopy(): Copy {
    return useContext(CopyContext).copy;
}

export function useLocale(): Locale {
    return useContext(CopyContext).locale;
}

/** Only for the few places outside the tree, e.g. reading stored state. */
export function localeFrom(value: unknown): Locale {
    return isLocale(value) ? value : detectLocale();
}
