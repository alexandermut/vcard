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

        // CanvasFactory for Worker environment
        const canvasFactory = {
            create: function (width: number, height: number) {
                if (width <= 0 || height <= 0) {
                    throw new Error("Invalid canvas size");
                }
                const canvas = new OffscreenCanvas(width, height);
                const context = canvas.getContext("2d");
                return {
                    canvas: canvas,
                    context: context,
                };
            },
            reset: function (canvasAndContext: any, width: number, height: number) {
                if (!canvasAndContext.canvas) return;
                canvasAndContext.canvas.width = width;
                canvasAndContext.canvas.height = height;
            },
            destroy: function (canvasAndContext: any) {
                if (!canvasAndContext.canvas) return;
                canvasAndContext.canvas.width = 0;
                canvasAndContext.canvas.height = 0;
                canvasAndContext.canvas = null;
                canvasAndContext.context = null;
            },
        };

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });

            // Use Factory to create canvas
            const canvasData = canvasFactory.create(viewport.width, viewport.height);

            await page.render({
                canvasContext: canvasData.context as any,
                viewport: viewport,
                canvasFactory: canvasFactory
            } as any).promise;

            const blob = await (canvasData.canvas as OffscreenCanvas).convertToBlob({ type: 'image/jpeg', quality: 0.8 });
            images.push(blob);
        }

        self.postMessage({ type: 'success', id, images, fileName });

    } catch (error: any) {
        console.error(`[PDFWorker] Error processing ${fileName}`, error);
        self.postMessage({ type: 'error', id, error: error.message, fileName });
    }
};

export { };
