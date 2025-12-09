import PdfWorker from '../workers/pdf.worker.ts?worker';

// Queue system for worker
const worker = new PdfWorker();
const pendingPromises = new Map<string, { resolve: (blobs: Blob[]) => void, reject: (err: any) => void }>();

// Listen for worker messages
worker.onmessage = (e) => {
    const { type, id, images, error } = e.data;
    if (pendingPromises.has(id)) {
        const { resolve, reject } = pendingPromises.get(id)!;
        if (type === 'success') {
            resolve(images);
        } else {
            reject(new Error(error));
        }
        pendingPromises.delete(id);
    }
};

export const convertPdfToImages = async (file: File): Promise<Blob[]> => {
    return new Promise(async (resolve, reject) => {
        try {
            const id = Math.random().toString(36).substring(7);
            const arrayBuffer = await file.arrayBuffer();

            pendingPromises.set(id, { resolve, reject });

            // Send data to worker
            worker.postMessage({
                id,
                fileData: arrayBuffer,
                fileName: file.name
            }, [arrayBuffer]); // Transfer buffer for performance

        } catch (error) {
            reject(error);
        }
    });
};
