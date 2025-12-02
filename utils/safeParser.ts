export const parseImpressumSafe = (text: string, timeoutMs = 2000): Promise<string> => {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./parserWorker.ts', import.meta.url), { type: 'module' });

        const timer = setTimeout(() => {
            worker.terminate();
            reject(new Error(`Parser timed out after ${timeoutMs}ms (ReDoS protection)`));
        }, timeoutMs);

        worker.onmessage = (e) => {
            clearTimeout(timer);
            if (e.data.type === 'success') {
                resolve(e.data.result);
            } else {
                reject(new Error(e.data.error));
            }
            worker.terminate(); // Clean up
        };

        worker.onerror = (err) => {
            clearTimeout(timer);
            reject(err);
            worker.terminate();
        };

        worker.postMessage(text);
    });
};
