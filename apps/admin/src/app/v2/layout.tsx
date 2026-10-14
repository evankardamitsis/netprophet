import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { cssVars } from '@netprophet/tokens';
import './v2.css';

export const metadata = { title: 'NetProphet v2 · Admin' };

// the app's own font files (OFL, from @expo-google-fonts): Commissioner for text, Sofia Sans Extra Condensed for
// titles and numbers; bundled so the build never depends on fetching Google Fonts
const body = localFont({
  src: [
    { path: './fonts/Commissioner_400Regular.ttf', weight: '400' },
    { path: './fonts/Commissioner_600SemiBold.ttf', weight: '600' },
    { path: './fonts/Commissioner_700Bold.ttf', weight: '700' },
    { path: './fonts/Commissioner_800ExtraBold.ttf', weight: '800' },
  ],
  variable: '--font-body',
  display: 'swap',
});
const display = localFont({
  src: [
    { path: './fonts/SofiaSansExtraCondensed_700Bold.ttf', weight: '700' },
    { path: './fonts/SofiaSansExtraCondensed_800ExtraBold.ttf', weight: '800' },
  ],
  variable: '--font-display',
  display: 'swap',
});

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <div className={`v2-root ${body.variable} ${display.variable}`}>
      <style>{cssVars()}</style>
      {children}
    </div>
  );
}
