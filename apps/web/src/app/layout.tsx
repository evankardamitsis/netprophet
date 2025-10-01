import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin', 'greek'] });

export const metadata: Metadata = {
    title: 'NetProphet',
    description: 'Tennis prediction platform',
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
                <Providers>
                    {children}
                </Providers>
                <Analytics />
            </body>
        </html>
    );
} 