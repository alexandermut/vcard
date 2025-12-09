/**
 * Image Worker - Offloads image compression to background thread
 * Uses Comlink for clean async API and browser-image-compression for quality
 */
import { expose } from 'comlink';
import imageCompression from 'browser-image-compression';
import init, { preprocess_scan } from '../src/wasm/core.js';

let isWasmInitialized = false;

const api = {
    /**
     * Preprocess image using Rust (Resize + Grayscale + Adaptive Threshold)
     * Optimized for Tesseract OCR.
     */
    async preprocessImage(file: File): Promise<string> {
        try {
            if (!isWasmInitialized) {
                await init();
                isWasmInitialized = true;
            }

            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);

            // Rust Magic 🦀
            // Returns PNG bytes
            const processedBytes = preprocess_scan(bytes);

            // Convert to Base64
            const blob = new Blob([processedBytes as unknown as BlobPart], { type: 'image/png' });
            return await imageCompression.getDataUrlFromFile(blob as File);

        } catch (e) {
            console.error("Rust Preprocessing Failed, falling back to original:", e);
            // Fallback: just return original as base64
            return await imageCompression.getDataUrlFromFile(file);
        }
    },

    /**
     * Compress an image file with professional quality
     * @param file - Image file to compress
     * @param maxSizeMB - Maximum size in MB (default: 0.3)
     * @param maxDimension - Maximum width/height (default: 800)
     * @returns Base64 data URL
     */
    async compressImage(
        file: File,
        maxSizeMB: number = 0.3,
        maxDimension: number = 800
    ): Promise<string> {
        const options = {
            maxSizeMB,
            maxWidthOrHeight: maxDimension,
            useWebWorker: false, // We ARE the worker, no need for nested workers
            fileType: 'image/jpeg' as const,
            initialQuality: 0.7
        };

        try {
            const compressed = await imageCompression(file, options);
            const dataUrl = await imageCompression.getDataUrlFromFile(compressed);
            return dataUrl;
        } catch (error) {
            console.error('Worker compression failed:', error);
            throw error;
        }
    },

    /**
     * Batch compress multiple images
     * @param files - Array of image files
     * @param maxSizeMB - Maximum size per image
     * @param maxDimension - Maximum dimension
     * @returns Array of Base64 data URLs
     */
    async compressImages(
        files: File[],
        maxSizeMB: number = 0.3,
        maxDimension: number = 800
    ): Promise<string[]> {
        const results: string[] = [];

        for (const file of files) {
            try {
                const compressed = await api.compressImage(file, maxSizeMB, maxDimension);
                results.push(compressed);
            } catch (error) {
                console.error('Failed to compress file:', file.name, error);
                throw error;
            }
        }

        return results;
    }
};

// Expose API to main thread via Comlink
expose(api);

export type ImageWorkerAPI = typeof api;
