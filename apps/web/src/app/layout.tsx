import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ReactNode } from 'react';
import ClientLayout from './ClientLayout';
import { Providers } from '../components/Providers';
import { PredictionSlipProvider } from '../context/PredictionSlipContext';

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
    return (
        <html lang="en">
            <body className="bg-[#181A20] text-white font-sans min-h-screen">
                <Providers>
                    <PredictionSlipProvider>
                        <ClientLayout>{children}</ClientLayout>
                    </PredictionSlipProvider>
                </Providers>
            </body>
        </html>
    );
} 