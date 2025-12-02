import { useState, useEffect, useCallback } from 'react';
import { ScanJob } from '../types';
import { scanBusinessCard, ImageInput } from '../services/aiService';
import { Language } from '../types';
import type { LLMConfig } from './useLLMConfig';

import { resizeImage } from '../utils/imageUtils';
import { addFailedScan } from '../utils/db';

export const useScanQueue = (
  apiKey: string,
  lang: Language,
  llmConfig: LLMConfig,
  onJobComplete: (vcard: string, images?: string[], mode?: 'vision' | 'hybrid') => Promise<void> | void
) => {
  const [queue, setQueue] = useState<ScanJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addJob = useCallback((images: (string | File)[], mode: 'vision' | 'hybrid' = 'vision') => {
    const newJob: ScanJob = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      images,
      status: 'pending',
      mode
    };
    setQueue(prev => [...prev, newJob]);
  }, []);

  const processNextJob = useCallback(async () => {
    if (isProcessing) return;

    const nextJobIndex = queue.findIndex(job => job.status === 'pending');
    if (nextJobIndex === -1) return;

    setIsProcessing(true);
    const job = queue[nextJobIndex];

    // Update status to processing
    setQueue(prev => prev.map((j, i) => i === nextJobIndex ? { ...j, status: 'processing' } : j));

    let rawImages: string[] = [];

    try {
      // Helper to convert File/String to Base64 (Resized)
      const getBase64 = async (input: string | File): Promise<string> => {
        if (typeof input === 'string') return input;
        // Resize to max 1024px, 0.8 quality (JPEG)
        return await resizeImage(input, 1024, 0.8);
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

      // 60s Timeout for AI processing
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout: AI processing took too long")), 60000)
      );

      const vcard = await Promise.race([
        scanBusinessCard(images, llmConfig.provider, apiKey, lang, llmConfig, job.mode || 'vision'),
        timeoutPromise
      ]);

      // Safety timeout for onJobComplete (saving)
      const saveTimeout = new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Save operation timed out")), 10000));
      await Promise.race([
        onJobComplete(vcard, rawImages, job.mode),
        saveTimeout
      ]);

      setQueue(prev => prev.filter(j => j.id !== job.id));

    } catch (error: any) {
      console.error("Job failed", error);
      if (error.message && error.message.includes("Timeout")) {
        console.warn("Job timed out, moving to back of queue", job.id);
        setQueue(prev => {
          // Remove current job and add to end with pending status
          const filtered = prev.filter(j => j.id !== job.id);
          return [...filtered, { ...job, status: 'pending', error: undefined }];
        });
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
    } finally {
      setIsProcessing(false);
    }
  }, [queue, isProcessing, apiKey, lang, llmConfig, onJobComplete]);

  // Watch queue and trigger processing
  useEffect(() => {
    if (!isProcessing && queue.some(j => j.status === 'pending')) {
      processNextJob();
    }
  }, [queue, isProcessing, processNextJob]);

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