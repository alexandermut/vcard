/**
 * Image preprocessing utilities for improved OCR accuracy
 * Uses Canvas API for in-browser image manipulation
 */

/**
 * Main preprocessing pipeline
 * Applies multiple enhancements to optimize image for Tesseract OCR
 */
export const preprocessImage = async (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            try {
                // Step 1: Resize to optimal DPI (~300)
                const resizedCanvas = resizeTo300DPI(img);

                // Step 2: Convert to grayscale
                const grayscaleCanvas = convertToGrayscale(resizedCanvas);

                // Step 3: Enhance contrast
                const contrastCanvas = enhanceContrast(grayscaleCanvas);

                // Step 4: Apply adaptive binarization
                const binarizedCanvas = binarize(contrastCanvas);

                // Convert final canvas to base64
                const result = binarizedCanvas.toDataURL('image/png');
                resolve(result);
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => reject(new Error('Failed to load image for preprocessing'));
        img.src = base64Image;
    });
};

/**
 * Resize image to optimal resolution for OCR (approximately 300 DPI)
 * Business cards are typically 3.5" x 2", so target ~1050x600 pixels
 */
const resizeTo300DPI = (img: HTMLImageElement): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Target dimensions (approximation for 300 DPI)
    const TARGET_WIDTH = 1050;
    const aspectRatio = img.height / img.width;

    // Only resize if image is significantly different from target
    if (img.width < TARGET_WIDTH * 0.8 || img.width > TARGET_WIDTH * 1.5) {
        canvas.width = TARGET_WIDTH;
        canvas.height = Math.round(TARGET_WIDTH * aspectRatio);
    } else {
        // Keep original size if already close to optimal
        canvas.width = img.width;
        canvas.height = img.height;
    }

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    console.log(`[Preprocessing] Resized from ${img.width}x${img.height} to ${canvas.width}x${canvas.height}`);
    return canvas;
};

/**
 * Convert image to grayscale
 * Reduces complexity and improves OCR accuracy
 */
const convertToGrayscale = (inputCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = inputCanvas.width;
    canvas.height = inputCanvas.height;

    ctx.drawImage(inputCanvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply grayscale conversion (luminance formula)
    for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        data[i] = gray;       // Red
        data[i + 1] = gray;   // Green
        data[i + 2] = gray;   // Blue
        // Alpha (data[i + 3]) stays unchanged
    }

    ctx.putImageData(imageData, 0, 0);

    console.log('[Preprocessing] Converted to grayscale');
    return canvas;
};

/**
 * Enhance image contrast
 * Makes text stand out more clearly from background
 */
const enhanceContrast = (inputCanvas: HTMLCanvasElement, factor = 1.3): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = inputCanvas.width;
    canvas.height = inputCanvas.height;

    ctx.drawImage(inputCanvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const contrast = (factor - 1) * 255;
    const intercept = 128 - (factor * 128);

    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factor * data[i] + intercept));         // Red
        data[i + 1] = Math.min(255, Math.max(0, factor * data[i + 1] + intercept)); // Green
        data[i + 2] = Math.min(255, Math.max(0, factor * data[i + 2] + intercept)); // Blue
    }

    ctx.putImageData(imageData, 0, 0);

    console.log(`[Preprocessing] Enhanced contrast (factor: ${factor})`);
    return canvas;
};

/**
 * Apply adaptive binarization (convert to pure black and white)
 * Uses Otsu's method approximation for automatic threshold detection
 */
const binarize = (inputCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = inputCanvas.width;
    canvas.height = inputCanvas.height;

    ctx.drawImage(inputCanvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calculate histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
        histogram[data[i]]++;
    }

    // Calculate threshold using Otsu's method
    const threshold = calculateOtsuThreshold(histogram, data.length / 4);

    // Apply threshold
    for (let i = 0; i < data.length; i += 4) {
        const value = data[i] > threshold ? 255 : 0;
        data[i] = value;       // Red
        data[i + 1] = value;   // Green
        data[i + 2] = value;   // Blue
    }

    ctx.putImageData(imageData, 0, 0);

    console.log(`[Preprocessing] Binarized with threshold: ${threshold}`);
    return canvas;
};

/**
 * Calculate optimal threshold using Otsu's method
 */
const calculateOtsuThreshold = (histogram: number[], totalPixels: number): number => {
    let sum = 0;
    for (let i = 0; i < 256; i++) {
        sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 0;

    for (let i = 0; i < 256; i++) {
        wB += histogram[i];
        if (wB === 0) continue;

        wF = totalPixels - wB;
        if (wF === 0) break;

        sumB += i * histogram[i];

        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;

        const variance = wB * wF * (mB - mF) * (mB - mF);

        if (variance > maxVariance) {
            maxVariance = variance;
            threshold = i;
        }
    }

    return threshold;
};

/**
 * Optional: Denoise image using simple Gaussian blur approximation
 * Can be applied before binarization for very noisy images
 */
export const denoise = (inputCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = inputCanvas.width;
    canvas.height = inputCanvas.height;

    // Simple box blur (faster than true Gaussian)
    ctx.filter = 'blur(1px)';
    ctx.drawImage(inputCanvas, 0, 0);

    console.log('[Preprocessing] Applied denoising');
    return canvas;
};
