'use client';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
    className?: string;
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
    const sizeClasses = {
        sm: {
            icon: 'w-6 h-6',
            text: 'text-sm',
            iconText: 'text-xs'
        },
        md: {
            icon: 'w-8 h-8',
            text: 'text-lg',
            iconText: 'text-sm'
        },
        lg: {
            icon: 'w-12 h-12',
            text: 'text-2xl',
            iconText: 'text-lg'
        }
    };

    const { icon, text, iconText } = sizeClasses[size];

    return (
        <div className={`flex items-center ${className}`}>
            <div className={`${icon} bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3 hover:shadow-[0_0_8px_rgba(59,130,246,0.3)] transition-all duration-300`}>
                <span className={`text-white font-bold ${iconText}`}>NP</span>
            </div>
            {showText && (
                <span className={`font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent ${text} hover:drop-shadow-[0_0_6px_rgba(147,51,234,0.4)] transition-all duration-300`}>
                    NetProphet
                </span>
            )}
        </div>
    );
}
