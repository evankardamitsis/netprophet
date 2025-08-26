import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { ReactNode } from 'react'
import { Providers } from '../../components/Providers'
import { PredictionSlipProvider } from '../../context/PredictionSlipContext'
import { WalletProvider } from '../../context/WalletContext'
import { DictionaryProvider } from '../../context/DictionaryContext'
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
                    <DictionaryProvider dict={dict} lang={lang}>
                        <WalletProvider>
                            <PredictionSlipProvider>
                                {children}
                            </PredictionSlipProvider>
                        </WalletProvider>
                    </DictionaryProvider>
                </Providers>
                <Toaster
                    position="bottom-right"
                    duration={3000}
                    theme="dark"
                    richColors
                />
            </body>
        </html>
    )
} 