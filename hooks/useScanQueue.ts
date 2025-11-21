import { useState, useEffect, useCallback } from 'react';
import { ScanJob } from '../types';
import { scanBusinessCard, ImageInput } from '../services/aiService';
import { Language } from '../types';
import type { LLMConfig } from './useLLMConfig';

export const useScanQueue = (
  apiKey: string,
  lang: Language,
  llmConfig: LLMConfig,
  onJobComplete: (vcard: string, images?: string[]) => void
) => {
  const [queue, setQueue] = useState<ScanJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addJob = useCallback((frontImage: string, backImage?: string | null) => {
    const newJob: ScanJob = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      frontImage,
      backImage,
      status: 'pending'
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

    try {
      const images: ImageInput[] = [];
      const rawImages: string[] = [job.frontImage];

      // Helper to strip data url prefix
      const toInput = (dataUrl: string): ImageInput => {
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        return {
          mimeType: mime,
          base64: parts[1]
        };
      };

      images.push(toInput(job.frontImage));
      if (job.backImage) {
        images.push(toInput(job.backImage));
        rawImages.push(job.backImage);
      }

      const vcard = await scanBusinessCard(images, 'gemini', apiKey, lang, llmConfig);

      onJobComplete(vcard, rawImages);

      setQueue(prev => prev.filter(j => j.id !== job.id));

    } catch (error: any) {
      console.error("Job failed", error);
      // Mark as error, keep in queue so user sees it failed
      setQueue(prev => prev.map((j, i) => i === nextJobIndex ? { ...j, status: 'error', error: error.message } : j));
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

  const removeJob = (id: string) => {
    setQueue(prev => prev.filter(j => j.id !== id));
  };

  const clearCompleted = () => {
    setQueue(prev => prev.filter(j => j.status !== 'completed'));
  };

  return {
    queue,
    addJob,
    removeJob,
    clearCompleted
  };
};