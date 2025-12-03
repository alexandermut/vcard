import React, { useState } from 'react';
import { X, Camera, Zap, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { scanWithTesseract } from '../services/tesseractService';
import { scanBusinessCard } from '../services/aiService';
import type { Language } from '../types';
import type { LLMConfig } from '../hooks/useLLMConfig';
import { parseVCardString } from '../utils/vcardUtils';

interface TesseractTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    lang: Language;
    llmConfig: LLMConfig;
}

interface TestResult {
    method: 'gemini' | 'tesseract';
    text: string;
    vcard?: string;
    processingTime: number;
    confidence?: number;
    fieldsExtracted: {
        name: boolean;
        company: boolean;
        phone: boolean;
        email: boolean;
        address: boolean;
    };
    error?: string;
}

export const TesseractTestModal: React.FC<TesseractTestModalProps> = ({
    isOpen,
    onClose,
    apiKey,
    lang,
    llmConfig
}) => {
    const [testImage, setTestImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [geminiResult, setGeminiResult] = useState<TestResult | null>(null);
    const [tesseractResult, setTesseractResult] = useState<TestResult | null>(null);
    const [tesseractProgress, setTesseractProgress] = useState(0);

    if (!isOpen) return null;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setTestImage(event.target?.result as string);
            setGeminiResult(null);
            setTesseractResult(null);
            setTesseractProgress(0);
        };
        reader.readAsDataURL(file);
    };

    const analyzeFields = (vcardString: string) => {
        const parsed = parseVCardString(vcardString);
        return {
            name: !!(parsed.data.fn || parsed.data.n),
            company: !!parsed.data.org,
            phone: !!(parsed.data.tel && parsed.data.tel.length > 0),
            email: !!(parsed.data.email && parsed.data.email.length > 0),
            address: !!(parsed.data.adr && parsed.data.adr.length > 0),
        };
    };

    const handleRunTest = async () => {
        if (!testImage) return;

        setIsProcessing(true);
        setGeminiResult(null);
        setTesseractResult(null);
        setTesseractProgress(0);

        // Extract base64 data
        const base64Data = testImage.split(',')[1];
        const mimeType = testImage.split(';')[0].split(':')[1];

        try {
            // Run both in parallel
            const [geminiRes, tesseractRes] = await Promise.allSettled([
                // Gemini API
                (async () => {
                    const startTime = Date.now();
                    try {
                        const vcard = await scanBusinessCard(
                            [{ base64: base64Data, mimeType }],
                            'google',
                            apiKey,
                            lang,
                            llmConfig
                        );
                        const processingTime = Date.now() - startTime;
                        return {
                            method: 'gemini' as const,
                            text: vcard,
                            vcard,
                            processingTime,
                            fieldsExtracted: analyzeFields(vcard),
                        };
                    } catch (error) {
                        return {
                            method: 'gemini' as const,
                            text: '',
                            processingTime: Date.now() - startTime,
                            fieldsExtracted: { name: false, company: false, phone: false, email: false, address: false },
                            error: (error as Error).message,
                        };
                    }
                })(),

                // Tesseract.js
                (async () => {
                    const startTime = Date.now();
                    try {
                        const result = await scanWithTesseract(
                            testImage,
                            lang,
                            true, // Enable preprocessing
                            (progress) => setTesseractProgress(progress)
                        );

                        // For now, just return raw OCR text
                        // TODO: Integrate with your regexParser for structured extraction
                        return {
                            method: 'tesseract' as const,
                            text: result.text,
                            processingTime: result.processingTime,
                            confidence: result.confidence,
                            fieldsExtracted: { name: false, company: false, phone: false, email: false, address: false },
                        };
                    } catch (error) {
                        return {
                            method: 'tesseract' as const,
                            text: '',
                            processingTime: Date.now() - startTime,
                            fieldsExtracted: { name: false, company: false, phone: false, email: false, address: false },
                            error: (error as Error).message,
                        };
                    }
                })(),
            ]);

            if (geminiRes.status === 'fulfilled') {
                setGeminiResult(geminiRes.value);
            }

            if (tesseractRes.status === 'fulfilled') {
                setTesseractResult(tesseractRes.value);
            }
        } finally {
            setIsProcessing(false);
            setTesseractProgress(0);
        }
    };

    const getAccuracyScore = (fields: TestResult['fieldsExtracted']) => {
        const total = Object.keys(fields).length;
        const found = Object.values(fields).filter(Boolean).length;
        return Math.round((found / total) * 100);
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col border border-slate-200 dark:border-slate-800">

                    {/* Header */}
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                                    <Camera className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                        🧪 Tesseract.js OCR Test
                                    </h2>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                        Side-by-Side Comparison: Gemini vs. Offline OCR
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* Upload Section */}
                        <div>
                            <label className="block mb-3">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                                    📸 Visitenkarte hochladen
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/30 dark:file:text-purple-300 cursor-pointer"
                                />
                            </label>

                            {testImage && (
                                <div className="mt-4 flex gap-4 items-start">
                                    <img
                                        src={testImage}
                                        alt="Test business card"
                                        className="w-64 h-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                                    />
                                    <button
                                        onClick={handleRunTest}
                                        disabled={isProcessing}
                                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-5 h-5" />
                                                Run Comparison Test
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Tesseract Progress */}
                        {isProcessing && tesseractProgress > 0 && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
                                        Tesseract.js Processing...
                                    </span>
                                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                        {tesseractProgress}%
                                    </span>
                                </div>
                                <div className="w-full bg-purple-200 dark:bg-purple-900/50 rounded-full h-2">
                                    <div
                                        className="bg-purple-600 dark:bg-purple-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${tesseractProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Results Comparison */}
                        {(geminiResult || tesseractResult) && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                {/* Gemini Result */}
                                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200">Gemini API</h3>
                                    </div>

                                    {geminiResult?.error ? (
                                        <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-3 rounded-lg text-sm">
                                            ❌ Error: {geminiResult.error}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-3 mb-4">
                                                <MetricCard icon={<Clock />} label="Zeit" value={`${geminiResult?.processingTime}ms`} />
                                                <MetricCard icon={<CheckCircle2 />} label="Genauigkeit" value={`${getAccuracyScore(geminiResult?.fieldsExtracted || {} as any)}%`} />
                                                <FieldsGrid fields={geminiResult?.fieldsExtracted || {} as any} />
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                                                <p className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-h-64 overflow-y-auto">
                                                    {geminiResult?.vcard || geminiResult?.text}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Tesseract Result */}
                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg text-2xl">
                                            🧪
                                        </div>
                                        <h3 className="text-lg font-bold text-purple-900 dark:text-purple-200">Tesseract.js (Offline)</h3>
                                    </div>

                                    {tesseractResult?.error ? (
                                        <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-3 rounded-lg text-sm">
                                            ❌ Error: {tesseractResult.error}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-3 mb-4">
                                                <MetricCard icon={<Clock />} label="Zeit" value={`${tesseractResult?.processingTime}ms`} />
                                                <MetricCard icon={<Zap />} label="OCR Confidence" value={`${tesseractResult?.confidence?.toFixed(1)}%`} />
                                                <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
                                                    ⚠️ Parser Integration ausstehend (rohe OCR-Ausgabe)
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                                                <p className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-h-64 overflow-y-auto">
                                                    {tesseractResult?.text || 'Kein Text erkannt'}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>

                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Status:</span>
                                {!testImage && <span>Keine Karte geladen</span>}
                                {testImage && !geminiResult && !tesseractResult && <span>Bereit zum Testen</span>}
                                {isProcessing && <span className="text-purple-600 dark:text-purple-400 font-medium">⚡ Processing...</span>}
                                {!isProcessing && (geminiResult || tesseractResult) && <span className="text-green-600 dark:text-green-400 font-medium">✅ Test abgeschlossen</span>}
                            </div>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                            >
                                Schließen
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};

// Helper Components
const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <span className="w-4 h-4">{icon}</span>
            <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-bold text-slate-900 dark:text-white">{value}</span>
    </div>
);

const FieldsGrid: React.FC<{ fields: TestResult['fieldsExtracted'] }> = ({ fields }) => (
    <div className="grid grid-cols-2 gap-2">
        {Object.entries(fields).map(([key, found]) => (
            <div
                key={key}
                className={`flex items-center gap-2 p-2 rounded-lg text-sm ${found
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
            >
                {found ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span className="capitalize">{key}</span>
            </div>
        ))}
    </div>
);
