import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { ReactNode } from 'react'
import { Providers } from '../../components/Providers'
import { PredictionSlipProvider } from '../../context/PredictionSlipContext'
import { WalletProvider } from '../../context/WalletContext'
import { getDictionary } from '../../lib/dictionaries'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'NetProphet - Tennis Predictions',
    description: 'Predict tennis matches and earn rewards',
}

// Generate static params for supported locales
export async function generateStaticParams() {
    return [
        { lang: 'en' },
        { lang: 'el' }
    ]
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: ReactNode
    params: Promise<{ lang: 'en' | 'el' }>
}) {
    const { lang } = await params;
    const dict = getDictionary(lang);

    return (
        <html lang={lang}>
            <body className={inter.className}>
                <Providers>
                    <WalletProvider>
                        <PredictionSlipProvider>
                            {children}
                        </PredictionSlipProvider>
                    </WalletProvider>
                </Providers>
                <Toaster
                    position="bottom-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#1A1A1A',
                            color: '#fff',
                            border: '1px solid #2A2A2A',
                        },
                        success: {
                            iconTheme: {
                                primary: '#10B981',
                                secondary: '#fff',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#EF4444',
                                secondary: '#fff',
                            },
                        },
                    }}
                />
            </body>
        </html>
    )
} 