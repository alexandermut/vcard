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

        // Calculate correct URL for streets.csv based on current location and base URL
        const baseUrl = import.meta.env.BASE_URL;
        // Ensure baseUrl ends with /
        const normalizedBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
        const csvUrl = new URL(`${normalizedBase}streets.csv`, window.location.origin).href;

        // Start the worker with the CSV URL
        worker.postMessage({ type: 'start', url: csvUrl });
    });
};
