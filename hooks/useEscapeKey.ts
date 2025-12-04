import { useEffect } from 'react';

/**
 * Hook to handle Escape key press
 * @param onEscape Callback function to run when Escape is pressed
 * @param isActive Whether the listener should be active (e.g., only when sidebar is open)
 */
export const useEscapeKey = (onEscape: () => void, isActive: boolean = true) => {
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onEscape();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onEscape, isActive]);
};
