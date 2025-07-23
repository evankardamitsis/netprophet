import { cn } from '@netprophet/ui';
import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        const base =
            'inline-flex items-center justify-center rounded-md font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none';
        const variants = {
            default:
                'bg-accent text-black shadow-md hover:bg-yellow-400 active:scale-95',
            outline:
                'bg-transparent border border-accent text-accent hover:bg-accent/10 active:scale-95',
        };
        return (
            <button
                ref={ref}
                className={cn(base, variants[variant], className)}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button'; 