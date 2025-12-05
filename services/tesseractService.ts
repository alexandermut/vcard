import Tesseract, { createWorker, Worker, LoggerMessage } from 'tesseract.js';
import type { Language } from '../types';
import { preprocessImage } from '../utils/tesseractPreprocessing';


let tesseractWorker: Worker | null = null;
let currentLanguage: Language | null = null;

export interface OCRLine {
    text: string;
    confidence: number;
    bbox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
}

export interface TesseractResult {
    text: string;
    lines: OCRLine[];
    confidence: number;
    processingTime: number;
}

/**
 * Initialize Tesseract.js worker with German or English language data
 * FIX: Now properly handles language switching
 */
export const initializeTesseract = async (lang: Language): Promise<Worker> => {
    // Check if worker exists AND language matches
    if (tesseractWorker && currentLanguage === lang) {
        console.log(`[Tesseract] Reusing existing worker (${lang})`);
        return tesseractWorker;
    }

    // If language changed, terminate old worker
    if (tesseractWorker && currentLanguage !== lang) {
        console.log(`[Tesseract] Language changed from ${currentLanguage} to ${lang}, terminating old worker`);
        await tesseractWorker.terminate();
        tesseractWorker = null;
    }

    const tesseractLang = lang === 'de' ? 'deu' : 'eng';

    console.log(`[Tesseract] Initializing worker with language: ${tesseractLang}`);
    console.log('[Tesseract] About to call createWorker...');

    try {
        const worker = await createWorker(tesseractLang, 1, {
            workerPath: '/tesseract/worker.min.js',
            corePath: '/tesseract/tesseract-core.wasm.js',
            langPath: '/tesseract',
            gzip: true,
            logger: (m: LoggerMessage) => {
                console.log('[Tesseract] Worker log:', m.status, m.progress);
                if (m.status === 'loading language traineddata') {
                    console.log(`[Tesseract] Loading ${tesseractLang}.traineddata...`);
                }
            }
        });

        console.log('[Tesseract] createWorker completed, worker:', worker);

        if (!worker) {
            throw new Error('createWorker returned null/undefined');
        }

        // Configure for business card recognition
        console.log('[Tesseract] Setting parameters...');
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO, // Automatic page segmentation
            preserve_interword_spaces: '1',
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜßabcdefghijklmnopqrstuvwxyzäöüß0123456789@.,:;-+()/ \n',
        });
        console.log('[Tesseract] Parameters set successfully');

        tesseractWorker = worker;
        currentLanguage = lang;

        console.log('[Tesseract] Worker initialization complete');
        return worker;
    } catch (err) {
        console.error('[Tesseract] Worker creation failed:', err);
        console.error('[Tesseract] Error type:', typeof err);
        console.error('[Tesseract] Error details:', err);
        throw err;
    }
};

/**
 * Terminate Tesseract worker to free memory
 */
export const terminateTesseract = async (): Promise<void> => {
    if (tesseractWorker) {
        await tesseractWorker.terminate();
        tesseractWorker = null;
        currentLanguage = null;
        console.log('[Tesseract] Worker terminated');
    }
};

/**
 * Scan business card using Tesseract.js OCR
 * 
 * @param base64Image - Base64-encoded image (with or without data:image/... prefix)
 * @param lang - Language for OCR (de or en)
 * @param enablePreprocessing - Apply image preprocessing for better accuracy
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns Extracted text and metadata
 */
export const scanWithTesseract = async (
    base64Image: string,
    lang: Language,
    enablePreprocessing = true,
    onProgress?: (progress: number) => void
): Promise<TesseractResult> => {
    const startTime = Date.now();

    try {
        // Initialize worker
        console.log('[Tesseract] Starting OCR process...');
        if (onProgress) onProgress(5);

        const worker = await initializeTesseract(lang);
        console.log('[Tesseract] Worker initialized successfully');
        if (onProgress) onProgress(10);

        // Strip data:image/... prefix if present
        let imageData = base64Image;
        if (base64Image.includes(',')) {
            imageData = base64Image.split(',')[1];
        }

        const originalImage = `data:image/png;base64,${imageData}`;
        let processedImage = originalImage;

        // --- ATTEMPT 1: With Preprocessing (if enabled) ---
        if (enablePreprocessing) {
            try {
                if (onProgress) onProgress(20);
                console.log('[Tesseract] Preprocessing image...');
                processedImage = await preprocessImage(originalImage);
                console.log('[Tesseract] Preprocessing completed successfully');
                if (onProgress) onProgress(30);
            } catch (preprocessError) {
                console.warn('[Tesseract] Preprocessing failed, using original image:', preprocessError);
                processedImage = originalImage;
                if (onProgress) onProgress(30);
            }
        }

        // Perform OCR (Attempt 1)
        console.log('[Tesseract] Starting OCR recognition (Attempt 1)...');
        const result1 = await worker.recognize(processedImage, {
            rotateAuto: true,
        });
        console.log('[Tesseract] OCR recognition completed (Attempt 1)');

        const text1 = result1.data.text.trim();
        const conf1 = result1.data.confidence;

        // Check quality of Attempt 1
        const isPoorResult = text1.length < 15 || conf1 < 40;

        // --- ATTEMPT 2: Retry without Preprocessing (if needed) ---
        // Only if we used preprocessing AND the result is poor
        if (enablePreprocessing && isPoorResult) {
            console.warn(`[Tesseract] Attempt 1 yielded poor results (Len: ${text1.length}, Conf: ${conf1}). Retrying without preprocessing...`);

            if (onProgress) onProgress(50); // Reset progress slightly

            const result2 = await worker.recognize(originalImage, {
                rotateAuto: true,
            });

            const text2 = result2.data.text.trim();
            const conf2 = result2.data.confidence;

            console.log(`[Tesseract] Attempt 2 Result - Len: ${text2.length}, Conf: ${conf2}`);

            // If Attempt 2 is better, use it
            // "Better" = significantly more text, or better confidence if text length is comparable
            const attempts = [
                { r: result1, t: text1, c: conf1 },
                { r: result2, t: text2, c: conf2 }
            ];

            // Simple heuristic: prefer the one with more text (assuming business cards have content)
            // But if text length is close, prefer higher confidence.
            const bestAttempt = attempts.reduce((prev, curr) => {
                // If one has very little text, discard it
                if (curr.t.length < 5) return prev;
                if (prev.t.length < 5) return curr;

                // If current has 50% more text, take it
                if (curr.t.length > prev.t.length * 1.5) return curr;

                // If lengths are comparable, take higher confidence
                return curr.c > prev.c ? curr : prev;
            });

            console.log('[Tesseract] improved result found:', bestAttempt === attempts[1]);

            // Use local variable for final data to avoid TypeScript error with 'const'
            const finalData = bestAttempt.r.data;

            if (onProgress) onProgress(100);

            const processingTime = Date.now() - startTime;

            // Extract lines with bounding boxes
            const lines: OCRLine[] = ((finalData as any).lines || []).map((line: any) => ({
                text: line.text.trim(),
                confidence: line.confidence,
                bbox: line.bbox
            })).filter((l: OCRLine) => l.text.length > 0);

            return {
                text: finalData.text,
                lines,
                confidence: finalData.confidence,
                processingTime,
            };
        }

        // If Attempt 1 was good enough (or no preprocessing used), return it
        if (onProgress) onProgress(100);

        const processingTime = Date.now() - startTime;

        console.log(`[Tesseract] OCR completed in ${processingTime}ms`);
        console.log(`[Tesseract] Confidence: ${result1.data.confidence.toFixed(2)}%`);
        console.log(`[Tesseract] Text length: ${result1.data.text.length} chars`);

        // Extract lines with bounding boxes
        const lines: OCRLine[] = ((result1.data as any).lines || []).map((line: any) => ({
            text: line.text.trim(),
            confidence: line.confidence,
            bbox: line.bbox
        })).filter((l: OCRLine) => l.text.length > 0);

        return {
            text: result1.data.text,
            lines,
            confidence: result1.data.confidence,
            processingTime,
        };

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error('[Tesseract] OCR Error:', error);

        // Improved error message
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (error) {
            errorMessage = String(error);
        }

        console.error('[Tesseract] Error details:', {
            type: typeof error,
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
        });

        throw new Error(`Tesseract OCR failed: ${errorMessage}`);
    }
};

/**
 * Extract contact data from Tesseract OCR result
 * Uses the existing regexParser for structured data extraction
 * 
 * Note: This is a placeholder - integrate with your actual contactParser/regexParser
 */
export const extractContactFromOCR = (ocrText: string, lang: Language): any => {
    // TODO: Import and use your existing regexParser.ts
    // For now, return raw text
    console.log('[Tesseract] Raw OCR text:', ocrText);

    return {
        rawText: ocrText,
        // Will be replaced with actual parser logic
        note: 'Tesseract OCR result - parsing not yet implemented'
    };
};
