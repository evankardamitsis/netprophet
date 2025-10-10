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
            <div className={`${icon} bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center mr-3 shadow-lg`}>
                <span className={`text-purple-900 font-black ${iconText}`}>NP</span>
            </div>
            {showText && (
                <span className={`font-black text-yellow-400 ${text}`}>
                    NetProphet
                </span>
            )}
        </div>
    );
}
