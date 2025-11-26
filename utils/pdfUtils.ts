import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
// Use local v3 worker for stability
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.v3.min.js`;

export const convertPdfToImages = async (file: File): Promise<string[]> => {
    try {
        console.log(`PDFJS Version: ${pdfjsLib.version}`);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const images: string[] = [];

        console.log(`PDF loaded: ${file.name}, Pages: ${pdf.numPages}`);

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // 2.0 scale for better quality

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                await page.render(renderContext).promise;
                images.push(canvas.toDataURL('image/jpeg', 0.8));
            }
        }

        return images;
    } catch (error) {
        console.error("PDF Conversion Error:", error);
        throw error;
    }
};
