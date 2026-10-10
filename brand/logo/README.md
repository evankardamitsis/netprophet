# NetProphet logo: «the net»

Chosen 10 Oct 2026 (direction C). A ball clearing a net of three lines that fade downward, next to the lowercase wordmark «net» (Commissioner 500) + «prophet» (Commissioner 700).

All exploration boards, including directions A to F and the C1 to C5 variations: https://claude.ai/artifact/MgaqRSkhaQAuMvVwZa9RXc (private to the founder until shared).

## Colours
- Ink `#0F2019`, paper `#F3F5EE`, lime `#D9F03F` (same as `@netprophet/tokens`).
- On ink: net in paper, ball in lime. On paper: everything in ink (lime does not read on paper).
- Net bars fade 100%, 55%, 25%.

## Files
| File | Use |
| --- | --- |
| `lockup-on-ink.svg`, `lockup-on-paper.svg` | Symbol + wordmark with background (slides, social) |
| `lockup-on-ink-transparent.svg`, `lockup-on-paper-transparent.svg` | Same without background (place on ink or paper) |
| `lockup-on-ink-tight.svg`, `lockup-on-paper-tight.svg` | Cropped to the drawing, for in-app use (`apps/app/assets/logo-on-ink.svg` is the ink one) |
| `wordmark-paper.svg`, `wordmark-ink.svg` | Wordmark alone |
| `symbol-on-ink.svg`, `symbol-ink.svg`, `symbol-paper.svg` | Symbol alone, colour / one colour |
| `app-icon-1024.svg`, `png/app-icon-1024.png` | iOS and store icon, full bleed (the OS rounds the corners) |
| `app-icon-foreground-1024.svg` | Android adaptive icon foreground (transparent, inside the 66% safe zone; background ink) |
| `favicon.svg`, `png/favicon-48.png`, `png/apple-touch-icon-180.png` | Browser tab and home-screen bookmark |

The wordmark is outlined (no font needed). Regenerate after a change with `python3 brand/logo/make_logo.py node_modules/@expo-google-fonts/commissioner brand/logo` (needs `fonttools`).

## Rules
- Clear space around the lockup: the ball's diameter on every side.
- Smallest sizes: lockup 96px wide, symbol 20px, favicon from 16px.
- Do not recolour the net lime, add effects, or set the wordmark in another font.
