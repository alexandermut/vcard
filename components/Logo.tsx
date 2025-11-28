import React from 'react';

interface LogoProps {
    className?: string;
    height?: number | string;
    variant?: 'icon' | 'full';
}

export const Logo: React.FC<LogoProps> = ({ className = "", height = 40, variant = 'full' }) => {
    // Icon Path (Person in Circle)
    // Circle: 100x100 viewbox
    const IconContent = () => (
        <g>
            <circle cx="50" cy="50" r="50" className="fill-[#0e4052] dark:fill-[#00a2ff]" />
            <path
                d="M50 25a15 15 0 1 1-15 15 15 15 0 0 1 15-15zm0 35c16.5 0 30 8.5 30 21v4H20v-4c0-12.5 13.5-21 30-21z"
                fill="white"
            />
        </g>
    );

    if (variant === 'icon') {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 100"
                height={height}
                className={className}
                preserveAspectRatio="xMidYMid meet"
            >
                <IconContent />
            </svg>
        );
    }

    // Full Logo: "k( )ntakte.me"
    // Estimated width: "k( )ntakte.me" is roughly 13 chars.
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 450 80"
            height={height}
            className={className}
            preserveAspectRatio="xMidYMid meet"
        >
            <style>
                {`
          .logo-text { font-family: system-ui, -apple-system, sans-serif; font-weight: 800; }
        `}
            </style>

            <text x="0" y="60" className="logo-text" fontSize="60" fill="currentColor">k( )ntakte.me</text>
        </svg>
    );
};
