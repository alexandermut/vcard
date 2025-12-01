import { useState, useCallback } from 'react';

interface UseScreenCaptureReturn {
    startCapture: () => Promise<void>;
    stopCapture: () => void;
    stream: MediaStream | null;
    error: string | null;
    isCapturing: boolean;
}

export const useScreenCapture = (): UseScreenCaptureReturn => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const startCapture = useCallback(async () => {
        setIsCapturing(true);
        setError(null);
        try {
            // @ts-ignore - cursor property is experimental but supported in Chrome/Edge
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" } as any,
                audio: false
            });

            setStream(mediaStream);

            // Handle stream ending (e.g. user clicks "Stop sharing" in browser UI)
            mediaStream.getVideoTracks()[0].onended = () => {
                stopCapture();
            };

        } catch (err) {
            console.error("Screen capture failed:", err);
            setError((err as Error).message || "Screen capture failed");
            setIsCapturing(false);
        }
    }, []);

    const stopCapture = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCapturing(false);
        setError(null);
    }, [stream]);

    return {
        startCapture,
        stopCapture,
        stream,
        error,
        isCapturing
    };
};
