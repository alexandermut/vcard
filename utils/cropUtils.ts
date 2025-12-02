/**
 * Detects the bounding box of a document in an image using background subtraction.
 * Assumes the document contrasts with the background (e.g. white card on dark table).
 */
export const autoCropImage = (base64: string, threshold = 30): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("No canvas context"));
                return;
            }

            // Downscale for processing speed (max 500px)
            const maxDim = 500;
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const procWidth = Math.floor(img.width * scale);
            const procHeight = Math.floor(img.height * scale);

            canvas.width = procWidth;
            canvas.height = procHeight;
            ctx.drawImage(img, 0, 0, procWidth, procHeight);

            const imageData = ctx.getImageData(0, 0, procWidth, procHeight);
            const data = imageData.data;

            // 1. Sample Background Color (Average of 4 corners)
            // We take a 5x5 patch from each corner
            const getAvgColor = (startX: number, startY: number) => {
                let r = 0, g = 0, b = 0, count = 0;
                for (let y = startY; y < startY + 5 && y < procHeight; y++) {
                    for (let x = startX; x < startX + 5 && x < procWidth; x++) {
                        const i = (y * procWidth + x) * 4;
                        r += data[i];
                        g += data[i + 1];
                        b += data[i + 2];
                        count++;
                    }
                }
                return { r: r / count, g: g / count, b: b / count };
            };

            const tl = getAvgColor(0, 0);
            const tr = getAvgColor(procWidth - 5, 0);
            const bl = getAvgColor(0, procHeight - 5);
            const br = getAvgColor(procWidth - 5, procHeight - 5);

            // Average background color
            const bg = {
                r: (tl.r + tr.r + bl.r + br.r) / 4,
                g: (tl.g + tr.g + bl.g + br.g) / 4,
                b: (tl.b + tr.b + bl.b + br.b) / 4
            };

            // 2. Scan for bounds
            // We look for the first row/col that has significant deviation from BG
            const isContent = (r: number, g: number, b: number) => {
                const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
                return diff > threshold * 3; // Threshold for sum of diffs
            };

            let minX = procWidth, minY = procHeight, maxX = 0, maxY = 0;

            // Scan Y
            for (let y = 0; y < procHeight; y++) {
                for (let x = 0; x < procWidth; x++) {
                    const i = (y * procWidth + x) * 4;
                    if (isContent(data[i], data[i + 1], data[i + 2])) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            // Safety check: If we didn't find anything significant, return original
            if (maxX <= minX || maxY <= minY) {
                resolve(base64);
                return;
            }

            // Add some padding (5%)
            const padX = (maxX - minX) * 0.05;
            const padY = (maxY - minY) * 0.05;

            minX = Math.max(0, minX - padX);
            minY = Math.max(0, minY - padY);
            maxX = Math.min(procWidth, maxX + padX);
            maxY = Math.min(procHeight, maxY + padY);

            // 3. Crop Original Image
            // Map back to original coordinates
            const origMinX = Math.floor(minX / scale);
            const origMinY = Math.floor(minY / scale);
            const origWidth = Math.floor((maxX - minX) / scale);
            const origHeight = Math.floor((maxY - minY) / scale);

            // Create final canvas
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = origWidth;
            finalCanvas.height = origHeight;
            const finalCtx = finalCanvas.getContext('2d');

            if (!finalCtx) {
                reject(new Error("Final canvas context failed"));
                return;
            }

            finalCtx.drawImage(img, origMinX, origMinY, origWidth, origHeight, 0, 0, origWidth, origHeight);

            resolve(finalCanvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = reject;
        img.src = base64;
    });
};
