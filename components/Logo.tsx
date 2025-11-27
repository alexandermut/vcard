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

    // Full Logo: "kontakte.me" with icon as 'o'
    // Viewbox needs to be wider. Text is roughly 4-5x height.
    // Let's estimate: "k" (width 40) + "o" (width 60) + "ntakte.me" (width ~300)
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 420 80"
            height={height}
            className={className}
            preserveAspectRatio="xMidYMid meet"
        >
            <style>
                {`
          .logo-text { font-family: system-ui, -apple-system, sans-serif; font-weight: 800; }
        `}
            </style>

            {/* k */}
            <text x="0" y="60" className="logo-text" fontSize="60" fill="currentColor">k</text>

            {/* o (Icon) - shifted to align with text */}
            <g transform="translate(36, 10) scale(0.55)">
                <IconContent />
            </g>

            {/* ntakte.me */}
            <text x="96" y="60" className="logo-text" fontSize="60" fill="currentColor">ntakte.me</text>
        </svg>
    );
};
