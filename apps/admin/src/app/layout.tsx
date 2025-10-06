import type { Metadata } from 'next';
import { AdminLayout } from '@/components/AdminLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './globals.css';

export const metadata: Metadata = {
    title: 'NetProphet Admin',
    description: 'Admin panel for NetProphet tennis prediction platform',
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
            <body className="antialiased">
                <ErrorBoundary>
                    <AdminLayout>
                        {children}
                    </AdminLayout>
                </ErrorBoundary>
            </body>
        </html>
    );
} 