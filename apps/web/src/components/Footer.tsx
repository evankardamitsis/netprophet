'use client';

import { Button } from '@netprophet/ui';
import { useRouter } from 'next/navigation';
import Logo from './Logo';

interface FooterProps {
    lang: 'en' | 'el';
    dict?: {
        navigation?: {
            leaderboard?: string;
        };
    };
}

export default function Footer({ lang, dict }: FooterProps) {
    const router = useRouter();

    return (
        <footer className="bg-slate-900 text-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-3 gap-8 mb-8">
                    <div>
                        <div className="mb-4">
                            <Logo size="md" />
                        </div>
                        <p className="text-slate-400 mb-6">
                            {lang === 'el' ? 'Η νούμερο ένα πλατφόρμα προβλέψεων για το τένις με πραγματικούς αγώνες' : 'The prediction platform for tennis with real matches'}
                        </p>
                        <Button
                            onClick={() => router.push(`/${lang}/auth/signin`)}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                            {lang === 'el' ? 'Δοκίμασε τώρα δωρεάν' : 'Try for free'}
                        </Button>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Support</h4>
                        <ul className="space-y-2 text-slate-400">
                            <li>
                                <a
                                    href={`/${lang}/faq`}
                                    className="hover:text-white transition-colors"
                                >
                                    FAQ
                                </a>
                            </li>
                            <li>
                                <a
                                    href={`/${lang}/contact`}
                                    className="hover:text-white transition-colors"
                                >
                                    Contact
                                </a>
                            </li>
                            <li>
                                <a
                                    href={`/${lang}/help-center`}
                                    className="hover:text-white transition-colors"
                                >
                                    Help Center
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Powered by</h4>
                        <div className="text-slate-400">
                            <a href="https://belowthefold.gr" target="_blank" className="text-blue-400 hover:text-blue-300">Below The Fold</a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-8">
                    <div className="flex justify-center">
                        <div className="text-slate-400 text-sm">
                            © 2025 NetProphet. All rights reserved.
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
