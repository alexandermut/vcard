// Use global PDF.js loaded via script tag in index.html
// This avoids bundler/worker issues
declare global {
    interface Window {
        pdfjsLib: any;
    }
}

export const convertPdfToImages = async (file: File): Promise<Blob[]> => {
    try {
        const pdfjsLib = window.pdfjsLib;
        if (!pdfjsLib) {
            throw new Error("PDF.js library not loaded");
        }

        console.log(`PDFJS Version (Global): ${pdfjsLib.version}`);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const images: Blob[] = [];

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

                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
                if (blob) {
                    images.push(blob);
                }
            }
        }

        return images;
    } catch (error) {
        console.error("PDF Conversion Error:", error);
        throw error;
    }
};
