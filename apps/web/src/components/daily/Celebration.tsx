'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCountUp } from '@/hooks/useCountUp';
import { confetti as CONFETTI, rays as RAY } from '@/lib/daily/tokens';

// Full-screen takeover for the moments worth stopping the run over.
//
// It portals to document.body rather than rendering inside the run: the
// backdrop blur is clipped by any ancestor with its own stacking context, and
// the run column has several.
//
// Under reduced motion the rays and rings still exist but the global guard
// flattens their animations, the confetti never fires, and the count-up lands
// on its final value immediately.

export interface CelebrationSpec {
    label: string;
    title: string;
    /** what was just won */
    points: number;
    /** career total before this award, for the ΣΥΝΟΛΟ line */
    total: number;
    sub?: string;
    huge?: boolean;
}

export function Celebration({
    spec, onDone, onImpact, onTick,
}: {
    spec: CelebrationSpec;
    onDone: () => void;
    onImpact?: () => void;
    onTick?: () => void;
}) {
    const { label, title, points, total, sub, huge } = spec;

    const [shown, setShown] = useState(false);
    const [ringsGo, setRingsGo] = useState(0);
    const [counted, setCounted] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const numberRef = useRef<HTMLDivElement>(null);
    // StrictMode runs mount effects twice in dev; the impact must land once.
    const impacted = useRef(false);

    const reduced = useMemo(
        () =>
            typeof window !== 'undefined'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        [],
    );

    const value = useCountUp(points, {
        duration: huge ? 1250 : 950,
        delay: 320,
        enabled: !reduced,
        onTick: () => {
            onTick?.();
            // Web Animations restarts cleanly without the class-toggle reflow
            // dance the prototype needed.
            numberRef.current?.animate(
                [{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }],
                { duration: 160, easing: 'ease' },
            );
        },
        onDone: () => setCounted(true),
    });

    useEffect(() => {
        const frame = requestAnimationFrame(() => setShown(true));
        if (!impacted.current) {
            impacted.current = true;
            onImpact?.();
        }

        // Three rings, staggered, expanding outwards.
        const ringTimers = [0, 1, 2].map((k) =>
            window.setTimeout(() => setRingsGo((n) => Math.max(n, k + 1)), k * 180),
        );

        return () => {
            cancelAnimationFrame(frame);
            ringTimers.forEach(window.clearTimeout);
        };
        // Runs once — this component is mounted fresh per celebration.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!counted || reduced) return;
        burst(canvasRef.current, huge ? 170 : 120);
    }, [counted, reduced, huge]);

    // The rays never change, so keep the element identity stable and let React
    // skip the whole subtree while the number re-renders every frame.
    const raysSvg = useMemo(
        () => (
            <svg className="np-rays" viewBox="0 0 900 900" aria-hidden>
                {Array.from({ length: 22 }, (_, k) => (
                    <rect
                        key={k}
                        x="449" y="450" width="460" height={k % 2 ? 5 : 15} rx="2"
                        fill={k % 2 ? RAY.thin : RAY.thick}
                        opacity={k % 2 ? 0.3 : 0.16}
                        transform={`rotate(${(360 / 22) * k} 450 450)`}
                    />
                ))}
            </svg>
        ),
        [],
    );

    if (typeof document === 'undefined') return null;

    // 500 points to the next band, same as the prototype's progress ring.
    const endTotal = total + points;
    const barWidth = counted ? ((endTotal % 500) / 500) * 100 : 6;

    return createPortal(
        <div
            className={[
                'np-cele',
                shown ? 'is-on' : '',
                huge ? 'is-huge' : '',
            ].filter(Boolean).join(' ')}
            role="dialog"
            aria-live="polite"
        >
            {raysSvg}
            {[0, 1, 2].map((k) => (
                <div key={k} className={`np-ring${ringsGo > k ? ' is-go' : ''}`} />
            ))}
            <canvas ref={canvasRef} />

            <div className="np-cele-in">
                <div className="np-cele-lbl">{label}</div>
                <div className="np-cele-ttl">{title}</div>
                <div ref={numberRef} className="np-cele-num">{value}</div>
                <div className="np-cele-unit">ΠΟΝΤΟΙ</div>
                {sub && <p className="np-cele-sub" dangerouslySetInnerHTML={{ __html: sub }} />}

                <div className="np-cele-bar-w">
                    <div className="np-cele-bar-t">
                        <span>ΣΥΝΟΛΟ</span>
                        <b>{total + value}</b>
                    </div>
                    <div className="np-cele-bar">
                        <i style={{ width: `${barWidth}%` }} />
                    </div>
                </div>

                <button
                    type="button"
                    className={`np-cta np-cele-btn${counted ? ' is-on' : ''}`}
                    onClick={() => {
                        setShown(false);
                        window.setTimeout(onDone, 320);
                    }}
                >
                    Συνέχεια
                </button>
            </div>
        </div>,
        document.body,
    );
}

/** Confetti, thrown from just above the middle of the screen. */
function burst(canvas: HTMLCanvasElement | null, count: number): void {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pieces = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = (2 + Math.random() * 11) * dpr;
        return {
            x: canvas.width / 2,
            y: canvas.height * 0.42,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3 * dpr,
            size: (4 + Math.random() * 8) * dpr,
            rot: Math.random() * 6,
            vr: (Math.random() - 0.5) * 0.4,
            life: 70 + Math.random() * 60,
            colour: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
        };
    });

    const loop = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        for (const p of pieces) {
            p.vy += 0.26 * dpr;
            p.vx *= 0.99;
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vr;
            p.life -= 1;
            if (p.life <= 0 || p.y >= canvas.height + 50) continue;
            alive = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = Math.min(1, p.life / 28);
            ctx.fillStyle = p.colour;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
            ctx.restore();
        }
        if (alive) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
}
