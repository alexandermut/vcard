export const ingestStreets = (
    onProgress: (progress: number, message: string) => void
): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Instantiate the worker
        const worker = new Worker(new URL('./street.worker.ts', import.meta.url), {
            type: 'module',
        });

        worker.onmessage = (e) => {
            const { type, percent, message, error } = e.data;

            if (type === 'progress') {
                onProgress(percent, message);
            } else if (type === 'done') {
                worker.terminate();
                resolve();
            } else if (type === 'error') {
                worker.terminate();
                reject(new Error(error));
            }
        };

        worker.onerror = (err) => {
            worker.terminate();
            reject(err);
        };

        // Start the worker
        worker.postMessage('start');
    });
};
