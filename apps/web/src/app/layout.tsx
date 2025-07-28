import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ReactNode } from 'react';
import { Providers } from '../components/Providers';
import { PredictionSlipProvider } from '../context/PredictionSlipContext';
import { WalletProvider } from '../context/WalletContext';
import { useTheme } from '../components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'NetProphet - Tennis Prediction Platform',
    description: 'Predict tennis matches and compete with other players',
};

export default function RootLayout({
    children,
}: {
    children: ReactNode;
}) {
    // Use theme from context
    // Note: This is a client component, so we need to mark it as 'use client' if using hooks here.
    // Instead, we can set the class on <html> via the ThemeProvider effect, so just remove hardcoded classes here.
    return (
        <html lang="en">
            <body className="font-sans min-h-screen">
                <Providers>
                    <WalletProvider>
                        <PredictionSlipProvider>
                            {children}
                        </PredictionSlipProvider>
                    </WalletProvider>
                </Providers>
            </body>
        </html>
    );
} 