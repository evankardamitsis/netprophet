'use client';

import { useCallback, useEffect, useRef } from 'react';
import { foil as material, surface } from '@/lib/daily/tokens';

// Two stacked canvases over the answer: the foil, erased with
// `destination-out`, and the dust the erasing throws off.
//
// Things that were bugs before, and are load-bearing now:
//  - both canvases are sized in device pixels and set to CSS pixels
//    separately, or the foil is soft on a retina screen
//  - coverage is measured DURING the move, not on pointerup
//  - the segment between two pointer events is sampled, so a fast drag does
//    not leave unmarked gaps in the coverage grid
//  - the pointer is captured on down, and `touch-action: none` is set, or the
//    page scrolls under the finger on a phone

const COLS = 24;
const ROWS = 11;
/** Coverage at which the foil gives up and dissolves. */
const CLEAR_AT = 0.68;
/** Eraser radius, in CSS pixels. */
const BRUSH = 24;
/** How far a finger travels between haptic ticks. */
const TICK_DISTANCE = 34;

interface Flake {
    x: number; y: number; vx: number; vy: number;
    rot: number; vr: number; size: number; life: number; colour: string;
}

export function ScratchPanel({
    html, tone, onCleared, onTick, onStart,
}: {
    /** authored in lib/daily/providers — never tester or network content */
    html: string;
    tone?: string;
    onCleared?: () => void;
    /** fires every ~34px of travel — the scratching haptic hangs off this */
    onTick?: () => void;
    /** first contact with the foil */
    onStart?: () => void;
}) {
    const rootRef = useRef<HTMLDivElement>(null);
    const foilRef = useRef<HTMLCanvasElement>(null);
    const dustRef = useRef<HTMLCanvasElement>(null);
    const hintRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const barRef = useRef<HTMLElement>(null);

    // None of this belongs in React state — it changes per pointer event and
    // re-rendering on each one would stutter the erase.
    const covered = useRef(new Set<number>());
    const flakes = useRef<Flake[]>([]);
    const raf = useRef<number | null>(null);
    const drawing = useRef(false);
    const done = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);
    const travelled = useRef(0);
    const dpr = useRef(1);

    const reducedMotion = useRef(false);

    /** Paint the foil at the panel's current size. */
    const paintFoil = useCallback(() => {
        const root = rootRef.current;
        const foilEl = foilRef.current;
        const dustEl = dustRef.current;
        if (!root || !foilEl || !dustEl) return;

        const rect = root.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const ratio = window.devicePixelRatio || 1;
        dpr.current = ratio;

        for (const canvas of [foilEl, dustEl]) {
            canvas.width = Math.round(rect.width * ratio);
            canvas.height = Math.round(rect.height * ratio);
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
        }

        const ctx = foilEl.getContext('2d');
        if (!ctx) return;
        const { width: w, height: h } = foilEl;

        const gradient = ctx.createLinearGradient(0, 0, w, h);
        const [a, b, c, d, e] = material.stops;
        gradient.addColorStop(0, a);
        gradient.addColorStop(0.42, b);
        gradient.addColorStop(0.52, c);
        gradient.addColorStop(0.64, d);
        gradient.addColorStop(1, e);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // brushed-metal streaks
        ctx.globalAlpha = 0.08;
        for (let k = 0; k < 170; k++) {
            ctx.strokeStyle = k % 2 ? '#fff' : '#000';
            ctx.lineWidth = Math.random() * 1.7 * ratio;
            const y = Math.random() * h;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y + (Math.random() * 10 - 5) * ratio);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }, []);

    useEffect(() => {
        reducedMotion.current =
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // One frame, so layout has settled and the panel has a real size.
        const id = requestAnimationFrame(paintFoil);

        // The sheet slides in and the layout can change width underneath us.
        // Re-paint only while the foil is untouched, so nobody loses progress.
        const observer = new ResizeObserver(() => {
            if (covered.current.size === 0 && !done.current) paintFoil();
        });
        if (rootRef.current) observer.observe(rootRef.current);

        return () => {
            cancelAnimationFrame(id);
            observer.disconnect();
            if (raf.current !== null) cancelAnimationFrame(raf.current);
        };
    }, [paintFoil]);

    const tickDust = useCallback(() => {
        const dustEl = dustRef.current;
        const ctx = dustEl?.getContext('2d');
        if (!dustEl || !ctx) return;

        ctx.clearRect(0, 0, dustEl.width, dustEl.height);
        const ratio = dpr.current;

        for (let k = flakes.current.length - 1; k >= 0; k--) {
            const p = flakes.current[k];
            p.vy += 0.42 * ratio;
            p.vx *= 0.985;
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vr;
            p.life -= 1;
            if (p.life <= 0 || p.y > dustEl.height + 30) {
                flakes.current.splice(k, 1);
                continue;
            }
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 24));
            ctx.fillStyle = p.colour;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
            ctx.restore();
        }

        raf.current = flakes.current.length
            ? requestAnimationFrame(tickDust)
            : null;
    }, []);

    const spawn = useCallback((x: number, y: number, count: number, speed: number) => {
        // Reduced motion keeps the scratch, drops the confetti of it.
        if (reducedMotion.current) return;
        const ratio = dpr.current;
        for (let k = 0; k < count; k++) {
            const angle = Math.random() * Math.PI * 2;
            const s = (Math.random() * speed + 0.6) * ratio;
            flakes.current.push({
                x, y,
                vx: Math.cos(angle) * s,
                vy: Math.sin(angle) * s - 1.6 * ratio,
                rot: Math.random() * Math.PI,
                vr: (Math.random() - 0.5) * 0.4,
                size: (2.4 + Math.random() * 4) * ratio,
                life: 26 + Math.random() * 26,
                colour: material.flakes[
                    Math.floor(Math.random() * material.flakes.length)
                ],
            });
        }
        if (raf.current === null) raf.current = requestAnimationFrame(tickDust);
    }, [tickDust]);

    /** Mark every grid cell whose centre falls inside the brush. */
    const mark = useCallback((x: number, y: number, r: number) => {
        const foilEl = foilRef.current;
        if (!foilEl) return;
        const cw = foilEl.width / COLS;
        const ch = foilEl.height / ROWS;
        const y0 = Math.max(0, Math.floor((y - r) / ch));
        const y1 = Math.min(ROWS - 1, Math.floor((y + r) / ch));
        const x0 = Math.max(0, Math.floor((x - r) / cw));
        const x1 = Math.min(COLS - 1, Math.floor((x + r) / cw));

        for (let cy = y0; cy <= y1; cy++) {
            for (let cx = x0; cx <= x1; cx++) {
                const px = (cx + 0.5) * cw;
                const py = (cy + 0.5) * ch;
                if ((px - x) ** 2 + (py - y) ** 2 <= r * r) {
                    covered.current.add(cy * COLS + cx);
                }
            }
        }
    }, []);

    const paint = useCallback((point: { x: number; y: number }) => {
        const foilEl = foilRef.current;
        const ctx = foilEl?.getContext('2d');
        if (!foilEl || !ctx || done.current) return;

        const ratio = dpr.current;
        const brush = BRUSH * ratio;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brush * 2;

        let moved = 0;
        if (last.current) {
            const dx = point.x - last.current.x;
            const dy = point.y - last.current.y;
            moved = Math.hypot(dx, dy);

            ctx.beginPath();
            ctx.moveTo(last.current.x, last.current.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();

            // Sample along the segment, or a fast drag leaves unmarked gaps.
            const steps = Math.max(1, Math.ceil(moved / (brush * 0.5)));
            for (let k = 0; k <= steps; k++) {
                mark(
                    last.current.x + (dx * k) / steps,
                    last.current.y + (dy * k) / steps,
                    brush,
                );
            }
        }

        ctx.beginPath();
        ctx.arc(point.x, point.y, brush, 0, Math.PI * 2);
        ctx.fill();
        mark(point.x, point.y, brush);
        last.current = point;

        spawn(point.x, point.y, Math.min(7, 2 + Math.floor(moved / (10 * ratio))), 2.6);

        travelled.current += moved;
        if (travelled.current > TICK_DISTANCE * ratio) {
            travelled.current = 0;
            onTick?.();
        }

        // Measured here, mid-move — not on pointerup.
        const pct = covered.current.size / (COLS * ROWS);
        if (barRef.current) {
            barRef.current.style.width = `${Math.min(100, (pct / CLEAR_AT) * 100)}%`;
        }

        if (pct > CLEAR_AT) {
            done.current = true;
            foilEl.style.transition = 'opacity .32s, transform .32s';
            foilEl.style.opacity = '0';
            foilEl.style.transform = 'scale(1.03)';
            if (progressRef.current) progressRef.current.style.opacity = '0';
            for (let k = 0; k < 10; k++) {
                spawn(
                    Math.random() * foilEl.width,
                    Math.random() * foilEl.height * 0.8,
                    8, 5.5,
                );
            }
            onCleared?.();
        }
    }, [mark, spawn, onCleared, onTick]);

    const toCanvas = (e: React.PointerEvent) => {
        const foilEl = foilRef.current!;
        const rect = foilEl.getBoundingClientRect();
        const ratio = dpr.current;
        return {
            x: (e.clientX - rect.left) * ratio,
            y: (e.clientY - rect.top) * ratio,
        };
    };

    return (
        <div
            ref={rootRef}
            className="np-scr"
            style={tone ? { borderColor: tone } : undefined}
            onPointerDown={(e) => {
                if (done.current) return;
                drawing.current = true;
                last.current = null;
                if (hintRef.current) hintRef.current.style.opacity = '0';
                if (progressRef.current) progressRef.current.style.opacity = '1';
                // Without capture the page scrolls out from under the finger.
                // Throws if the pointer is no longer active; not worth failing over.
                try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                    /* keep scratching without capture */
                }
                onStart?.();
                paint(toCanvas(e));
            }}
            onPointerMove={(e) => {
                if (drawing.current && !done.current) paint(toCanvas(e));
            }}
            onPointerUp={() => { drawing.current = false; last.current = null; }}
            onPointerCancel={() => { drawing.current = false; last.current = null; }}
        >
            <div className="np-tx" dangerouslySetInnerHTML={{ __html: html }} />
            <canvas ref={foilRef} />
            <canvas ref={dustRef} />
            <div ref={hintRef} className="np-hint"><span>Ξύσε</span></div>
            <div ref={progressRef} className="np-prg">
                <i ref={barRef as React.RefObject<HTMLElement>} />
            </div>
        </div>
    );
}
