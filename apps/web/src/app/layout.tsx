import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Analytics } from '@vercel/analytics/next';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const GA_MEASUREMENT_ID = 'G-GCFT5N48DR';

const inter = Inter({ subsets: ['latin', 'greek'] });

export const metadata: Metadata = {
    title: 'NetProphet',
    description: 'The ultimate sports prediction game. Play with real players, earn coins, and become a Net Prophet!',
    icons: {
        icon: '/net-prophet-favicon.svg',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <Script
                    src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
                    strategy="afterInteractive"
                />
                <Script id="ga4-init" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${GA_MEASUREMENT_ID}');
                    `}
                </Script>
                <ErrorBoundary>
                    <Providers>
                        {children}
                    </Providers>
                    <Analytics />
                </ErrorBoundary>
            </body>
        </html>
    );
} 