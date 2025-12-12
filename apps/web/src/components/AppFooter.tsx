import Link from 'next/link';

interface AppFooterProps {
    lang?: 'en' | 'el';
}

export function AppFooter({ lang = 'en' }: AppFooterProps) {
    const base = `/${lang}/legal`;
    const year = new Date().getFullYear();
    return (
        <footer className="border-t border-slate-700 text-xs text-gray-300">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-start justify-between gap-3">
                <div className="font-semibold text-white">NetProphet © {year}</div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link href={`${base}/terms-of-use`} className="hover:text-white transition-colors">
                        Terms of Use
                    </Link>
                    <span className="text-slate-500">•</span>
                    <Link href={`${base}/privacy-policy`} className="hover:text-white transition-colors">
                        Privacy Policy
                    </Link>
                    <span className="text-slate-500">•</span>
                    <Link href={`${base}/cookies-policy`} className="hover:text-white transition-colors">
                        Cookies Policy
                    </Link>
                    <span className="text-slate-500">•</span>
                    <Link href={`${base}/rules`} className="hover:text-white transition-colors">
                        Rules
                    </Link>
                </div>
            </div>
        </footer>
    );
}
