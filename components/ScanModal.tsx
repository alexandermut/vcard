import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, Image as ImageIcon, Loader2, CheckCircle2, Sparkles, Layers, ArrowRight, Clipboard, FileText } from 'lucide-react';
import { convertPdfToImages } from '../utils/pdfUtils';
import { scanBusinessCard, ImageInput } from '../services/aiService';
import { resizeImage } from '../utils/imageUtils';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (vcard: string) => void;
  onAddToQueue?: (front: string | File, back?: string | File | null, mode?: 'vision' | 'hybrid') => void;
  apiKey: string;
  initialFile?: File | null;
  lang: Language;
}

export const ScanModal: React.FC<ScanModalProps> = ({
  isOpen, onClose, onScanComplete, onAddToQueue, apiKey, initialFile, lang
}) => {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = translations[lang];

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const [scanMode, setScanMode] = useState<'vision' | 'hybrid'>('vision');

  const processFile = async (file: File, setImg: (s: string) => void) => {
    try {
      setIsProcessingImage(true);
      const resizedBase64 = await resizeImage(file, 1024, 0.8);
      setImg(resizedBase64);
    } catch (e) {
      console.error("Image processing failed", e);
      setError("Fehler beim Verarbeiten des Bildes.");
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setImg: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        try {
          setIsProcessingImage(true);
          const images = await convertPdfToImages(file);
          if (images.length > 0) {
            // Use the first page for single scan
            const resizedBase64 = await resizeImage(images[0], 1024, 0.8);
            setImg(resizedBase64);
          }
        } catch (err) {
          console.error("PDF processing failed", err);
          setError("Fehler beim Verarbeiten der PDF-Datei.");
        } finally {
          setIsProcessingImage(false);
        }
      } else {
        processFile(file, setImg);
      }
    }
  };

  useEffect(() => {
    if (isOpen && initialFile) {
      processFile(initialFile, setFrontImage);
    } else if (!isOpen) {
      // Reset on close
      setFrontImage(null);
      setBackImage(null);
      setError(null);
      setScanMode('vision');
    }
  }, [isOpen, initialFile]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            // Smart assignment: Front first, then Back
            if (!frontImage) {
              processFile(file, setFrontImage);
            } else if (!backImage) {
              processFile(file, setBackImage);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, frontImage, backImage]);

  if (!isOpen) return null;

  const processScan = async () => {
    if (!frontImage) return;

    if (onAddToQueue) {
      // Pass the selected mode to the queue handler (which calls scanBusinessCard)
      // Note: We need to update the onAddToQueue signature or handle it here.
      // Actually, ScanModal usually calls onScanComplete or onAddToQueue.
      // Let's assume onAddToQueue takes the images, but we need to pass the mode too.
      // Since we can't easily change the prop signature without breaking other things,
      // let's check how onAddToQueue is used.
      // It seems onAddToQueue is just for the queue UI. The actual scanning happens in App.tsx's queue processor.
      // We might need to pass the mode as metadata.

      // For now, let's just pass it. If onAddToQueue doesn't support it, we might need to refactor.
      // Wait, onAddToQueue signature is (front, back) -> void.
      // We should probably update the App.tsx to accept mode.

      // Let's modify the onAddToQueue prop to accept mode.
      onAddToQueue(frontImage, backImage, scanMode);

      // Instant Reset for next card
      setFrontImage(null);
      setBackImage(null);
      setError(null);
      return;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 transition-colors">

        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Camera size={20} className="text-blue-600 dark:text-blue-400" />
            {t.scanTitle}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-900">

          {/* Mode Selector */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setScanMode('vision')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${scanMode === 'vision'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              {t.modeStandard}
            </button>
            <button
              onClick={() => setScanMode('hybrid')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${scanMode === 'hybrid'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              {t.modeHybrid}
            </button>
          </div>

          {scanMode === 'hybrid' && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg flex gap-2 items-start">
              <Sparkles size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">{t.hybridHint}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Front Image */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.frontSide}</span>
              <div
                onClick={() => !isProcessingImage && frontInputRef.current?.click()}
                className={`aspect-[3/2] rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden relative transition-all ${frontImage ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                {isProcessingImage ? (
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                ) : frontImage ? (
                  <img src={frontImage} alt="Front" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
                    <Camera size={24} className="mb-1" />
                    <span className="text-[10px]">{t.photoUpload}</span>
                    <span className="text-[9px] opacity-70 mt-0.5">{t.pasteHint}</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={frontInputRef}
                  accept="image/*,.pdf"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, setFrontImage)}
                />
              </div>
            </div>

            {/* Back Image */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.backSide}</span>
              <div
                onClick={() => !isProcessingImage && backInputRef.current?.click()}
                className={`aspect-[3/2] rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden relative transition-all ${backImage ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                {isProcessingImage ? (
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                ) : backImage ? (
                  <img src={backImage} alt="Back" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
                    <Camera size={24} className="mb-1" />
                    <span className="text-[10px]">{t.photoUpload}</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={backInputRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, setBackImage)}
                />
              </div>
            </div>
          </div>

          <button
            onClick={async () => {
              try {
                const items = await navigator.clipboard.read();
                for (const item of items) {
                  const imageType = item.types.find(type => type.startsWith('image/'));
                  if (imageType) {
                    const blob = await item.getType(imageType);
                    const file = new File([blob], "pasted-image.png", { type: imageType });
                    if (!frontImage) {
                      processFile(file, setFrontImage);
                    } else if (!backImage) {
                      processFile(file, setBackImage);
                    }
                    return; // Only paste one image at a time
                  }
                }
              } catch (err) {
                console.error('Failed to read clipboard', err);
                setError('Clipboard access denied or empty');
              }
            }}
            className="w-full mb-4 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <Clipboard size={16} />
            {t.paste}
          </button>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
              <X size={16} /> {error}
            </div>
          )}

          <button
            onClick={processScan}
            disabled={!frontImage || isProcessingImage}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm ${!frontImage || isProcessingImage
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
              }`}
          >
            <Layers size={20} />
            {t.addToQueue}
          </button>

          <p className="text-xs text-center text-indigo-500 mt-3">
            {t.batchHint}
          </p>
        </div>
      </div>
    </div>
  );
};