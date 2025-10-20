'use client';

import Image from 'next/image';

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
            {/* <div className={`${icon} flex items-center justify-center mr-3`}>
                <Image
                    src="/net-prophet-favicon.svg"
                    alt="NetProphet Logo"
                    width={32}
                    height={32}
                    className="w-full h-full object-contain"
                />
            </div> */}
            {showText && (
                <Image
                    src="/net-prophet-logo.svg"
                    alt="NetProphet Logo"
                    width={160}
                    height={160}
                    className=" h-full object-contain"
                    style={{ width: "auto" }}
                />
            )}
        </div>
    );
}
