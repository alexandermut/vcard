import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertTriangle } from 'lucide-react';
import jsQR from 'jsqr';
import { translations } from '../utils/translations';

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (data: string) => void;
    lang: string;
}

import { useEscapeKey } from '../hooks/useEscapeKey';

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScan, lang }) => {
    useEscapeKey(onClose, isOpen);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const requestRef = useRef<number>();
    const t = translations[lang as keyof typeof translations];

    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setError(null); // Reset error when closing
            document.body.style.overflow = '';
            return;
        }

        // Reset error when opening
        setError(null);
        startCamera();
        document.body.style.overflow = 'hidden';

        return () => {
            stopCamera();
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const startCamera = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Wait for video to be ready
                videoRef.current.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
                videoRef.current.play();
                requestRef.current = requestAnimationFrame(tick);
            }
        } catch (err) {
            console.error("Camera Error:", err);
            setError(t.cameraPermissionError || "Camera Error");
        }
    };

    const stopCamera = () => {
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }

        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        try {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (event) => {
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');

                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "attemptBoth",
                        });

                        if (code && code.data) {
                            onScan(code.data);
                            setIsProcessing(false);
                        } else {
                            setError("Kein QR-Code im Foto gefunden.");
                            setIsProcessing(false);
                        }
                    }
                };
                img.src = event.target?.result as string;
            };

            reader.readAsDataURL(file);
        } catch (err) {
            console.error("Photo QR scan error:", err);
            setError("Fehler beim Analysieren des Fotos.");
            setIsProcessing(false);
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const tick = () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            if (canvas) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                const ctx = canvas.getContext('2d');

                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "attemptBoth",
                    });

                    if (code) {
                        // Found a code!
                        // Check if it looks like a vCard
                        if (code.data) {
                            // We accept any string, but ideally it should be a vCard
                            // Let's just pass it back and let the parent decide or validate
                            onScan(code.data);
                            return; // Stop scanning
                        }
                    }
                }
            }
        }
        requestRef.current = requestAnimationFrame(tick);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-50"
                >
                    <X size={24} />
                </button>

                <h2 className="text-white text-xl font-semibold mb-6 flex items-center gap-2">
                    <Camera size={24} />
                    {t.qrScannerTitle || "Scan QR Code"}
                </h2>

                {error ? (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-6 rounded-xl flex flex-col items-center text-center max-w-sm">
                        <AlertTriangle size={48} className="mb-4" />
                        <p>{error}</p>
                        <button
                            onClick={onClose}
                            className="mt-6 bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <div className="relative w-full max-w-md aspect-square bg-black rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl">
                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            muted
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Overlay Frame */}
                        <div className="absolute inset-0 border-[40px] border-black/50 flex items-center justify-center pointer-events-none">
                            <div className="w-full h-full border-2 border-blue-500/50 relative">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>
                            </div>
                        </div>

                        {/* Scan Line Animation */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="w-full h-1 bg-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite] top-1/2"></div>
                        </div>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoCapture}
                />

                {!error && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg"
                    >
                        <Camera size={20} />
                        {isProcessing ? 'Analysiere...' : 'Foto aufnehmen'}
                    </button>
                )}

                <p className="text-white/60 mt-4 text-sm text-center max-w-xs">
                    Point your camera at a vCard QR Code to import it automatically.
                </p>

            </div>
        </div>
    );
};
