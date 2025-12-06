import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, Loader2, Sparkles, Scan } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { translations } from '../utils/translations';
import { Language } from '../types';
import jsQR from 'jsqr';

declare global {
    interface Window {
        cv: any;
        jscanify: any;
    }
}

interface CameraCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (base64: string) => void;
    onQrFound?: (data: string) => void;
    lang: Language;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ isOpen, onClose, onCapture, onQrFound, lang }) => {
    useEscapeKey(onClose, isOpen);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const t = translations[lang];

    // Scanner Review State
    const [capturedImage, setCapturedImage] = useState<string | null>(null); // The original captured image
    const [isFilterActive, setIsFilterActive] = useState(false);
    const [displayedImage, setDisplayedImage] = useState<string | null>(null); // What the user sees (filtered or original)

    // Scanner functionality - Smart Scan
    const [isSmartScanEnabled, setIsSmartScanEnabled] = useState(true);
    const scannerRef = useRef<any>(null);
    const [isCvReady, setIsCvReady] = useState(false);
    const contourRef = useRef<any>(null); // Store best detected points
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const requestRef = useRef<number>(); // Store animation frame ID


    // QR Code Throttle
    const qrThrottleRef = useRef<number>(0);
    const [isQrScanEnabled, setIsQrScanEnabled] = useState(true);
    const [detectedQrData, setDetectedQrData] = useState<string | null>(null);

    const [debugInfo, setDebugInfo] = useState<string>('');

    // Initialize scanner logic - Poll for CV/jscanify availability
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            // Reset state
            setCapturedImage(null);
            setIsFilterActive(false);
            setDisplayedImage(null);
            return;
        }

        // Poll for libraries
        const checkLibs = setInterval(() => {
            if (window.cv && window.jscanify && !scannerRef.current) {
                try {
                    scannerRef.current = new window.jscanify();
                    setIsCvReady(true);
                    console.log("Smart Scan initialized successfully");
                } catch (e) {
                    console.error("Failed to init jscanify", e);
                }
            } else if (window.cv && window.jscanify && scannerRef.current) {
                setIsCvReady(true);
            }
        }, 500);

        getDevices();
        document.body.style.overflow = 'hidden';

        return () => {
            stopCamera();
            clearInterval(checkLibs);
            document.body.style.overflow = '';
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // FILTER LOGIC - OpenCV Magic
    useEffect(() => {
        if (!capturedImage) return;

        if (!isFilterActive) {
            setDisplayedImage(capturedImage);
            return;
        }

        const applyFilter = async () => {
            try {
                if (!window.cv) return;

                // Load image to create Mat
                const img = new Image();
                img.onload = () => {
                    try {
                        const mat = window.cv.imread(img);
                        const dst = new window.cv.Mat();

                        // Convert to Gray
                        window.cv.cvtColor(mat, mat, window.cv.COLOR_RGBA2GRAY, 0);

                        // Adaptive Threshold (Scanner Look)
                        // ADAPTIVE_THRESH_GAUSSIAN_C, THRESH_BINARY, blockSize=11, C=2
                        window.cv.adaptiveThreshold(mat, dst, 255, window.cv.ADAPTIVE_THRESH_GAUSSIAN_C, window.cv.THRESH_BINARY, 11, 2);

                        // Show on temporary canvas to get base64
                        const canvas = document.createElement('canvas');
                        canvas.width = mat.cols;
                        canvas.height = mat.rows;
                        window.cv.imshow(canvas, dst);

                        setDisplayedImage(canvas.toDataURL('image/jpeg', 0.9));

                        // Cleanup
                        mat.delete();
                        dst.delete();
                    } catch (err) {
                        console.error("OpenCV filter failed", err);
                        setDisplayedImage(capturedImage); // Fallback
                    }
                };
                img.src = capturedImage;

            } catch (e) {
                console.error("Filter error", e);
                setDisplayedImage(capturedImage);
            }
        };

        applyFilter();

    }, [capturedImage, isFilterActive]);


    const getDevices = async () => {
        try {
            // Request permission first to get labels
            try {
                const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
                initialStream.getTracks().forEach(track => track.stop());
            } catch (err) {
                console.warn("Permission check failed or cancelled", err);
                // Continue anyway to see if we have devices already
            }

            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
            setDevices(videoDevices);

            // DEBUG: Show found devices
            const labels = videoDevices.map(d => d.label || 'unknown').join(', ');
            setDebugInfo(prev => `${prev} | Cams: ${videoDevices.length} (${labels})`);

            // Only select default if not already selected
            if (videoDevices.length > 0 && !selectedDeviceId) {
                // Try to find "back" camera
                const backCamera = videoDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rück'));

                if (backCamera) {
                    setSelectedDeviceId(backCamera.deviceId);
                } else {
                    // Fallback to first
                    setSelectedDeviceId(videoDevices[0].deviceId);
                }
            }
        } catch (err) {
            console.error("Error listing devices", err);
            setError("Konnte Kameras nicht abrufen.");
        }
    };

    // Start camera when selectedDeviceId changes
    useEffect(() => {
        if (selectedDeviceId && isOpen) {
            startCamera();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDeviceId, isOpen]);

    const startCamera = async () => {
        stopCamera(); // Stop previous stream if any
        setError(null);
        if (!selectedDeviceId) return;

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: selectedDeviceId },
                    width: { ideal: 1920 }, // Prefer High Res
                    height: { ideal: 1080 }
                }
            });
            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err: any) {
            console.error("Failed to start camera", err);
            setError("Kamerafehler. Bitte Berechtigungen prüfen.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const handleCapture = () => {
        if (videoRef.current) {
            const video = videoRef.current;
            if (video.readyState < 2 || video.videoWidth === 0) return;

            const scanner = scannerRef.current;
            let resultBase64 = '';

            try {
                if (isSmartScanEnabled && scanner) {
                    // --- SMART SCAN ---
                    const points = contourRef.current || scanner.findPaper(video);

                    // TIGHTEN CROP: Move points 3% towards center to cut off table background
                    const tighten = (p: any) => {
                        const center = {
                            x: (p.topLeft.x + p.topRight.x + p.bottomRight.x + p.bottomLeft.x) / 4,
                            y: (p.topLeft.y + p.topRight.y + p.bottomRight.y + p.bottomLeft.y) / 4
                        };
                        const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
                        const factor = 0.05; // 5% tighter (aggressive crop)
                        return {
                            topLeft: { x: lerp(p.topLeft.x, center.x, factor), y: lerp(p.topLeft.y, center.y, factor) },
                            topRight: { x: lerp(p.topRight.x, center.x, factor), y: lerp(p.topRight.y, center.y, factor) },
                            bottomRight: { x: lerp(p.bottomRight.x, center.x, factor), y: lerp(p.bottomRight.y, center.y, factor) },
                            bottomLeft: { x: lerp(p.bottomLeft.x, center.x, factor), y: lerp(p.bottomLeft.y, center.y, factor) }
                        };
                    };

                    const tightPoints = points ? tighten(points) : points;

                    const resultCanvas = scanner.extractPaper(video, 1000, 630, tightPoints);
                    resultBase64 = resultCanvas.toDataURL('image/jpeg', 0.9);
                } else {
                    // --- FULL FRAME ---
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0);
                        resultBase64 = canvas.toDataURL('image/jpeg', 0.9);
                    }
                }

                if (resultBase64) {
                    // STOP STREAM AND SHOW PREVIEW
                    stopCamera();
                    setCapturedImage(resultBase64);
                    // Reset stability
                    contourRef.current = null; // Clear cached points
                }

            } catch (e) {
                console.error("Smart Scan failed, falling back", e);
                // Fallback
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0);
                    const fb = canvas.toDataURL('image/jpeg', 0.9);
                    stopCamera();
                    setCapturedImage(fb);
                }
            }
        }
    };

    const confirmCapture = () => {
        if (displayedImage) {
            onCapture(displayedImage);
            onClose();
        }
    };

    const retake = () => {
        setCapturedImage(null);
        setDisplayedImage(null);
        setIsFilterActive(false);
        startCamera(); // Restart stream
        setDetectedQrData(null); // Clear any detected QR data
    };



    // --- LIVE PREVIEW LOOP ---
    useEffect(() => {
        if (!isOpen || !videoRef.current || capturedImage) return; // Stop loop if reviewing

        let animationFrameId: number;

        const loop = () => {
            const video = videoRef.current;
            const canvas = canvasOverlayRef.current;
            const scanner = scannerRef.current;
            const now = Date.now();

            if (video && video.readyState === 4 && stream && canvas) {
                // Resize canvas if needed
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous

                    // --- QR CODE SCANNING (Throttled: 300ms for better responsiveness) ---
                    if (isQrScanEnabled && (now - qrThrottleRef.current > 300)) {
                        qrThrottleRef.current = now;
                        try {
                            // Create temporary canvas for QR analysis to avoid reading full size image
                            // Downscale for performance (e.g. 640px width is usually enough)
                            const scale = Math.min(1, 640 / video.videoWidth);
                            const w = video.videoWidth * scale;
                            const h = video.videoHeight * scale;

                            const qrCanvas = document.createElement('canvas');
                            qrCanvas.width = w;
                            qrCanvas.height = h;
                            const qrCtx = qrCanvas.getContext('2d', { willReadFrequently: true });

                            if (qrCtx) {
                                qrCtx.drawImage(video, 0, 0, w, h);
                                const imageData = qrCtx.getImageData(0, 0, w, h);
                                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                                    inversionAttempts: "attemptBoth", // Try both normal and inverted for better detection
                                });

                                if (code && code.data && code.data !== "") {
                                    // Draw visual feedback on MAIN canvas
                                    const loc = code.location;
                                    // Scale back up to main canvas coords
                                    const s = 1 / scale;

                                    ctx.beginPath();
                                    ctx.lineWidth = 4;
                                    ctx.strokeStyle = '#3b82f6'; // Blue
                                    ctx.moveTo(loc.topLeftCorner.x * s, loc.topLeftCorner.y * s);
                                    ctx.lineTo(loc.topRightCorner.x * s, loc.topRightCorner.y * s);
                                    ctx.lineTo(loc.bottomRightCorner.x * s, loc.bottomRightCorner.y * s);
                                    ctx.lineTo(loc.bottomLeftCorner.x * s, loc.bottomLeftCorner.y * s);
                                    ctx.closePath();
                                    ctx.stroke();

                                    // PASSIVE MODE: Just set state, don't trigger callback
                                    // Update state if different to avoid unnecessary re-renders
                                    if (detectedQrData !== code.data) {
                                        setDetectedQrData(code.data);
                                    }
                                }
                                // Don't clear detectedQrData immediately - let user dismiss it manually
                                // This prevents flicker and gives user time to see/interact with banner
                            }
                        } catch (e) {
                            console.warn("QR Scan error", e);
                        }
                    }

                    if (isSmartScanEnabled && scanner) {
                        try {
                            const paperPoints = scanner.findPaper(video);

                            if (paperPoints) {
                                // Cache detected points for capture
                                contourRef.current = paperPoints;

                                // Draw contour
                                ctx.beginPath();
                                ctx.lineWidth = 4;

                                ctx.strokeStyle = '#00ff00';
                                ctx.moveTo(paperPoints.topLeft.x, paperPoints.topLeft.y);
                                ctx.lineTo(paperPoints.topRight.x, paperPoints.topRight.y);
                                ctx.lineTo(paperPoints.bottomRight.x, paperPoints.bottomRight.y);
                                ctx.lineTo(paperPoints.bottomLeft.x, paperPoints.bottomLeft.y);
                                ctx.closePath();
                                ctx.stroke();

                                ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
                                ctx.fill();

                                // Draw corners
                                const cornerRadius = 10;
                                ctx.fillStyle = '#ff9800'; // Orange
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                [paperPoints.topLeft, paperPoints.topRight, paperPoints.bottomRight, paperPoints.bottomLeft].forEach((point: any) => {
                                    ctx.beginPath();
                                    ctx.arc(point.x, point.y, cornerRadius, 0, 2 * Math.PI);
                                    ctx.fill();
                                });
                            } else {
                                // 
                            }
                        } catch (e) {
                            // ignore detection errors
                        }
                    }
                }
            }
            animationFrameId = requestAnimationFrame(loop);
        };

        loop();

        // Debug Loop
        const interval = setInterval(() => {
            if (videoRef.current && stream) {
                const v = videoRef.current;
                setDebugInfo(`Video: ${v.videoWidth}x${v.videoHeight} | Smart Scan: ${isSmartScanEnabled ? 'ON' : 'OFF'} | Cams: ${devices.length} | QR: ${isQrScanEnabled ? 'ON' : 'OFF'}`);
            }
        }, 1000);

        return () => {
            cancelAnimationFrame(animationFrameId);
            clearInterval(interval);
        };
    }, [isOpen, stream, isSmartScanEnabled, capturedImage, onQrFound, isQrScanEnabled]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
            {/* Header */}
            <div className="flex justify-between items-center p-4 text-white bg-black/50 absolute top-0 left-0 right-0 z-10 backdrop-blur-sm">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Camera size={20} />
                    {capturedImage ? 'Überprüfen' : 'Kamera'}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsQrScanEnabled(!isQrScanEnabled)}
                        className={`p-2 rounded-full transition-colors ${isQrScanEnabled ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white'}`}
                        title="QR Code Scanner"
                    >
                        <Scan size={20} />
                    </button>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
                {capturedImage ? (
                    /* REVIEW MODE */
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        {displayedImage ? (
                            <img
                                src={displayedImage}
                                alt="Captured"
                                className="max-w-full max-h-full object-contain rounded shadow-lg border border-white/20"
                            />
                        ) : (
                            <div className="text-white"><Loader2 className="animate-spin" /></div>
                        )}
                    </div>
                ) : (
                    /* CAMERA MODE */
                    <>
                        {error ? (
                            <div className="text-red-400 p-4 text-center">{error}</div>
                        ) : (
                            <div className="relative w-full h-full">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <canvas
                                    ref={canvasOverlayRef}
                                    className="absolute inset-0 w-full h-full pointer-events-none"
                                />
                                {isSmartScanEnabled && isCvReady && (
                                    <div className="absolute top-1/4 left-0 right-0 text-center pointer-events-none">
                                        <p className="text-white/80 text-sm bg-black/40 inline-block px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                                            {window.jscanify ? "Smart Scan aktiv - Karte anvisieren" : "Lade AI..."}
                                        </p>
                                    </div>
                                )}
                                {/* QR Code Banner */}
                                {detectedQrData && isQrScanEnabled && !capturedImage && (
                                    <div className="absolute bottom-44 left-0 right-0 flex justify-center pointer-events-auto px-4">
                                        <div className="bg-white text-black p-4 rounded-xl shadow-2xl flex flex-col gap-2 max-w-sm animate-in slide-in-from-bottom-4">
                                            <p className="text-xs font-semibold uppercase text-gray-500">QR Code erkannt</p>
                                            <p className="text-sm font-medium truncate max-w-[200px]">{detectedQrData}</p>
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => {
                                                        if (onQrFound) onQrFound(detectedQrData);
                                                    }}
                                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700"
                                                >
                                                    Übernehmen
                                                </button>
                                                <button
                                                    onClick={() => setDetectedQrData(null)}
                                                    className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm"
                                                >
                                                    Verwerfen
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer Controls */}
            <div className="p-6 bg-black/80 backdrop-blur-md flex flex-col gap-4 pb-8">
                {/* Debug info (optional, hidden by default unless needed) */}
                {debugInfo && <div className="text-[10px] text-gray-500 font-mono text-center mb-2">{debugInfo}</div>}

                {capturedImage ? (
                    /* REVIEW CONTROLS */
                    <div className="flex items-center justify-between w-full max-w-md mx-auto">
                        <button
                            onClick={retake}
                            className="text-white/80 text-sm font-medium hover:text-white px-4 py-2"
                        >
                            Wiederholen
                        </button>

                        <button
                            onClick={() => setIsFilterActive(!isFilterActive)}
                            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${isFilterActive ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                            <Sparkles size={24} className={isFilterActive ? "fill-white" : ""} />
                            <span className="text-[10px] font-medium">Magic Filter</span>
                        </button>

                        <button
                            onClick={confirmCapture}
                            className="bg-white text-black rounded-full px-6 py-3 font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            Benutzen <Scan size={16} />
                        </button>
                    </div>
                ) : (
                    /* CAMERA CONTROLS */
                    <>
                        <div className="flex justify-between items-center mb-4">
                            {/* Camera Selecor */}
                            <div className="flex gap-2">
                                {devices.length > 1 && (
                                    <div className="bg-gray-800 rounded-lg p-1 flex items-center">
                                        <select
                                            value={selectedDeviceId}
                                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                                            className="bg-transparent text-white text-xs p-1 outline-none border-none max-w-[120px]"
                                        >
                                            {devices.map(device => (
                                                <option key={device.deviceId} value={device.deviceId} className="text-black">
                                                    {device.label || `Kamera ${devices.indexOf(device) + 1}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">


                                {/* Smart Scan Toggle */}
                                <button
                                    onClick={() => setIsSmartScanEnabled(!isSmartScanEnabled)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isSmartScanEnabled ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
                                >
                                    {isSmartScanEnabled ? <Sparkles size={12} /> : <Scan size={12} />}
                                    {isSmartScanEnabled ? 'Smart Scan' : 'Standard'}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-center items-center gap-8">
                            <button
                                onClick={handleCapture}
                                disabled={!stream}
                                className={`w-16 h-16 rounded-full border-4 flex items-center justify-center hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed relative border-white`}
                            >
                                <div className={`w-14 h-14 rounded-full bg-white`}></div>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
