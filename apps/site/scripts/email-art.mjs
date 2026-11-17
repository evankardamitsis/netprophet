// The ball-player art for the emails (founder, 17 Nov 2026: emails "more visual"). Gmail and Outlook block SVG, so
// each scene is drawn here as SVG on an ink band and saved as a PNG at 2x under public/email/art/, where
// apps/admin/src/lib/v2/mail links to it. Run after changing a scene:
//   node apps/site/scripts/email-art.mjs
// It needs Google Chrome (headless). The drawing follows the app's Avatar (apps/app/src/components/Avatar.tsx).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'public', 'email', 'art');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const INK = '#0F2019';

const KIT = { green: ['#2B4A3C', '#5A8070'], night: ['#1B2A6B', '#9DB0FF'], clay: ['#B4532A', '#F3F5EE'], hard: ['#3A6EA5', '#F3F5EE'], ocean: ['#147A80', '#BFF0EC'], sunset: ['#E07A3F', '#5B2A86'] };
const HAIR = {
  short: { f: 'M17 50 C18 30 32 20 50 20 C68 20 82 30 83 50 C75 39 64 33 52 34 C46 30 36 31 30 36 C25 39 20 44 17 50 Z' },
  bun: { b: '<circle cx="50" cy="17" r="10"/>', f: 'M17 48 C19 30 33 21 50 21 C67 21 81 30 83 47 C75 38 63 33 50 33 C37 33 25 38 17 48 Z' },
  long: { b: '<path d="M14 74 C8 38 28 17 50 17 C72 17 92 38 86 74 C80 78 74 76 72 70 L28 70 C26 76 20 78 14 74 Z"/>', f: 'M17 52 C17 31 32 20 52 20 C70 20 84 31 83 50 C74 38 62 33 48 34 C36 36 24 42 17 52 Z' },
  curly: { c: [[24, 38, 9], [32, 28, 10], [43, 23, 10], [56, 23, 10], [67, 28, 10], [76, 38, 9]] },
  buzz: { f: 'M19 44 C23 29 35 22 50 22 C65 22 77 29 81 44 C73 36 62 32 50 32 C38 32 27 36 19 44 Z' },
};
const MEDAL = { gold: ['#E4C25A', '#8C6A12'], silver: ['#C9D1C4', '#6E7A72'], bronze: ['#B87333', '#6E3F17'] };
let uid = 0;
function ball({ skin = '#EDC19C', hair = 'short', hc = '#5A3A24', kit = 'green', mouth = 'smile', look = 0, raised = false, medal = null, size = 90 }) {
  const id = 'b' + uid++;
  const [shirt, racket] = KIT[kit];
  const h = HAIR[hair];
  const eye = (cx) => `<ellipse cx="${cx}" cy="55" rx="7" ry="8.5" fill="#fff"/><ellipse cx="${cx + 1.5 + look * 2.6}" cy="56.5" rx="4" ry="4" fill="${INK}"/><circle cx="${cx + 3 + look * 2.6}" cy="54.5" r="1.4" fill="#fff"/>`;
  const front = h.f ? `<path d="${h.f}" fill="${hc}"/>` : h.c ? `<g fill="${hc}">${h.c.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>` : '';
  const mouths = {
    smile: `<path d="M43.5 68 Q50 73.5 56.5 68" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`,
    open: `<path d="M42 67 Q50 79 58 67 Z" fill="${INK}"/>`,
    sad: `<path d="M44 71 Q50 66.5 56 71" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`,
  };
  const med = medal ? `<path d="M43 74 L47 90 L50 86 L53 90 L57 74" fill="#D9F03F"/><circle cx="50" cy="93" r="7.5" fill="${MEDAL[medal][0]}" stroke="${MEDAL[medal][1]}" stroke-width="1.8"/>` : '';
  return `<svg width="${size}" height="${size * 1.04}" viewBox="0 0 100 104"><defs><radialGradient id="s${id}" cx="36%" cy="30%" r="72%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".38" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="${INK}" stop-opacity=".05"/><stop offset="1" stop-color="${INK}" stop-opacity=".3"/></radialGradient><clipPath id="c${id}"><circle cx="50" cy="56" r="34"/></clipPath></defs>
<ellipse cx="50" cy="96" rx="24" ry="3.5" fill="#000" opacity=".3"/>
<g transform="translate(0 ${raised ? -16 : 0}) rotate(${raised ? 14 : 28} 86 36)"><path d="M86 50 L86 70" stroke="${shirt}" stroke-width="5" stroke-linecap="round"/><ellipse cx="86" cy="34" rx="10" ry="13.5" fill="#fff" fill-opacity=".12" stroke="${racket}" stroke-width="3"/><path d="M81 24 L81 44 M86 21 L86 47 M91 24 L91 44 M77 29 L95 29 M76 34 L96 34 M77 39 L95 39" stroke="${racket}" stroke-width=".9" opacity=".55"/></g>
${h.b ? `<g fill="${hc}">${h.b}</g>` : ''}<circle cx="50" cy="56" r="34" fill="${skin}"/>
<g clip-path="url(#c${id})"><rect x="0" y="74" width="100" height="30" fill="${shirt}"/><path d="M40 74 L50 81 L60 74" fill="none" stroke="#F3F5EE" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>
<circle cx="50" cy="56" r="34" fill="url(#s${id})"/><circle cx="50" cy="56" r="33.4" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="1.2"/>
${front}${eye(39)}${eye(61)}<ellipse cx="29" cy="67" rx="5" ry="3.4" fill="#E98A7A" opacity=".4"/><ellipse cx="71" cy="67" rx="5" ry="3.4" fill="#E98A7A" opacity=".4"/>${mouths[mouth]}${med}</svg>`;
}
const P = {
  nikos: (o = {}) => ball({ skin: '#EDC19C', hair: 'short', hc: '#5A3A24', kit: 'night', ...o }),
  maria: (o = {}) => ball({ skin: '#F6D7BF', hair: 'long', hc: '#8A4B26', kit: 'ocean', ...o }),
  eleni: (o = {}) => ball({ skin: '#D9A27A', hair: 'bun', hc: '#1E1B19', kit: 'sunset', ...o }),
  kostas: (o = {}) => ball({ skin: '#B97E55', hair: 'curly', hc: '#1E1B19', kit: 'clay', ...o }),
  dimitris: (o = {}) => ball({ skin: '#8E5A3A', hair: 'buzz', hc: '#1E1B19', kit: 'hard', ...o }),
};
const vs = '<span style="font:800 34px/1 Helvetica,Arial,sans-serif;color:#A9BBAF;align-self:center;margin:0 6px">VS</span>';

// each scene: 536 x 190 (the email's content width), drawn at 2x
const SCENES = {
  welcome: P.nikos({ size: 170, raised: true, mouth: 'open' }),
  launch: P.kostas({ size: 120, look: 1 }) + P.nikos({ size: 160, mouth: 'open', raised: true }) + P.maria({ size: 120, look: -1 }),
  invite: P.maria({ size: 140, look: 1, raised: true }) + vs + ball({ skin: '#D9A27A', hair: 'buzz', hc: '#3A2A1E', kit: 'green', look: -1, size: 140, mouth: 'open' }),
  friends: P.kostas({ size: 110, look: 1 }) + P.eleni({ size: 140, mouth: 'open' }) + P.dimitris({ size: 110, look: -1 }),
  podium: P.kostas({ size: 120, medal: 'silver', mouth: 'open', raised: true }) + P.eleni({ size: 150, medal: 'gold' }) + P.dimitris({ size: 110, medal: 'bronze' }),
  missed: P.nikos({ size: 150, mouth: 'sad', look: -1 }),
  think: P.nikos({ size: 140, look: 1 }),
  wave: P.maria({ size: 160, raised: true, mouth: 'open' }),
  bye: P.nikos({ size: 130, look: -1 }),
};

mkdirSync(OUT, { recursive: true });
const tmp = join(OUT, '.tmp.html');
for (const [name, art] of Object.entries(SCENES)) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:536px;height:190px;background:${INK};overflow:hidden}
  .s{width:536px;height:190px;display:flex;justify-content:center;align-items:flex-end;gap:6px;background:radial-gradient(ellipse 60% 90% at 50% 100%,rgba(91,140,110,.35),rgba(15,32,25,0) 70%)}</style></head>
  <body><div class="s">${art}</div></body></html>`;
  writeFileSync(tmp, html);
  execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', '--window-size=536,190', `--screenshot=${join(OUT, name + '.png')}`, `file://${tmp}`], { stdio: 'ignore' });
  console.log('art', name);
}
rmSync(tmp);
