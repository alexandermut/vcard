import React from 'react';

interface LogoProps {
    className?: string;
    height?: number | string;
    variant?: 'icon' | 'full';
}

export const Logo: React.FC<LogoProps> = ({ className = "", height = 40, variant = 'full' }) => {
    // Icon: "◉"
    if (variant === 'icon') {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 100"
                height={height}
                className={className}
                preserveAspectRatio="xMidYMid meet"
            >
                <style>
                    {`
            .logo-symbol { font-family: system-ui, -apple-system, sans-serif; font-weight: 800; }
          `}
                </style>
                <text x="50" y="70" textAnchor="middle" className="logo-symbol" fontSize="80" fill="currentColor">◉</text>
            </svg>
        );
    }

    // Full Logo: "k◉ntakte.me"
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

            <text x="0" y="60" className="logo-text" fontSize="60" fill="currentColor">k◉ntakte.me</text>
        </svg>
    );
};
