import { useEffect, useRef } from 'react';

interface SmartLoaderOptions {
    enabled: boolean;
    status: 'idle' | 'loading' | 'ready' | 'error';
    onLoad: () => void;
    minFreeSpaceMB?: number; // Default 500MB
}

export const useSmartStreetLoader = ({
    enabled,
    status,
    onLoad,
    minFreeSpaceMB = 50
}: SmartLoaderOptions) => {
    const hasChecked = useRef(false);

    useEffect(() => {
        if (!enabled || status !== 'idle' || hasChecked.current) return;

        const checkAndLoad = async () => {
            hasChecked.current = true; // Only check once per session

            // 1. Check Connection (Log only, don't block)
            const nav = navigator as any;
            if (nav.connection) {
                const conn = nav.connection;
                if (conn.saveData) {
                    console.warn("[SmartLoader] Data Saver enabled. Proceeding anyway (user can cancel).");
                }
            }

            // 2. Check Storage
            if (nav.storage && nav.storage.estimate) {
                try {
                    const estimate = await nav.storage.estimate();
                    if (estimate.quota && estimate.usage) {
                        const freeSpaceBytes = estimate.quota - estimate.usage;
                        const freeSpaceMB = freeSpaceBytes / (1024 * 1024);

                        // Lower limit to 10MB
                        if (freeSpaceMB < 10) {
                            console.warn(`[SmartLoader] Very low storage (${Math.round(freeSpaceMB)}MB free). Skipping auto-load.`);
                            return;
                        }
                        console.log(`[SmartLoader] Storage check passed (${Math.round(freeSpaceMB)}MB free).`);
                    }
                } catch (e) {
                    console.warn("[SmartLoader] Storage estimate failed", e);
                }
            }

            // 3. Trigger Load immediately
            console.log("[SmartLoader] Conditions met. Starting auto-load...");
            onLoad();
        };

        const timer = setTimeout(checkAndLoad, 1000);
        return () => clearTimeout(timer);

    }, [enabled, status, onLoad]);
};
