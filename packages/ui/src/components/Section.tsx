import * as React from 'react';
import { cn } from '../utils/cn';

interface SectionProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function Section({ title, children, className }: SectionProps) {
    return (
        <section className={cn('py-12', className)}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
                    {title}
                </h2>
                {children}
            </div>
        </section>
    );
} 