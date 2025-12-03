import Tesseract, { createWorker, Worker, LoggerMessage } from 'tesseract.js';
import type { Language } from '../types';
import { preprocessImage } from '../utils/tesseractPreprocessing';


let tesseractWorker: Worker | null = null;
let currentLanguage: Language | null = null;

export interface TesseractResult {
    text: string;
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

    const worker = await createWorker(tesseractLang, 1, {
        logger: (m: LoggerMessage) => {
            if (m.status === 'loading language traineddata') {
                console.log(`[Tesseract] Downloading ${tesseractLang}.traineddata...`);
            }
        }
    });

    // Configure for business card recognition
    await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO, // Automatic page segmentation
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜßabcdefghijklmnopqrstuvwxyzäöüß0123456789@.,:;-+()/ \n',
    });

    tesseractWorker = worker;
    currentLanguage = lang;
    return worker;
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
        if (onProgress) onProgress(5);
        const worker = await initializeTesseract(lang);
        if (onProgress) onProgress(10);

        // Strip data:image/... prefix if present
        let imageData = base64Image;
        if (base64Image.includes(',')) {
            imageData = base64Image.split(',')[1];
        }

        // Preprocess image for better OCR accuracy
        let processedImage = `data:image/png;base64,${imageData}`;

        if (enablePreprocessing) {
            if (onProgress) onProgress(20);
            console.log('[Tesseract] Preprocessing image...');
            processedImage = await preprocessImage(processedImage);
            if (onProgress) onProgress(30);
        }

        // Perform OCR
        console.log('[Tesseract] Starting OCR...');
        const { data } = await worker.recognize(processedImage, {
            rotateAuto: true,
        });

        if (onProgress) onProgress(100);

        const processingTime = Date.now() - startTime;

        console.log(`[Tesseract] OCR completed in ${processingTime}ms`);
        console.log(`[Tesseract] Confidence: ${data.confidence.toFixed(2)}%`);
        console.log(`[Tesseract] Text length: ${data.text.length} chars`);

        return {
            text: data.text,
            confidence: data.confidence,
            processingTime,
        };

    } catch (error) {
        console.error('[Tesseract] OCR Error:', error);
        throw new Error(`Tesseract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
