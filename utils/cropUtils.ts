import smartcrop from 'smartcrop';

/**
 * Uses smartcrop.js to find the best crop for a business card.
 * We assume a standard business card aspect ratio (approx 1.6).
 */
export const autoCropImage = (base64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            // Business card aspect ratio ~ 1.58 (85mm x 55mm) or 1.75 (US)
            // We'll use 1.6 as a good middle ground.
            // We want to crop to the "interesting" part, which should be the card.
            const options = {
                width: 1600,
                height: 1000,
                minScale: 0.5,
                ruleOfThirds: false,
                debug: false
            };

            smartcrop.crop(img, options).then((result) => {
                const crop = result.topCrop;
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error("No canvas context"));
                    return;
                }

                canvas.width = crop.width;
                canvas.height = crop.height;

                ctx.drawImage(
                    img,
                    crop.x,
                    crop.y,
                    crop.width,
                    crop.height,
                    0,
                    0,
                    crop.width,
                    crop.height
                );

                resolve(canvas.toDataURL('image/jpeg', 0.9));
            }).catch(err => {
                console.error("Smartcrop failed:", err);
                // Fallback: return original
                resolve(base64);
            });
        };
        img.onerror = reject;
        img.src = base64;
    });
};

export const cropImageByBounds = (base64: string, bounds: { ymin: number; xmin: number; ymax: number; xmax: number }): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("No canvas context"));
                return;
            }

            // Convert normalized bounds (0-100) to pixels
            const x = Math.floor((bounds.xmin / 100) * img.width);
            const y = Math.floor((bounds.ymin / 100) * img.height);
            const w = Math.floor(((bounds.xmax - bounds.xmin) / 100) * img.width);
            const h = Math.floor(((bounds.ymax - bounds.ymin) / 100) * img.height);

            // Safety check
            if (w <= 0 || h <= 0) {
                resolve(base64); // Return original if invalid
                return;
            }

            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = reject;
        img.src = base64;
    });
};
