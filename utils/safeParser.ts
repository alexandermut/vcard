import { parseImpressumToVCard } from './regexParser';

export const parseImpressumSafe = (text: string, timeoutMs = 2000): Promise<string> => {
    return new Promise((resolve, reject) => {
        let worker: Worker | null = null;
        let timer: NodeJS.Timeout | null = null;
        let isResolved = false;

        const cleanup = () => {
            if (timer) clearTimeout(timer);
            if (worker) {
                worker.terminate();
                worker = null;
            }
        };

        const fallbackToMainThread = () => {
            if (isResolved) return;
            isResolved = true;
            cleanup();
            console.warn("Worker parser failed or timed out, falling back to main thread.");
            try {
                const result = parseImpressumToVCard(text);
                resolve(result);
            } catch (e) {
                reject(e);
            }
        };

        try {
            worker = new Worker(new URL('./parserWorker.ts', import.meta.url), { type: 'module' });

            timer = setTimeout(() => {
                console.warn(`Parser worker timed out after ${timeoutMs}ms`);
                fallbackToMainThread();
            }, timeoutMs);

            worker.onmessage = (e) => {
                if (isResolved) return;
                if (e.data.type === 'success') {
                    isResolved = true;
                    cleanup();
                    resolve(e.data.result);
                } else {
                    console.warn("Worker reported error:", e.data.error);
                    fallbackToMainThread();
                }
            };

            worker.onerror = (err) => {
                console.warn("Worker error:", err);
                fallbackToMainThread();
            };

            worker.postMessage(text);
        } catch (e) {
            console.warn("Failed to create worker:", e);
            fallbackToMainThread();
        }
    });
};
