import { ReactNode } from 'react';

interface MarketingLayoutProps {
    children: ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
    // Marketing pages handle their own Header/Footer
    // This layout just passes through children with a top info bar
    return (
        <>
            <div className="w-full" style={{ backgroundColor: '#F7E65D' }}>
                <div className="container mx-auto px-4 py-3 text-center">
                    <p className="text-sm md:text-base font-bold text-gray-900">
                        🎁 Μπόνους Εγγραφής: Ξεκίνα με{' '}
                        <span style={{ color: '#BE05A1' }} className="font-bold">
                            100 Νομίσματα + Tournament Pass!
                        </span>
                    </p>
                </div>
            </div>
            {children}
        </>
    );
}


