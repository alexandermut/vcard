import { useState, useEffect, useCallback } from 'react';
import { ScanJob } from '../types';
import { scanBusinessCard, ImageInput, analyzeRegexPerformance } from '../services/aiService';
import { Language } from '../types';
import type { LLMConfig } from './useLLMConfig';
import { scanWithTesseract } from '../services/tesseractService';
import { parseImpressumToVCard, parseSpatialToVCard } from '../utils/regexParser';
import { resizeImage } from '../utils/imageUtils';
import { addFailedScan } from '../utils/db';
import { wrap } from 'comlink';
import type { ImageWorkerAPI } from '../workers/imageWorker';


// ✅ NEW: Initialize image worker once (reuse across scans)
let imageWorkerInstance: ReturnType<typeof wrap<ImageWorkerAPI>> | null = null;

const getImageWorker = () => {
  if (!imageWorkerInstance) {
    const worker = new Worker(
      new URL('../workers/imageWorker.ts', import.meta.url),
      { type: 'module' }
    );
    imageWorkerInstance = wrap<ImageWorkerAPI>(worker);
  }
  return imageWorkerInstance;
};

export const useScanQueue = (
  apiKey: string,
  lang: Language,
  llmConfig: LLMConfig,
  ocrMethod: 'auto' | 'tesseract' | 'gemini' | 'openai' | 'hybrid' | 'regex-training',
  onJobComplete: (vcard: string, images?: string[], mode?: 'vision' | 'hybrid', debugAnalysis?: string, ocrRawText?: string) => Promise<void> | void,
  onOCRRawText?: (rawText: string) => void, // Callback to pass raw OCR text to parent (for UI preview)
  wasmModule?: any // 🦀 Rust WASM Module
) => {
  const [queue, setQueue] = useState<ScanJob[]>([]);

  // Derived state for WakeLock and UI
  const isProcessing = queue.some(j => j.status === 'processing');

  // ✅ NEW: Create concurrency limiter based on llmConfig
  const concurrency = llmConfig.concurrentScans || 1;

  console.log(`[ScanQueue] Concurrency limit: ${concurrency}`);

  const addJob = useCallback((images: (string | File)[], mode: 'vision' | 'hybrid' = 'vision') => {
    const newJob: ScanJob = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      images,
      status: 'pending',
      mode
    };
    console.log(`[ScanQueue] Adding job to queue`, {
      id: newJob.id,
      imageCount: images.length,
      mode,
      imageTypes: images.map(img => typeof img === 'string' ? 'base64' : img.name)
    });
    setQueue(prev => [...prev, newJob]);
  }, []);

  const processNextJob = useCallback(async () => {
    // ✅ NEW: Allow multiple jobs to process concurrently
    const processingCount = queue.filter(job => job.status === 'processing').length;
    if (processingCount >= concurrency) {
      console.log(`[ScanQueue] Already processing ${processingCount} jobs, waiting...`);
      return;
    }

    const nextJobIndex = queue.findIndex(job => job.status === 'pending');
    if (nextJobIndex === -1) {
      console.log('[ScanQueue] No pending jobs in queue');
      return;
    }

    const job = queue[nextJobIndex];
    console.log(`[ScanQueue] Starting job ${job.id}`, {
      position: nextJobIndex + 1,
      totalInQueue: queue.length,
      mode: job.mode,
      imageCount: job.images.length
    });

    // Update status to processing
    setQueue(prev => prev.map((j, i) => i === nextJobIndex ? { ...j, status: 'processing' } : j));

    // Process the job
    (async () => {
      let rawImages: string[] = [];

      try {
        // ✅ NEW: Use worker for compression (runs off main thread!)
        const imageWorker = getImageWorker();

        // Helper to convert File/String to Base64 via Worker (Standard Color Compression)
        const getBase64 = async (input: string | File): Promise<string> => {
          if (typeof input === 'string') return input;

          console.time(`worker-compress-${input.name}`);
          try {
            // Always use standard compression for storage/display (Color)
            const res = await imageWorker.compressImage(input, 0.3, 800);
            console.timeEnd(`worker-compress-${input.name}`);
            return res;
          } catch (error) {
            console.warn('Worker compression failed, falling back to main thread:', error);
            const res = await resizeImage(input, 800, 0.7);
            return res;
          }
        };

        // Helper to get Optimized OCR Image (B&W / Rust)
        const getOcrImage = async (input: string | File): Promise<string> => {
          console.time(`worker-preprocess-${typeof input === 'string' ? 'base64' : input.name}`);
          try {
            if (typeof input === 'string') {
              // For now, if string, just return it (or we could convert to Blob and preprocess)
              // TODO: Implement string->blob->preprocess
              return input;
            }
            const res = await imageWorker.preprocessImage(input);
            console.timeEnd(`worker-preprocess-${input.name}`);
            return res;
          } catch (e) {
            console.warn("Preprocessing failed", e);
            return await getBase64(input); // Fallback to color
          }
        };

        // Load images into memory ONLY NOW
        const images: ImageInput[] = [];
        // rawImages lifted to outer scope for error handling


        // Helper to strip data url prefix
        const toInput = (dataUrl: string): ImageInput => {
          const parts = dataUrl.split(',');
          const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
          return {
            mimeType: mime,
            base64: parts[1]
          };
        };

        for (const img of job.images) {
          const base64 = await getBase64(img);
          images.push(toInput(base64));
          rawImages.push(base64);
        }

        console.log("Images prepared, starting OCR...", { count: images.length, mode: job.mode, ocrMethod });
        console.time(`ocr-scan-${job.id}`);

        // 180s Timeout for OCR processing (allows for retries)
        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout: OCR processing took too long")), 180000)
        );

        let vcard: string;
        let analysisResult: string | undefined = undefined;
        let jobOcrText: string | undefined = undefined;  // ✅ NEW: Track OCR text for this specific job

        // OCR Method Selection Logic
        if (ocrMethod === 'regex-training') {
          console.log('[OCR] Mode: Regex Training (Dual Scan & Analysis)');

          // 1. Run Tesseract (Offline) for Baseline
          // Use Rust-optimized B&W image for Tesseract
          const tesseractInput = await getOcrImage(job.images[0]);
          const tesseractResult = await scanWithTesseract(tesseractInput, lang, true);
          jobOcrText = tesseractResult.text;  // ✅ Store OCR text
          const tesseractVCard = (tesseractResult.lines && tesseractResult.lines.length > 0)
            ? (wasmModule && wasmModule.rust_parse_vcard
              ? wasmModule.rust_parse_vcard(JSON.stringify(tesseractResult.lines))
              : parseSpatialToVCard(tesseractResult.lines))
            : parseImpressumToVCard(tesseractResult.text);

          // 2. Run Gemini (Online) for Ground Truth
          if (!apiKey) throw new Error('API Key required for Regex Training Mode');
          const geminiVCard = await scanBusinessCard(images, llmConfig.provider, apiKey, lang, llmConfig, job.mode || 'vision');

          // 3. Analyze Differences
          console.log('[OCR] Analyzing Regex Performance...');
          analysisResult = await analyzeRegexPerformance(
            tesseractResult.text,
            tesseractVCard,
            geminiVCard,
            apiKey
          );

          // 4. Pass raw OCR text to parent for debug/display
          if (onOCRRawText) onOCRRawText(tesseractResult.text);

          // 5. Use Gemini Result for User (Best Quality)
          vcard = geminiVCard;

        } else if (ocrMethod === 'tesseract') {
          // Tesseract Only (Offline)
          console.log('[OCR] Mode: Tesseract Only');
          const tesseractInput = await getOcrImage(job.images[0]);
          const tesseractResult = await scanWithTesseract(tesseractInput, lang, true);
          jobOcrText = tesseractResult.text;  // ✅ Store OCR text

          // Use Spatial Parser if lines are available, otherwise fallback
          if (tesseractResult.lines && tesseractResult.lines.length > 0) {
            vcard = (wasmModule && wasmModule.rust_parse_vcard)
              ? wasmModule.rust_parse_vcard(JSON.stringify(tesseractResult.lines))
              : parseSpatialToVCard(tesseractResult.lines);
          } else {
            vcard = parseImpressumToVCard(tesseractResult.text);
          }

          // Pass raw OCR text to parent for parser field
          if (onOCRRawText) onOCRRawText(tesseractResult.text);

        } else if (ocrMethod === 'gemini') {
          // Gemini Only (Online - requires API key)
          console.log('[OCR] Mode: Gemini Only');
          if (!apiKey && llmConfig.provider !== 'custom') {
            throw new Error('API Key required for Gemini mode');
          }
          vcard = await scanBusinessCard(images, llmConfig.provider, apiKey, lang, llmConfig, job.mode || 'vision');

        } else if (ocrMethod === 'openai') {
          // OpenAI Only (Online - requires API key)
          console.log('[OCR] Mode: OpenAI Only');
          if (!apiKey && llmConfig.provider !== 'openai') {
            throw new Error('API Key required for OpenAI mode');
          }
          vcard = await scanBusinessCard(images, llmConfig.provider, apiKey, lang, llmConfig, job.mode || 'vision');

        } else if (ocrMethod === 'hybrid') {
          // Hybrid: Run both, auto-select based on confidence
          console.log('[OCR] Mode: Hybrid (both parallel)');
          const [tesseractRes, geminiRes] = await Promise.allSettled([
            (async () => {
              const tesseractInput = await getOcrImage(job.images[0]);
              const result = await scanWithTesseract(tesseractInput, lang, true);
              jobOcrText = result.text; // Set jobOcrText here for hybrid mode
              // Use Spatial Parser
              const vcard = (result.lines && result.lines.length > 0)
                ? (wasmModule && wasmModule.rust_parse_vcard
                  ? wasmModule.rust_parse_vcard(JSON.stringify(result.lines))
                  : parseSpatialToVCard(result.lines))
                : parseImpressumToVCard(result.text);
              return { vcard, confidence: result.confidence, method: 'tesseract' as const, rawText: result.text };
            })(),
            (async () => {
              if (!apiKey && llmConfig.provider !== 'custom') {
                throw new Error('No API key for Gemini');
              }
              const vcard = await scanBusinessCard(images, llmConfig.provider, apiKey, lang, llmConfig, job.mode || 'vision');
              return { vcard, confidence: 100, method: 'gemini' as const }; // Gemini = 100% confidence assumed
            })()
          ]);

          // Select winner based on confidence
          const tesseractVCard = tesseractRes.status === 'fulfilled' ? tesseractRes.value : null;
          const geminiVCard = geminiRes.status === 'fulfilled' ? geminiRes.value : null;

          if (geminiVCard && tesseractVCard) {
            // Both succeeded - choose better confidence
            vcard = geminiVCard.confidence >= tesseractVCard.confidence ? geminiVCard.vcard : tesseractVCard.vcard;
            // Always expose raw Tesseract text for debugging/tab
            if (onOCRRawText && tesseractVCard.rawText) onOCRRawText(tesseractVCard.rawText);

            console.log(`[OCR] Hybrid: Selected ${geminiVCard.confidence >= tesseractVCard.confidence ? 'Gemini' : 'Tesseract'} (Gemini: ${geminiVCard.confidence}%, Tesseract: ${tesseractVCard.confidence}%)`);
          } else if (geminiVCard) {
            vcard = geminiVCard.vcard;
            console.log('[OCR] Hybrid: Only Gemini succeeded');
          } else if (tesseractVCard) {
            vcard = tesseractVCard.vcard;
            // Pass raw OCR text to parent
            if (onOCRRawText && tesseractVCard.rawText) onOCRRawText(tesseractVCard.rawText);
            console.log('[OCR] Hybrid: Only Tesseract succeeded');
          } else {
            throw new Error('Both OCR methods failed');
          }

        } else {
          // Auto Mode (Default): Offline-first with optional Gemini enhancement
          console.log('[OCR] Mode: Auto (Offline-First)');

          // 1. Always run Tesseract first (offline)
          const tesseractInput = await getOcrImage(job.images[0]);
          const tesseractResult = await scanWithTesseract(tesseractInput, lang, true);
          jobOcrText = tesseractResult.text;  // ✅ Store OCR text

          // Use Spatial Parser
          const tesseractVCard = (tesseractResult.lines && tesseractResult.lines.length > 0)
            ? (wasmModule && wasmModule.rust_parse_vcard
              ? wasmModule.rust_parse_vcard(JSON.stringify(tesseractResult.lines))
              : parseSpatialToVCard(tesseractResult.lines))
            : parseImpressumToVCard(tesseractResult.text);

          console.log(`[OCR] Auto: Tesseract completed (${tesseractResult.confidence}%)`);

          // 2. If API key available, also run Gemini and compare
          if (apiKey || llmConfig.provider === 'custom') {
            try {
              console.log('[OCR] Auto: Running Gemini as enhancement...');
              const geminiVCard = await scanBusinessCard(images, llmConfig.provider, apiKey, lang, llmConfig, job.mode || 'vision');

              // Gemini wins (100% confidence assumed)
              vcard = geminiVCard;
              console.log('[OCR] Auto: Using Gemini result (higher confidence)');
            } catch (geminiError) {
              console.warn('[OCR] Auto: Gemini failed, using Tesseract result', geminiError);
              vcard = tesseractVCard;
              // Pass raw OCR text to parent since we're using Tesseract
              if (onOCRRawText) onOCRRawText(tesseractResult.text);
            }
          } else {
            // No API key - use Tesseract result
            vcard = tesseractVCard;
            // Pass raw OCR text to parent
            if (onOCRRawText) onOCRRawText(tesseractResult.text);
            console.log('[OCR] Auto: No API key, using Tesseract result');
          }
        }

        vcard = await Promise.race([
          Promise.resolve(vcard),
          timeoutPromise
        ]);
        console.timeEnd(`ocr-scan-${job.id}`);
        console.log(`[ScanQueue] OCR completed for job ${job.id}, calling onJobComplete...`);

        // Safety timeout for onJobComplete (saving)
        const saveTimeout = new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Save operation timed out")), 10000));
        await Promise.race([
          onJobComplete(vcard, rawImages, job.mode, analysisResult, jobOcrText),  // ✅ Pass OCR text
          saveTimeout
        ]);

        console.log(`[ScanQueue] ✅ Job ${job.id} completed successfully and removed from queue`);
        setQueue(prev => prev.filter(j => j.id !== job.id));

      } catch (error: any) {
        console.error(`[ScanQueue] ❌ Job ${job.id} failed:`, error);
        if (error.message && error.message.includes("Timeout")) {
          const currentRetries = job.retryCount || 0;
          if (currentRetries < 2) {
            console.warn(`Job timed out, retrying (${currentRetries + 1}/2)...`, job.id);
            setQueue(prev => {
              const filtered = prev.filter(j => j.id !== job.id);
              return [...filtered, { ...job, status: 'pending', error: undefined, retryCount: currentRetries + 1 }];
            });
          } else {
            console.error("Job timed out too many times, marking as error", job.id);
            setQueue(prev => prev.map((j, i) => i === nextJobIndex ? { ...j, status: 'error', error: "Timeout: Processing took too long after multiple retries." } : j));

            // Save to Failed Scans DB
            if (rawImages.length > 0) {
              addFailedScan({
                id: job.id,
                timestamp: Date.now(),
                images: rawImages,
                error: "Timeout after retries",
                mode: job.mode || 'vision'
              }).catch(e => console.error("Failed to save failed scan", e));
            }
          }
        } else {
          // Mark as error, keep in queue so user sees it failed
          setQueue(prev => prev.map((j, i) => i === nextJobIndex ? { ...j, status: 'error', error: error.message } : j));

          // Save to Failed Scans DB
          if (rawImages.length > 0) {
            addFailedScan({
              id: job.id,
              timestamp: Date.now(),
              images: rawImages,
              error: error.message || "Unknown Error",
              mode: job.mode || 'vision'
            }).catch(e => console.error("Failed to save failed scan", e));
          }
        }
      }
    })();
  }, [queue, apiKey, lang, llmConfig, ocrMethod, onJobComplete, onOCRRawText, concurrency, wasmModule]);

  // Watch queue and trigger processing
  useEffect(() => {
    const processingCount = queue.filter(j => j.status === 'processing').length;
    const hasPending = queue.some(j => j.status === 'pending');

    if (hasPending && processingCount < concurrency) {
      processNextJob();
    }
  }, [queue, concurrency, processNextJob]);

  // Screen Wake Lock
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isProcessing) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Wake Lock active');
        }
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLock) {
        try {
          await wakeLock.release();
          wakeLock = null;
          console.log('Wake Lock released');
        } catch (err) {
          console.error('Wake Lock release error:', err);
        }
      }
    };

    if (isProcessing) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Re-acquire lock if visibility changes (e.g. user switches tabs and comes back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isProcessing) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isProcessing]);

  const removeJob = (id: string) => {
    setQueue(prev => prev.filter(j => j.id !== id));
  };

  const clearCompleted = () => {
    setQueue(prev => prev.filter(j => j.status !== 'completed'));
  };

  const clearErrors = () => {
    setQueue(prev => prev.filter(j => j.status !== 'error'));
  };

  return {
    queue,
    addJob,
    removeJob,
    clearCompleted,
    clearErrors
  };
};