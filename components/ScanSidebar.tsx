import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, Image as ImageIcon, Loader2, CheckCircle2, Sparkles, Layers, ArrowRight, Clipboard, FileText, RotateCcw, Video } from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';
import { convertPdfToImages } from '../utils/pdfUtils';
import { scanBusinessCard, ImageInput } from '../services/aiService';
import { resizeImage, base64ToBlob } from '../utils/imageUtils';
import { autoCropImage } from '../utils/cropUtils';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface ScanSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (vcard: string) => void;
  onAddToQueue?: (front: string | File, back?: string | File | null, mode?: 'vision' | 'hybrid') => void;
  apiKey: string;
  initialFile?: File | null;
  lang: Language;
}

import { useEscapeKey } from '../hooks/useEscapeKey';

export const ScanSidebar: React.FC<ScanSidebarProps> = ({
  isOpen, onClose, onScanComplete, onAddToQueue, apiKey, initialFile, lang
}) => {
  useEscapeKey(onClose, isOpen);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [originalFrontImage, setOriginalFrontImage] = useState<string | null>(null);
  const [originalBackImage, setOriginalBackImage] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = translations[lang];

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const [scanMode, setScanMode] = useState<'vision' | 'hybrid'>('vision');

  // Camera Modal State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [targetSide, setTargetSide] = useState<'front' | 'back'>('front');

  const handleCameraCapture = async (base64: string) => {
    try {
      setIsProcessingImage(true);
      // Convert base64 to File for processing (resize/crop)
      // Use utility instead of fetch to avoid browser limits/errors
      const blob = base64ToBlob(base64);
      const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });

      if (targetSide === 'front') {
        await processFile(file, setFrontImage);
      } else {
        await processFile(file, setBackImage);
      }
    } catch (e) {
      console.error("Camera capture processing failed", e);
      setError("Fehler bei der Verarbeitung der Aufnahme.");
    } finally {
      setIsProcessingImage(false);
    }
  };

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
          const blobs = await convertPdfToImages(file);
          if (blobs.length > 0) {
            // Use the first page for single scan
            const imageFile = new File([blobs[0]], "page1.jpg", { type: 'image/jpeg' });
            const resizedBase64 = await resizeImage(imageFile, 1024, 0.8);
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
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (initialFile) {
        processFile(initialFile, setFrontImage);
      }
    } else {
      document.body.style.overflow = '';
      // Reset on close
      setFrontImage(null);
      setBackImage(null);
      setError(null);
      setScanMode('vision');
    }
    return () => {
      document.body.style.overflow = '';
    };
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

  const processScan = async () => {
    if (!frontImage) return;

    if (onAddToQueue) {
      onAddToQueue(frontImage, backImage, scanMode);

      // Instant Reset for next card
      setFrontImage(null);
      setBackImage(null);
      setError(null);
      return;
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        onQrFound={(data) => {
          onScanComplete(data);
          setIsCameraOpen(false);
          onClose();
        }}
        lang={lang}
      />

      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Camera size={20} className="text-blue-600 dark:text-blue-400" />
            {t.scanTitle}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-900 custom-scrollbar">

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
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.frontSide}</span>
                {frontImage && (
                  <div className="flex gap-2">
                    {originalFrontImage ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFrontImage(originalFrontImage);
                          setOriginalFrontImage(null);
                        }}
                        className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:underline"
                        title="Rückgängig"
                      >
                        <RotateCcw size={12} />
                        Undo
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              setIsProcessingImage(true);
                              const cropped = await autoCropImage(frontImage);
                              setOriginalFrontImage(frontImage);
                              setFrontImage(cropped);
                            } catch (err) {
                              console.error("Auto-crop failed", err);
                            } finally {
                              setIsProcessingImage(false);
                            }
                          }}
                          className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                          title="Automatisch zuschneiden"
                        >
                          <Sparkles size={12} />
                          Auto Crop
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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

              {/* Front Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTargetSide('front');
                    setIsCameraOpen(true);
                  }}
                  className="flex-1 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <Video size={14} />
                  Kamera
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Check for API support (Firefox usually doesn't support read() for images)
                      if (!navigator.clipboard || !navigator.clipboard.read) {
                        setError('Dein Browser unterstützt diesen Button nicht. Bitte drücke Strg+V (oder Cmd+V) zum Einfügen.');
                        return;
                      }

                      const items = await navigator.clipboard.read();
                      let foundImage = false;

                      for (const item of items) {
                        // Look for image type
                        const imageType = item.types.find(type => type.startsWith('image/'));
                        if (imageType) {
                          const blob = await item.getType(imageType);
                          // Force filename with correct extension
                          const ext = imageType.split('/')[1] || 'png';
                          const file = new File([blob], `pasted-front.${ext}`, { type: imageType });
                          processFile(file, setFrontImage);
                          foundImage = true;
                          setError(null);
                          return;
                        }
                      }

                      if (!foundImage) {
                        setError('Kein Bild in der Zwischenablage gefunden.');
                      }
                    } catch (err: any) {
                      console.error('Failed to paste', err);
                      // Handle permission denied specifically
                      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                        setError('Zugriff auf Zwischenablage verweigert. Bitte erlauben oder Strg+V nutzen.');
                      } else {
                        setError('Fehler beim Einfügen: ' + (err.message || 'Unbekannt'));
                      }
                    }
                  }}
                  className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Clipboard size={14} />
                  Einfügen
                </button>
              </div>
            </div>

            {/* Back Image */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.backSide}</span>
                {backImage && (
                  <div className="flex gap-2">
                    {originalBackImage ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBackImage(originalBackImage);
                          setOriginalBackImage(null);
                        }}
                        className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:underline"
                        title="Rückgängig"
                      >
                        <RotateCcw size={12} />
                        Undo
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              setIsProcessingImage(true);
                              const cropped = await autoCropImage(backImage);
                              setOriginalBackImage(backImage);
                              setBackImage(cropped);
                            } catch (err) {
                              console.error("Auto-crop failed", err);
                            } finally {
                              setIsProcessingImage(false);
                            }
                          }}
                          className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                          title="Automatisch zuschneiden"
                        >
                          <Sparkles size={12} />
                          Auto Crop
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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

              {/* Back Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTargetSide('back');
                    setIsCameraOpen(true);
                  }}
                  className="flex-1 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <Video size={14} />
                  Kamera
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (!navigator.clipboard || !navigator.clipboard.read) {
                        setError('Dein Browser unterstützt diesen Button nicht. Bitte drücke Strg+V (oder Cmd+V) zum Einfügen.');
                        return;
                      }

                      const items = await navigator.clipboard.read();
                      let foundImage = false;

                      for (const item of items) {
                        const imageType = item.types.find(type => type.startsWith('image/'));
                        if (imageType) {
                          const blob = await item.getType(imageType);
                          const ext = imageType.split('/')[1] || 'png';
                          const file = new File([blob], `pasted-back.${ext}`, { type: imageType });
                          processFile(file, setBackImage);
                          foundImage = true;
                          setError(null);
                          return;
                        }
                      }

                      if (!foundImage) {
                        setError('Kein Bild in der Zwischenablage gefunden.');
                      }
                    } catch (err: any) {
                      console.error('Failed to paste', err);
                      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                        setError('Zugriff auf Zwischenablage verweigert. Bitte erlauben oder Strg+V nutzen.');
                      } else {
                        setError('Fehler beim Einfügen: ' + (err.message || 'Unbekannt'));
                      }
                    }
                  }}
                  className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Clipboard size={14} />
                  Einfügen
                </button>
              </div>
            </div>
          </div>



          {/* Spacer */}
          <div className="h-2"></div>

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
      </div >
    </>
  );
};