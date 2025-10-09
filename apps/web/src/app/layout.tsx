import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Analytics } from '@vercel/analytics/next';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin', 'greek'] });

export const metadata: Metadata = {
    title: 'NetProphet',
    description: 'The ultimate tennis prediction game. Play with real players, win coins, and become a Net Prophet!',
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