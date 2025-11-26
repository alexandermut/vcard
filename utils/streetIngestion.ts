import StreetWorker from './street.worker?worker';

export const ingestStreets = (
    onProgress: (progress: number, message: string) => void
): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Instantiate the worker using Vite's explicit worker import
        const worker = new StreetWorker();

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

        // Calculate correct URL for streets.csv based on document.baseURI
        // This is the most robust way to find sibling files in public/
        const csvUrl = new URL('streets.csv', document.baseURI).href;
        console.log("[StreetDB] Calculated CSV URL:", csvUrl);

        // Start the worker with the CSV URL
        console.log("[StreetDB] Starting worker...");
        worker.postMessage({ type: 'start', url: csvUrl });
    });
};
