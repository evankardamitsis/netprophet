import type { Metadata, Viewport } from 'next';
import { colour } from '@/lib/daily/tokens';
import { dailyCss } from '@/lib/daily/styles';

// Standalone shell for the Daily Run prototype. No app chrome, no nav, no
// header, no providers — this route group shares only the framework and the
// font with the rest of the app. Its stylesheet is scoped under `.np-root`.

export const metadata: Metadata = {
    title: 'NetProphet',
    // The prototype is a closed test. Keep it out of search results.
    robots: { index: false, follow: false },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: colour.base,
};

export default function PrototypeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="np-root">
            <style dangerouslySetInnerHTML={{ __html: dailyCss }} />
            <div className="np-flare" aria-hidden />
            <div className="np-flare2" aria-hidden />
            <div className="np-vignette" aria-hidden />
            {children}
        </div>
    );
}
