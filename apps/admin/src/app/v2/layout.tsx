import type { ReactNode } from 'react';
import { Commissioner, Sofia_Sans_Extra_Condensed } from 'next/font/google';
import { cssVars } from '@netprophet/tokens';
import './v2.css';

export const metadata = { title: 'NetProphet v2 · Admin' };

// the app's fonts: Commissioner for text, Sofia Sans Extra Condensed for titles and numbers
const body = Commissioner({ subsets: ['latin', 'greek'], weight: ['400', '500', '600', '700', '800'], variable: '--font-body', display: 'swap' });
const display = Sofia_Sans_Extra_Condensed({ subsets: ['latin', 'greek'], weight: ['700', '800'], variable: '--font-display', display: 'swap' });

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <div className={`v2-root ${body.variable} ${display.variable}`}>
      <style>{cssVars()}</style>
      {children}
    </div>
  );
}
