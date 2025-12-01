import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Trash2, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { FailedScan, getFailedScans, deleteFailedScan } from '../utils/db';
import { toast } from 'sonner';

interface FailedScansModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRetry: (images: string[], mode: 'vision' | 'hybrid') => void;
}

export const FailedScansModal: React.FC<FailedScansModalProps> = ({ isOpen, onClose, onRetry }) => {
    const [scans, setScans] = useState<FailedScan[]>([]);
    const [loading, setLoading] = useState(false);

    const loadScans = async () => {
        setLoading(true);
        try {
            const items = await getFailedScans();
            // Sort by date desc
            items.sort((a, b) => b.timestamp - a.timestamp);
            setScans(items);
        } catch (e) {
            console.error("Failed to load failed scans", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadScans();
        }
    }, [isOpen]);

    const handleRetry = async (scan: FailedScan) => {
        try {
            // Add back to queue
            // Note: mode is string in DB, but onRetry expects specific union. Cast it.
            onRetry(scan.images, (scan.mode as 'vision' | 'hybrid') || 'vision');

            // Delete from failed list
            await deleteFailedScan(scan.id);

            toast.success("Scan erneut zur Warteschlange hinzugefügt");
            loadScans();
        } catch (e) {
            console.error("Retry failed", e);
            toast.error("Fehler beim Wiederholen");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteFailedScan(id);
            toast.success("Eintrag gelöscht");
            loadScans();
        } catch (e) {
            console.error("Delete failed", e);
            toast.error("Fehler beim Löschen");
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm("Wirklich alle fehlgeschlagenen Scans löschen?")) return;
        try {
            for (const scan of scans) {
                await deleteFailedScan(scan.id);
            }
            toast.success("Alle Einträge gelöscht");
            loadScans();
        } catch (e) {
            console.error("Delete all failed", e);
            toast.error("Fehler beim Löschen");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">

                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle size={20} className="text-red-500" />
                        Fehlgeschlagene Scans
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : scans.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 dark:text-slate-400">
                            Keine fehlgeschlagenen Scans vorhanden.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {scans.map(scan => (
                                <div key={scan.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4">
                                    {/* Images */}
                                    <div className="flex gap-2 overflow-x-auto sm:w-1/3 shrink-0 pb-2 sm:pb-0">
                                        {scan.images.map((img, i) => (
                                            <div key={i} className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                                                <img src={img} alt={`Scan ${i}`} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-mono text-slate-400">
                                                {new Date(scan.timestamp).toLocaleString()}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-bold">
                                                {scan.mode}
                                            </span>
                                        </div>
                                        <p className="text-red-500 text-sm font-medium mb-4 break-words">
                                            {scan.error}
                                        </p>

                                        <div className="flex gap-2 mt-auto">
                                            <button
                                                onClick={() => handleRetry(scan)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <RefreshCw size={14} />
                                                Wiederholen
                                            </button>
                                            <button
                                                onClick={() => handleDelete(scan.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <Trash2 size={14} />
                                                Löschen
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {scans.length > 0 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex justify-end">
                        <button
                            onClick={handleDeleteAll}
                            className="text-red-500 hover:text-red-700 text-sm font-medium px-4 py-2"
                        >
                            Alle löschen
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
