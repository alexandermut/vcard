import Tesseract, { createWorker, createScheduler, Worker, Scheduler, LoggerMessage } from 'tesseract.js';
import type { Language } from '../types';
import { preprocessImage } from '../utils/tesseractPreprocessing';
import { getOptimalConcurrency } from '../utils/concurrency';


let tesseractScheduler: Scheduler | null = null;
let currentLanguage: Language | null = null;
let initializationPromise: Promise<Scheduler> | null = null;
let isResetting = false; // Global lock for resetting

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
    const optimalWorkers = Math.min(getOptimalConcurrency(), 4); // Capped at 4 for stability
    const workerCount = Math.max(2, optimalWorkers);

    console.log(`[Tesseract] Initializing Scheduler with ${workerCount} workers for: ${tesseractLang}`);

    // 5. Start Initialization (Locked)
    initializationPromise = (async () => {
        try {
            const scheduler = createScheduler();

            // Create workers in parallel (but staggered to prevent browser freeze)
            const workerPromises = Array.from({ length: workerCount }).map(async (_, index) => {
                // Stagger initialization by 200ms per worker to prevent CPU/Network spike
                await new Promise(r => setTimeout(r, index * 200));

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
                console.log(`[Tesseract] Worker ${index + 1}/${workerCount} added.`);
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
import { rotateImage } from '../utils/imageUtils';

export const scanWithTesseract = async (
    base64Image: string,
    lang: Language,
    enablePreprocessing = true,
    onProgress?: (progress: number) => void
): Promise<TesseractResult> => {
    const startTime = Date.now();
    const TIMEOUT_MS = 15000; // 15 seconds safety timeout (Aggressive & Tuned)

    // 0. Wait if Scheduler is Resetting (Shock Absorber)
    if (isResetting) {
        console.log('[Tesseract] Scheduler is resetting. Waiting for lock release...');
        await new Promise<void>(resolve => {
            const check = setInterval(() => {
                if (!isResetting) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
            // Safety break after 5s
            setTimeout(() => { clearInterval(check); resolve(); }, 5000);
        });
        console.log('[Tesseract] Lock released. Proceeding.');
    }

    // Helper for timeout
    const withTimeout = <T>(promise: Promise<T>, ms: number, msg: string): Promise<T> => {
        return Promise.race([
            promise,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error(msg)), ms))
        ]);
    };

    try {
        // Initialize Scheduler (Idempotent)
        if (onProgress) onProgress(5);
        const scheduler = await withTimeout(
            initializeTesseract(lang),
            30000,
            'Scheduler initialization timed out'
        );
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

        const result1 = await withTimeout(
            scheduler.addJob('recognize', processedImage, {
                rotateAuto: true
            }),
            TIMEOUT_MS,
            'OCR job (Attempt 1) timed out'
        );

        console.log('[Tesseract] OCR job completed (Attempt 1)');

        const text1 = result1.data.text.trim();
        const conf1 = result1.data.confidence;

        // Variables for Attempt 2
        let result2: Tesseract.RecognizeResult | undefined;
        let text2: string | undefined;
        let conf2: number | undefined;

        const isPoorResult = text1.length < 15 || conf1 < 40;

        // --- ATTEMPT 2: If Attempt 1 was poor and preprocessing was enabled, retry with original image ---
        if (enablePreprocessing && isPoorResult) {
            console.warn(`[Tesseract] Attempt 1 poor (Len: ${text1.length}, Conf: ${conf1}). Retrying raw...`);
            if (onProgress) onProgress(50);

            result2 = await withTimeout(
                scheduler.addJob('recognize', originalImage, { rotateAuto: true }),
                TIMEOUT_MS,
                'OCR job (Attempt 2) timed out'
            );

            text2 = result2.data.text.trim();
            conf2 = result2.data.confidence;
        }

        // Check quality of best result so far
        let bestResult = {
            text: text1,
            confidence: conf1,
            data: result1.data
        };

        // If attempt 2 happened, compare
        if (text2 && conf2 && result2) {
            // Logic to pick best of 1 vs 2 (already implemented essentially, but refining)
            // simplified:
            if (text2.length > text1.length * 1.5 || (text2.length > 5 && conf2 > conf1)) {
                bestResult = { text: text2, confidence: conf2, data: result2.data };
            }
        }

        // --- SMART ROTATION (Optimization) ---
        // If result is still poor (garbage/kauderwelsch), try rotating
        const isStillPoor = bestResult.text.length < 15 || bestResult.confidence < 60;

        if (isStillPoor) {
            console.log(`[Tesseract] Result still poor (Conf: ${bestResult.confidence.toFixed(1)}%). Initiating Smart Rotation (90/180/270)...`);
            if (onProgress) onProgress(60);

            // Generate rotated variants
            const angles = [90, 180, 270];
            const rotationPromises = angles.map(async (angle) => {
                try {
                    const rotatedImg = await rotateImage(originalImage, angle); // We use original image for rotation
                    const result = await withTimeout(
                        scheduler.addJob('recognize', rotatedImg, { rotateAuto: true }),
                        TIMEOUT_MS,
                        `OCR Rotation ${angle} timed out`
                    );
                    return { angle, result, text: result.data.text.trim(), confidence: result.data.confidence };
                } catch (e) {
                    console.warn(`[Tesseract] Rotation ${angle} failed:`, e);
                    return null;
                }
            });

            // Run parallel
            const rotationResults = await Promise.all(rotationPromises);
            if (onProgress) onProgress(90);

            // Find winner among rotations
            let bestRotation = null;
            for (const res of rotationResults) {
                if (!res) continue;
                // Heuristic: Must be better than current best
                // Bonus for significant text length
                if (res.text.length > 10 && res.confidence > bestResult.confidence) {
                    if (!bestRotation || res.confidence > bestRotation.confidence) {
                        bestRotation = res;
                    }
                }
            }

            if (bestRotation) {
                console.log(`[Tesseract] Smart Rotation succesful! Found better result at ${bestRotation.angle}° (Conf: ${bestRotation.confidence.toFixed(1)}%)`);
                bestResult = {
                    text: bestRotation.text,
                    confidence: bestRotation.confidence,
                    data: bestRotation.result.data
                };
            } else {
                console.log('[Tesseract] Smart Rotation yielded no improvements.');
            }
        }

        if (onProgress) onProgress(100);
        const processingTime = Date.now() - startTime;
        const finalConf = bestResult.confidence;

        console.log(`[Tesseract] Completed in ${processingTime}ms. Final Conf: ${finalConf.toFixed(2)}%`);

        const lines: OCRLine[] = ((bestResult.data as any).lines || []).map((line: any) => ({
            text: line.text.trim(),
            confidence: line.confidence,
            bbox: line.bbox
        })).filter((l: OCRLine) => l.text.length > 0);

        return {
            text: bestResult.text,
            lines,
            confidence: bestResult.confidence,
            processingTime,
        };
    } catch (error) {
        console.error('[Tesseract] Scheduler Error:', error);

        let errorMessage = 'Unknown error';
        if (error instanceof Error) errorMessage = error.message;
        else if (error) errorMessage = String(error);

        // FATAL ERROR RECOVERY:
        // If we hit a timeout, it implies a Worker is likely stuck/dead.
        // We MUST terminate the scheduler to free the stuck worker and force a fresh restart.
        if (errorMessage.includes('timed out')) {
            console.error('[Tesseract] Timeout detected! Determining stuck worker state. Terminating Scheduler to force reset...');
            // We don't await this here to avoid blocking checking logic, 
            // but we ensure the global reference is cleared immediately.
            const brokenScheduler = tesseractScheduler;
            tesseractScheduler = null;
            currentLanguage = null;
            initializationPromise = null;

            if (brokenScheduler) {
                brokenScheduler.terminate().catch(e => console.error('[Tesseract] Failed to terminate broken scheduler:', e));
            }
        }

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
