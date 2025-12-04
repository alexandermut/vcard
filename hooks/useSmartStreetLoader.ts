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

            // 1. Check Connection
            const nav = navigator as any;
            if (nav.connection) {
                const conn = nav.connection;
                if (conn.saveData) {
                    console.log("[SmartLoader] Data Saver enabled. Skipping auto-load.");
                    return;
                }
                // We removed the strict 'effectiveType' check to allow auto-loading more often.
                // The street DB is large (~20MB) but we want it to load if possible.
                // Users can still cancel or we rely on the browser's own throttling if really slow.
            }

            // 2. Check Storage
            if (nav.storage && nav.storage.estimate) {
                try {
                    const estimate = await nav.storage.estimate();
                    if (estimate.quota && estimate.usage) {
                        const freeSpaceBytes = estimate.quota - estimate.usage;
                        const freeSpaceMB = freeSpaceBytes / (1024 * 1024);

                        if (freeSpaceMB < minFreeSpaceMB) {
                            console.warn(`[SmartLoader] Low storage (${Math.round(freeSpaceMB)}MB free). Skipping auto-load.`);
                            return;
                        }
                        console.log(`[SmartLoader] Storage check passed (${Math.round(freeSpaceMB)}MB free).`);
                    }
                } catch (e) {
                    console.warn("[SmartLoader] Storage estimate failed", e);
                    // Continue if check fails? Maybe safer to skip.
                    return;
                }
            }

            // 3. Trigger Load (via Idle Callback to be nice)
            const idleCallback = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 1000));

            idleCallback(() => {
                console.log("[SmartLoader] Conditions met. Starting auto-load...");
                onLoad();
            }, { timeout: 5000 });
        };

        // Delay initial check slightly to let app settle
        const timer = setTimeout(checkAndLoad, 2000);
        return () => clearTimeout(timer);

    }, [enabled, status, onLoad, minFreeSpaceMB]);
};
