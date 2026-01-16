import Link from 'next/link';

interface AppFooterProps {
    lang?: 'en' | 'el';
}

export function AppFooter({ lang = 'en' }: AppFooterProps) {
    const base = `/${lang}/legal`;
    const year = new Date().getFullYear();
    return (
        <footer className="relative z-10 border-t border-slate-700 text-xs text-gray-300 bg-gradient-to-br from-slate-950/90 via-blue-950/80 to-purple-950/90">
            <div className="max-w-6xl mx-auto px-4 py-3">
                {/* Links - Single line on mobile */}
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-2 md:mb-0">
                    <Link href={`${base}/terms-of-use`} className="hover:text-white transition-colors whitespace-nowrap">
                        Terms of Use
                    </Link>
                    <span className="text-slate-500 hidden sm:inline">•</span>
                    <Link href={`${base}/privacy-policy`} className="hover:text-white transition-colors whitespace-nowrap">
                        Privacy Policy
                    </Link>
                    <span className="text-slate-500 hidden sm:inline">•</span>
                    <Link href={`${base}/cookies-policy`} className="hover:text-white transition-colors whitespace-nowrap">
                        Cookies Policy
                    </Link>
                    <span className="text-slate-500 hidden sm:inline">•</span>
                    <Link href={`${base}/rules`} className="hover:text-white transition-colors whitespace-nowrap">
                        Rules
                    </Link>
                </div>
                {/* Copyright - Bottom on mobile, right on desktop */}
                <div className="text-center md:text-left font-semibold text-white mt-2 md:mt-0">
                    NetProphet © {year}
                </div>
            </div>
        </footer>
    );
}
