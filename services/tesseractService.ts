import Tesseract, { createWorker, createScheduler, Worker, Scheduler, LoggerMessage } from 'tesseract.js';
import type { Language } from '../types';
import { preprocessImage } from '../utils/tesseractPreprocessing';
import { getOptimalConcurrency } from '../utils/concurrency';


let tesseractScheduler: Scheduler | null = null;
let currentLanguage: Language | null = null;
let initializationPromise: Promise<Scheduler> | null = null;

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
 * Initialize Tesseract.js SCHEDULER with multiple workers
 * Utilizes hardware concurrency (capped at 8)
 * Implements Initialization Lock to prevent race conditions.
 */
export const initializeTesseract = async (lang: Language): Promise<Scheduler> => {
    // 1. Wait for any pending initialization to finish (Barrier)
    if (initializationPromise) {
        try {
            await initializationPromise;
        } catch (e) {
            // Ignore error from pending init; we will retry fresh below if needed
        }
    }

    // 2. Check if we have a valid scheduler for the requested language
    if (tesseractScheduler && currentLanguage === lang) {
        // console.log(`[Tesseract] Reusing existing scheduler (${lang})`);
        return tesseractScheduler;
    }

    // 3. Double-check lock (in case another call started init while we waited)
    if (initializationPromise) {
        return initializeTesseract(lang);
    }

    // 4. Terminate old/mismatched scheduler
    if (tesseractScheduler) {
        console.log(`[Tesseract] Language changed or restart needed. Terminating old scheduler...`);
        await tesseractScheduler.terminate();
        tesseractScheduler = null;
    }

    const tesseractLang = lang === 'de' ? 'deu' : 'eng';

    // Determine worker count
    const optimalWorkers = Math.min(getOptimalConcurrency(), 8);
    const workerCount = Math.max(2, optimalWorkers);

    console.log(`[Tesseract] Initializing Scheduler with ${workerCount} workers for: ${tesseractLang}`);

    // 5. Start Initialization (Locked)
    initializationPromise = (async () => {
        try {
            const scheduler = createScheduler();

            // Create workers in parallel
            const workerPromises = Array.from({ length: workerCount }).map(async (_, index) => {
                // console.log(`[Tesseract] Creating worker ${index + 1}/${workerCount}...`);
                const worker = await createWorker(tesseractLang, 1, {
                    workerPath: '/tesseract/worker.min.js',
                    corePath: '/tesseract/tesseract-core.wasm.js',
                    langPath: '/tesseract',
                    gzip: true,
                    logger: (m: LoggerMessage) => {
                        // Only log significant events from first worker
                        if (index === 0 && (m.status === 'loading language traineddata' || m.progress === 1)) {
                            // Keep log (optional)
                            // console.log(`[Tesseract Worker 1] ${m.status} ${(m.progress * 100).toFixed(0)}%`);
                        }
                    }
                });

                await worker.setParameters({
                    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                    preserve_interword_spaces: '1',
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜßabcdefghijklmnopqrstuvwxyzäöüß0123456789@.,:;-+()/ \n',
                });

                scheduler.addWorker(worker);
                // console.log(`[Tesseract] Worker ${index + 1} ready.`);
            });

            await Promise.all(workerPromises);
            console.log(`[Tesseract] Scheduler fully ready with ${workerCount} workers.`);

            // Assign global state on success
            tesseractScheduler = scheduler;
            currentLanguage = lang;
            initializationPromise = null; // Release lock

            return scheduler;
        } catch (err) {
            console.error('[Tesseract] Scheduler initialization failed:', err);
            initializationPromise = null; // Release lock
            tesseractScheduler = null;
            throw err;
        }
    })();

    return initializationPromise;
};

/**
 * Terminate Tesseract scheduler to free memory
 */
export const terminateTesseract = async (): Promise<void> => {
    if (tesseractScheduler) {
        await tesseractScheduler.terminate();
        tesseractScheduler = null;
        currentLanguage = null;
        console.log('[Tesseract] Scheduler terminated');
    }
};

/**
 * Scan business card using Tesseract.js OCR via Scheduler
 */
export const scanWithTesseract = async (
    base64Image: string,
    lang: Language,
    enablePreprocessing = true,
    onProgress?: (progress: number) => void
): Promise<TesseractResult> => {
    const startTime = Date.now();

    try {
        // Initialize Scheduler (Idempotent)
        if (onProgress) onProgress(5);
        const scheduler = await initializeTesseract(lang);
        if (onProgress) onProgress(10);

        // Strip data prefix
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
                // Preprocessing happens on Main Thread for now (lightweight)
                processedImage = await preprocessImage(originalImage);
                if (onProgress) onProgress(30);
            } catch (preprocessError) {
                console.warn('[Tesseract] Preprocessing failed, using original image');
                processedImage = originalImage;
                if (onProgress) onProgress(30);
            }
        }

        // Perform OCR (Attempt 1) via Scheduler
        // 'recognize' job is distributed to an available worker
        console.log('[Tesseract] Scheduling OCR job (Attempt 1)...');

        const result1 = await scheduler.addJob('recognize', processedImage, {
            rotateAuto: true
        });

        console.log('[Tesseract] OCR job completed (Attempt 1)');

        const text1 = result1.data.text.trim();
        const conf1 = result1.data.confidence;

        // Check quality
        const isPoorResult = text1.length < 15 || conf1 < 40;

        // --- ATTEMPT 2: Retry without Preprocessing (if needed) ---
        if (enablePreprocessing && isPoorResult) {
            console.warn(`[Tesseract] Attempt 1 poor (Len: ${text1.length}, Conf: ${conf1}). Retrying raw...`);
            if (onProgress) onProgress(50);

            const result2 = await scheduler.addJob('recognize', originalImage, {
                rotateAuto: true
            });

            const text2 = result2.data.text.trim();
            const conf2 = result2.data.confidence;

            // Pick best result
            const attempts = [
                { r: result1, t: text1, c: conf1 },
                { r: result2, t: text2, c: conf2 }
            ];

            const bestAttempt = attempts.reduce((prev, curr) => {
                if (curr.t.length < 5) return prev;
                if (prev.t.length < 5) return curr;
                if (curr.t.length > prev.t.length * 1.5) return curr;
                return curr.c > prev.c ? curr : prev;
            });

            const finalData = bestAttempt.r.data;
            if (onProgress) onProgress(100);
            const processingTime = Date.now() - startTime;

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

        if (onProgress) onProgress(100);
        const processingTime = Date.now() - startTime;

        console.log(`[Tesseract] Completed in ${processingTime}ms. Conf: ${result1.data.confidence.toFixed(2)}%`);

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
        console.error('[Tesseract] Scheduler Error:', error);
        let errorMessage = 'Unknown error';
        if (error instanceof Error) errorMessage = error.message;
        else if (error) errorMessage = String(error);
        throw new Error(`Tesseract OCR failed: ${errorMessage}`);
    }
};

/**
 * Extract contact data from Tesseract OCR result
 */
export const extractContactFromOCR = (ocrText: string, lang: Language): any => {
    // Placeholder
    return {
        rawText: ocrText,
        note: 'Tesseract OCR result'
    };
};
