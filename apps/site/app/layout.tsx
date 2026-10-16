import type { Metadata, Viewport } from 'next';
import { Commissioner, Sofia_Sans_Extra_Condensed } from 'next/font/google';
import { colors, cssVars } from '@netprophet/tokens';
import './globals.css';

const body = Commissioner({ subsets: ['greek', 'latin'], weight: ['400', '600', '700'], variable: '--font-body' });
const display = Sofia_Sans_Extra_Condensed({ subsets: ['greek', 'latin'], weight: ['700', '800'], variable: '--font-display' });

export const metadata: Metadata = {
  metadataBase: new URL('https://netprophetapp.com'),
  title: 'NetProphet',
  description: 'Το ερασιτεχνικό τένις, στο κινητό σου.',
};

export const viewport: Viewport = { themeColor: colors.ink, width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={`${body.variable} ${display.variable}`}>
      <head>
        {/* the brand tokens as CSS variables (--np-ink, --np-lime, ...), from @netprophet/tokens */}
        <style dangerouslySetInnerHTML={{ __html: cssVars() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
