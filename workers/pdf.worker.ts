import * as pdfjsLib from 'pdfjs-dist';

// Configure worker. Use the version associated with the installed package.
// We use the CDN for guaranteed availability and version matching, 
// or strictly point to the public file if we are sure it matches.
// Given the issues, CDN is safest for a quick fix, but ideally local.
// Let's try explicit public path first, but ensure it is treated as a URL.
// self.location.origin is available in Worker.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('/pdf.worker.min.mjs', self.location.origin).toString();

self.onmessage = async (e: MessageEvent) => {
    const { id, fileData, fileName } = e.data;

    try {
        console.log(`[PDFWorker] Processing ${fileName}`);

        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument({
            data: fileData,
            // Standard font usage
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
            cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        const images: Blob[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });

            // Use OffscreenCanvas
            const offscreenCanvas = new OffscreenCanvas(viewport.width, viewport.height);
            const context = offscreenCanvas.getContext('2d');

            if (!context) throw new Error("Could not get OffscreenCanvas context");

            await page.render({
                canvasContext: context as any, // Type cast for OffscreenCanvas
                viewport: viewport,
                // Some versions require 'canvas' property even if context is used, passing null or offscreen might work
            } as any).promise;

            const blob = await offscreenCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
            images.push(blob);
        }

        self.postMessage({ type: 'success', id, images, fileName });

    } catch (error: any) {
        console.error(`[PDFWorker] Error processing ${fileName}`, error);
        self.postMessage({ type: 'error', id, error: error.message, fileName });
    }
};

export { };
