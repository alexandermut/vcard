import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, RefreshCw, Check, Loader2 } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { translations } from '../utils/translations';
import { Language } from '../types';

interface CameraCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (base64Image: string) => void;
    lang: Language;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ isOpen, onClose, onCapture, lang }) => {
    useEscapeKey(onClose, isOpen);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const t = translations[lang];

    // Initialize: Enumerate devices
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            return;
        }

        const getDevices = async () => {
            try {
                // Request permission first to get labels
                const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
                initialStream.getTracks().forEach(track => track.stop()); // Stop immediately

                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                setDevices(videoDevices);

                // Select default (first one or previously selected)
                if (videoDevices.length > 0 && !selectedDeviceId) {
                    setSelectedDeviceId(videoDevices[0].deviceId);
                }
            } catch (err) {
                console.error("Failed to enumerate devices", err);
                setError("Kamera-Zugriff verweigert oder nicht verfügbar.");
            }
        };

        getDevices();
        document.body.style.overflow = 'hidden';

        return () => {
            stopCamera();
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Start camera when selectedDeviceId changes
    useEffect(() => {
        if (selectedDeviceId && isOpen) {
            startCamera(selectedDeviceId);
        }
    }, [selectedDeviceId, isOpen]);

    const startCamera = async (deviceId: string) => {
        stopCamera(); // Stop previous stream if any
        setError(null);

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: deviceId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err: any) {
            console.error("Failed to start camera", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError("Zugriff verweigert. Bitte erlauben Sie den Kamerazugriff im Browser und System.");
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setError("Keine Kamera gefunden. Bitte Gerät anschließen.");
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setError("Kamera wird bereits verwendet oder ist nicht verfügbar (iPhone gesperrt?).");
            } else {
                setError("Kamerafehler: " + (err.message || "Unbekannter Fehler"));
            }
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

            if (video.readyState < 2) { // 2 = HAVE_CURRENT_DATA
                console.warn("Video not ready yet");
                return;
            }

            if (video.videoWidth === 0 || video.videoHeight === 0) {
                console.warn("Video dimensions are 0");
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const base64 = canvas.toDataURL('image/jpeg', 0.9);
                if (base64.length < 100) {
                    console.error("Captured base64 is too short, invalid image");
                    return;
                }
                onCapture(base64);
                onClose();
            }
        }
    };

    const [debugInfo, setDebugInfo] = useState<string>('');

    // Debug loop - verify data
    useEffect(() => {
        if (!isOpen || !videoRef.current) return;
        const interval = setInterval(() => {
            const v = videoRef.current;
            if (v && stream) {
                const track = stream.getVideoTracks()[0];
                const trackInfo = track ? `Track: ${track.label} (Muted: ${track.muted}, Enabled: ${track.enabled}, State: ${track.readyState})` : 'No Track';
                const pausedState = v.paused ? 'PAUSED' : 'PLAYING';
                setDebugInfo(`Video: ${v.readyState} | Size: ${v.videoWidth}x${v.videoHeight} | ${pausedState} | ${trackInfo}`);
            }
        }, 500);
        return () => clearInterval(interval);
    }, [isOpen, stream]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl flex flex-col items-center p-4">

                {/* Header / Controls */}
                <div className="w-full flex justify-between items-center mb-4 text-white">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Camera size={20} />
                            Kameraaufnahme
                        </h2>
                        <span className="text-xs text-slate-400 font-normal">
                            iPhone bitte <strong>gesperrt</strong> lassen (via Kabel empfohlen)
                        </span>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Device Selector (if multiple) */}
                {devices.length > 1 && (
                    <div className="w-full mb-4 flex gap-2">
                        <select
                            value={selectedDeviceId}
                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                            className="flex-1 bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {devices.map((device, idx) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Kamera ${idx + 1}`}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => selectedDeviceId && startCamera(selectedDeviceId)}
                            className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 text-white transition-colors"
                            title="Kamera neu laden"
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>
                )}

                {/* Video Preview */}
                <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl mb-6">
                    {error ? (
                        <div className="absolute inset-0 flex items-center justify-center text-red-400 p-4 text-center">
                            {error}
                        </div>
                    ) : (
                        <>
                            {(!stream || (videoRef.current?.readyState || 0) < 2) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                                    <Loader2 className="animate-spin text-blue-500" size={32} />
                                </div>
                            )}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                controls
                                onLoadedMetadata={(e) => {
                                    e.currentTarget.play().catch(console.error);
                                }}
                                className="w-full h-full object-contain"
                            />
                        </>
                    )}
                </div>

                {/* Capture Button */}
                <button
                    onClick={handleCapture}
                    disabled={!!error || !stream}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                    <div className="w-16 h-16 bg-white rounded-full" />
                </button>

                <div className="text-[10px] text-zinc-500 font-mono text-center max-w-lg truncate">
                    {debugInfo}
                </div>
            </div>
        </div>
    );
};
