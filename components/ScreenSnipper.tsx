import React, { useState, useRef, useEffect } from 'react';
import { Crop, X, Check, Camera, ExternalLink } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ScreenSnipperProps {
    stream: MediaStream;
    onCrop: (blob: Blob) => void;
    onCancel: () => void;
}

export const ScreenSnipper: React.FC<ScreenSnipperProps> = ({ stream, onCrop, onCancel }) => {
    const [snapshot, setSnapshot] = useState<string | null>(null);
    const [selection, setSelection] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [pipWindow, setPipWindow] = useState<Window | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const startPos = useRef<{ x: number, y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Auto-play video when stream changes
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    // Handle PiP Window cleanup
    useEffect(() => {
        if (pipWindow) {
            pipWindow.addEventListener('pagehide', () => {
                setPipWindow(null);
            });
        }
    }, [pipWindow]);

    const handleSnap = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            setSnapshot(dataUrl);

            // Stop the stream tracks now that we have the snapshot
            stream.getTracks().forEach(track => track.stop());

            // Close PiP if open
            if (pipWindow) {
                pipWindow.close();
                setPipWindow(null);
            }
        }
    };

    const togglePiP = async () => {
        if (pipWindow) {
            pipWindow.close();
            setPipWindow(null);
            return;
        }

        // @ts-ignore - documentPictureInPicture is experimental
        if (!window.documentPictureInPicture) {
            alert("Dein Browser unterstützt diese Funktion noch nicht (Chrome/Edge erforderlich).");
            return;
        }

        try {
            // @ts-ignore
            const pip = await window.documentPictureInPicture.requestWindow({
                width: 300,
                height: 150,
            });

            // Copy styles
            [...document.styleSheets].forEach((styleSheet) => {
                try {
                    const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
                    const style = document.createElement('style');
                    style.textContent = cssRules;
                    pip.document.head.appendChild(style);
                } catch (e) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.type = styleSheet.type;
                    link.media = styleSheet.media.toString();
                    link.href = styleSheet.href || '';
                    pip.document.head.appendChild(link);
                }
            });

            // Add Tailwind CDN as fallback if local styles fail in PiP
            const tw = document.createElement('script');
            tw.src = "https://cdn.tailwindcss.com";
            pip.document.head.appendChild(tw);

            setPipWindow(pip);
        } catch (err) {
            console.error("Failed to open PiP:", err);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!snapshot || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        startPos.current = { x, y };
        setIsDragging(true);
        setSelection({ x, y, w: 0, h: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !startPos.current || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const x = Math.min(currentX, startPos.current.x);
        const y = Math.min(currentY, startPos.current.y);
        const w = Math.abs(currentX - startPos.current.x);
        const h = Math.abs(currentY - startPos.current.y);

        setSelection({ x, y, w, h });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        startPos.current = null;
    };

    const handleConfirm = async () => {
        if (!selection || !imgRef.current || selection.w < 10 || selection.h < 10) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate scale factor (displayed size vs natural size)
        const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

        canvas.width = selection.w * scaleX;
        canvas.height = selection.h * scaleY;

        ctx.drawImage(
            imgRef.current,
            selection.x * scaleX, selection.y * scaleY, selection.w * scaleX, selection.h * scaleY,
            0, 0, canvas.width, canvas.height
        );

        canvas.toBlob((blob) => {
            if (blob) onCrop(blob);
        }, 'image/jpeg', 0.95);
    };

    const Controls = () => (
        <div className={`flex flex-col items-center justify-center gap-4 p-4 h-full bg-slate-900 ${pipWindow ? 'text-white' : ''}`}>
            {pipWindow && <div className="text-sm font-medium text-slate-300 mb-2">Kontakte.me Scanner</div>}
            <button
                onClick={handleSnap}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg shadow-lg shadow-blue-500/30 transition-all hover:scale-105 w-full"
            >
                <Camera size={24} />
                Snap
            </button>
            {pipWindow && (
                <div className="text-xs text-slate-400 text-center">
                    Gehe zum Ziel-Tab und klicke Snap
                </div>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
            <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl max-w-full max-h-[80vh] border border-slate-700">

                {/* Mode 1: Live Preview */}
                {!snapshot && (
                    <div className="relative">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            className="max-w-full max-h-[70vh] block"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {!pipWindow && (
                                <div className="bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-sm">
                                    Navigiere zum Impressum und klicke "Snap"
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Mode 2: Snapshot & Crop */}
                {snapshot && (
                    <div
                        ref={containerRef}
                        className="relative cursor-crosshair select-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <img
                            ref={imgRef}
                            src={snapshot}
                            alt="Screen Capture"
                            className="max-w-full max-h-[70vh] object-contain block"
                            draggable={false}
                        />

                        {selection && (
                            <div
                                className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
                                style={{
                                    left: selection.x,
                                    top: selection.y,
                                    width: selection.w,
                                    height: selection.h
                                }}
                            />
                        )}
                    </div>
                )}
            </div>

            <div className="mt-6 flex gap-4 items-center">
                <button
                    onClick={onCancel}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-medium transition-colors"
                >
                    <X size={20} />
                    Abbrechen
                </button>

                {!snapshot ? (
                    <>
                        {!pipWindow && (
                            <button
                                onClick={handleSnap}
                                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
                            >
                                <Camera size={24} />
                                Snap
                            </button>
                        )}

                        {/* PiP Toggle */}
                        {/* @ts-ignore */}
                        {window.documentPictureInPicture && (
                            <button
                                onClick={togglePiP}
                                className={`flex items-center gap-2 px-4 py-3 rounded-full font-medium transition-colors ${pipWindow ? 'bg-blue-900/50 text-blue-300 border border-blue-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                                title="Steuerung in separates Fenster auslagern"
                            >
                                <ExternalLink size={20} />
                                {pipWindow ? 'Steuerung aktiv' : 'Pop-out'}
                            </button>
                        )}
                    </>
                ) : (
                    <button
                        onClick={handleConfirm}
                        disabled={!selection || selection.w < 10}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-colors ${selection && selection.w >= 10
                                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/30'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                    >
                        <Check size={20} />
                        Auswahl scannen
                    </button>
                )}
            </div>

            {/* Render Controls in PiP Window if active */}
            {pipWindow && createPortal(
                <Controls />,
                pipWindow.document.body
            )}
        </div>
    );
};
