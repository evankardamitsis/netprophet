'use client';

import { useId } from 'react';
import { colour, radius, surface } from '@/lib/daily/tokens';

// Procedural player portrait, ported from the prototype's `portrait(seed, pal)`.
// There are no photographs in this branch — every player gets the same silhouette
// over their own three-colour palette, so the roster reads as a set.

export function Portrait({
    palette,
    size = 64,
    corner = radius.lg,
}: {
    /** [top, bottom, halo] — comes from the mock provider, per player */
    palette: [string, string, string];
    size?: number;
    corner?: string;
}) {
    // Gradient ids must be unique per mounted portrait, or a second instance of
    // the same player on screen steals the first one's fill.
    const uid = useId().replace(/:/g, '');
    const [top, bottom, halo] = palette;

    return (
        <div
            style={{
                width: size, height: size, borderRadius: corner,
                overflow: 'hidden', flex: `0 0 ${size}px`,
                border: `1px solid ${surface.portraitBorder}`,
            }}
        >
            <svg
                viewBox="0 0 220 300"
                preserveAspectRatio="xMidYMid slice"
                style={{ width: '100%', height: '100%', display: 'block' }}
                aria-hidden
            >
                <defs>
                    <linearGradient id={`b${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={top} />
                        <stop offset="1" stopColor={bottom} />
                    </linearGradient>
                    <radialGradient id={`h${uid}`} cx=".5" cy=".32">
                        <stop offset="0" stopColor={halo} stopOpacity=".8" />
                        <stop offset="1" stopColor={halo} stopOpacity="0" />
                    </radialGradient>
                </defs>
                <rect width="220" height="300" fill={`url(#b${uid})`} />
                <ellipse cx="110" cy="108" rx="118" ry="104" fill={`url(#h${uid})`} />
                <g fill={colour.portraitInk}>
                    <circle cx="104" cy="96" r="19" />
                    <path d="M90 116 q14 -8 28 0 q16 9 14 34 l-6 44 -46 2 -4 -46 q-2 -24 14 -34z" />
                    <path d="M118 124 q30 -22 40 -58 q4 -14 15 -10 q11 5 6 18 q-14 44 -49 68z" />
                    <path d="M92 126 q-24 12 -30 40 q-4 14 8 17 q12 3 15 -10 q5 -20 21 -30z" />
                    <path d="M96 194 l-8 66 -18 6 -2 -74z" />
                    <path d="M124 194 l16 60 18 -2 -12 -62z" />
                </g>
                <g stroke={colour.portraitInk} strokeWidth="6" fill="none">
                    <ellipse cx="182" cy="42" rx="17" ry="22" />
                </g>
                <circle cx="150" cy="18" r="9" fill={halo} />
            </svg>
        </div>
    );
}
