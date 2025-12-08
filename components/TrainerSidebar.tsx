import React, { useState, useCallback } from 'react';
import { X, Upload, Play, CheckCircle, AlertTriangle, FileJson, TrendingUp, Microscope, Database } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { ParsedVCard, VCardData } from '../types';
// import { translations } from '../utils/translations'; // Optional: Add translations later

import { TestCase } from '../types';

interface TrainerSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    wasmModule: any;
    lang: 'de' | 'en';
    testCases: TestCase[];
    onAddTestCases: (cases: TestCase[]) => void;
}

interface BenchmarkResult {
    id: string;
    score: number; // 0-100
    matches: string[]; // Fields that matched
    misses: { field: string; expected: string; actual: string }[];
    isPerfect: boolean;
}

export const TrainerSidebar: React.FC<TrainerSidebarProps> = ({ isOpen, onClose, wasmModule, lang, testCases, onAddTestCases }) => {
    const [results, setResults] = useState<BenchmarkResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);

    // File Upload Handler
    const onDrop = useCallback((acceptedFiles: File[]) => {
        acceptedFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const json = JSON.parse(reader.result as string);
                    if (json.test_case && json.test_case.text && json.test_case.expected) {
                        onAddTestCases([json.test_case]);
                    }
                } catch (e) {
                    console.error("Invalid JSON", file.name);
                }
            };
            reader.readAsText(file);
        });
    }, [onAddTestCases]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/json': ['.json'] }
    });

    // Benchmark Logic
    const runBenchmark = async () => {
        if (!wasmModule || !wasmModule.rust_parse_vcard) {
            alert("Rust WASM not loaded!");
            return;
        }

        setIsRunning(true);
        setResults([]);
        let processed = 0;

        const newResults: BenchmarkResult[] = [];

        for (const test of testCases) {
            // Run Parser
            const rawVCard = wasmModule.rust_parse_vcard(test.text);

            // Parse the output vCard to compare (Using simple Regex or a helper)
            // Note: Comparing vCard strings is hard (order differs). 
            // Better to parse the OUTPUT vCard into objects and compare objects.
            // We can use the existing `parseVCard` logic or just simple regex for verify.

            const actual = parseVCardString(rawVCard);
            const expected = test.expected;

            // Compare
            const comparison = compareVCards(expected, actual);
            newResults.push({
                id: test.id,
                ...comparison
            });

            processed++;
            setProgress(Math.round((processed / testCases.length) * 100));

            // Yield to UI
            await new Promise(r => setTimeout(r, 0));
        }

        setResults(newResults);
        setIsRunning(false);
    };

    // Helper: Parsed VCard Comparison
    const compareVCards = (expected: VCardData, actual: VCardData) => {
        const matches: string[] = [];
        const misses: { field: string; expected: string; actual: string }[] = [];
        const fields = ['fn', 'org', 'title'] as const;

        // Singleton Fields
        fields.forEach(f => {
            const exp = expected[f]?.trim() || '';
            const act = actual[f]?.trim() || '';
            if (!exp) return; // Ignore empty expectations

            // Fuzzy Match?
            if (act.includes(exp) || exp.includes(act)) { // Loose check
                matches.push(f);
            } else {
                misses.push({ field: f, expected: exp, actual: act });
            }
        });

        // Score
        const total = matches.length + misses.length;
        const score = total === 0 ? 100 : (matches.length / total) * 100;

        return { score, matches, misses, isPerfect: misses.length === 0 };
    };

    // Helper: Simple vCard Parser (Client-side)
    // We need to convert the Rust output string back to an object for comparison.
    const parseVCardString = (vcard: string): VCardData => {
        // reuse existing utils/vcardUtils if possible or simple regex
        // ... implementation detail ...
        const getData = (key: string) => {
            const match = vcard.match(new RegExp(`${key}:(.*)`, 'i'));
            return match ? match[1].trim() : '';
        };
        return {
            fn: getData('FN'),
            org: getData('ORG'),
            title: getData('TITLE'),
            // ...
        } as VCardData;
    };

    // Stats
    const avgScore = results.length ? results.reduce((a, b) => a + b.score, 0) / results.length : 0;
    const perfectCount = results.filter(r => r.isPerfect).length;

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={onClose} />}
            <div className={`fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white dark:bg-slate-950 shadow-2xl z-50 transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-200 dark:border-slate-800 flex flex-col`}>

                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between bg-white dark:bg-slate-900">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Microscope className="text-purple-500" /> API Trainer Mode
                    </h3>
                    <button onClick={onClose}><X /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50">

                    {/* 1. Upload */}
                    <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-purple-500 bg-purple-50' : 'border-slate-300 dark:border-slate-700 hover:border-purple-400'}`}>
                        <input {...getInputProps()} />
                        <Upload className="mx-auto text-slate-400 mb-2" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            Drop your JSON Test Cases here
                        </p>
                        <p className="text-xs text-slate-400 mt-1">{testCases.length} loaded</p>
                    </div>

                    {/* 2. Controls */}
                    {testCases.length > 0 && (
                        <div className="mt-4">
                            <button
                                onClick={runBenchmark}
                                disabled={isRunning}
                                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                            >
                                {isRunning ? <div className="animate-spin text-xl">⏳</div> : <Play size={18} />}
                                {isRunning ? 'Training...' : 'Run Benchmark'}
                            </button>
                        </div>
                    )}

                    {/* 3. Progress */}
                    {isRunning && (
                        <div className="mt-4 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div className="bg-purple-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                    )}

                    {/* 4. Results Dashboard */}
                    {results.length > 0 && !isRunning && (
                        <div className="mt-6 space-y-4">

                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                                    <div className="text-xs uppercase text-green-700 font-bold">Accuracy</div>
                                    <div className="text-2xl font-bold text-green-800 dark:text-green-300">{avgScore.toFixed(1)}%</div>
                                </div>
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                                    <div className="text-xs uppercase text-blue-700 font-bold">Perfect</div>
                                    <div className="text-2xl font-bold text-blue-800 dark:text-blue-300">{perfectCount} / {results.length}</div>
                                </div>
                            </div>

                            {/* Analysis - Top Misses */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                                    <AlertTriangle size={14} className="text-amber-500" />
                                    Fix Recommendations
                                </h4>
                                <div className="space-y-2 text-sm">
                                    {/* Logic to aggregate misses */}
                                    {results.flatMap(r => r.misses).slice(0, 5).map((m, i) => (
                                        <div key={i} className="p-2 bg-red-50 dark:bg-red-900/10 rounded border border-red-100 dark:border-red-900/20">
                                            <div className="font-mono text-xs text-slate-500">{m.field.toUpperCase()}</div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-red-600 line-through decoration-red-300">{m.actual || '(empty)'}</span>
                                                <span className="text-green-600 font-medium">→ {m.expected}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>
        </>
    );
};
