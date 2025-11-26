import React, { useState, useRef } from 'react';
import { X, Upload, Trash2, RefreshCw, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Language, ScanJob } from '../types';
import { translations } from '../utils/translations';

interface BatchUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddJobs: (files: File[], mode: 'vision' | 'hybrid') => void;
    queue: ScanJob[];
    onRemoveJob: (id: string) => void;
    lang: Language;
}
interface QueueItemProps {
    job: ScanJob;
    onRemove: (id: string) => void;
    getStatusIcon: (status: ScanJob['status']) => React.ReactNode;
}

const QueueItem: React.FC<QueueItemProps> = ({ job, onRemove, getStatusIcon }) => {
    const [imageUrl, setImageUrl] = useState<string>('');

    React.useEffect(() => {
        let url = '';
        if (job.frontImage instanceof File) {
            url = URL.createObjectURL(job.frontImage);
            setImageUrl(url);
        } else {
            setImageUrl(job.frontImage);
        }

        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [job.frontImage]);

    return (
        <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            {getStatusIcon(job.status)}
            <div className="flex-1 min-w-0">
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt="Card"
                        className="h-12 w-auto object-cover rounded border border-slate-200 dark:border-slate-700"
                    />
                )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
                {job.status === 'error' && job.error}
            </div>
            {(job.status === 'pending' || job.status === 'error') && (
                <button
                    onClick={() => onRemove(job.id)}
                    className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                >
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    );
};
export const BatchUploadModal: React.FC<BatchUploadModalProps> = ({
    isOpen,
    onClose,
    onAddJobs,
    queue,
    onRemoveJob,
    lang
}) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scanMode, setScanMode] = useState<'vision' | 'hybrid'>('vision');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const t = translations[lang];

    if (!isOpen) return null;

    const processFiles = async (files: FileList | null) => {
        if (!files) return;

        const filesArray = Array.from(files);
        const processedFiles: File[] = [];

        setIsProcessing(true);

        for (const file of filesArray) {
            if (file.type === 'application/pdf') {
                try {
                    const images = await convertPdfToImages(file);
                    for (let i = 0; i < images.length; i++) {
                        const res = await fetch(images[i]);
                        const blob = await res.blob();
                        const imageFile = new File([blob], `${file.name}_page_${i + 1}.jpg`, { type: 'image/jpeg' });
                        processedFiles.push(imageFile);
                    }
                } catch (err) {
                    console.error("PDF conversion failed", err);
                    alert(`Fehler beim Verarbeiten von ${file.name}`);
                }
            } else if (file.type.startsWith('image/')) {
                processedFiles.push(file);
            }
        }

        setSelectedFiles(prev => [...prev, ...processedFiles]);
        setIsProcessing(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(e.target.files);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        processFiles(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleStartProcessing = () => {
        if (selectedFiles.length > 0) {
            onAddJobs(selectedFiles, scanMode);
            setSelectedFiles([]);
        }
    };

    const handleRemoveSelected = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const getStatusIcon = (status: ScanJob['status']) => {
        switch (status) {
            case 'pending':
                return <Loader size={16} className="text-slate-400 animate-spin" />;
            case 'processing':
                return <Loader size={16} className="text-blue-500 animate-spin" />;
            case 'completed':
                return <CheckCircle size={16} className="text-green-500" />;
            case 'error':
                return <AlertCircle size={16} className="text-red-500" />;
        }
    };

    const pendingCount = queue.filter(j => j.status === 'pending').length;
    const processingCount = queue.filter(j => j.status === 'processing').length;
    const completedCount = queue.filter(j => j.status === 'completed').length;
    const errorCount = queue.filter(j => j.status === 'error').length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">

                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Upload size={18} className="text-slate-600 dark:text-slate-400" />
                            {t.batchUpload}
                        </h2>
                        {(pendingCount > 0 || processingCount > 0) && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {processingCount > 0 && `${t.batchProcessing}`}
                                {pendingCount > 0 && ` (${pendingCount} ${lang === 'de' ? 'wartend' : 'pending'})`}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto bg-white dark:bg-slate-900 space-y-4">

                    {/* Mode Selector */}
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
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

                    {/* File Upload Area */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                            }`}
                    >
                        <Upload size={48} className="mx-auto mb-4 text-slate-400 dark:text-slate-500" />
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {isProcessing ? "Verarbeite PDF..." : t.dragDropFiles}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t.uploadMultiple}
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                            className="hidden"
                            id="batch-file-upload"
                        /></div>

                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {selectedFiles.length} {t.imagesSelected}
                                </p>
                                <button
                                    onClick={handleStartProcessing}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2"
                                >
                                    {t.startProcessing}
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={file.name}
                                            className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveSelected(index);
                                            }}
                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Queue Status */}
                    {queue.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {lang === 'de' ? 'Warteschlange' : 'Queue'} ({queue.length})
                                </p>
                                <div className="flex gap-2 text-xs">
                                    {completedCount > 0 && (
                                        <span className="text-green-600 dark:text-green-400">
                                            ✓ {completedCount}
                                        </span>
                                    )}
                                    {errorCount > 0 && (
                                        <span className="text-red-600 dark:text-red-400">
                                            ✗ {errorCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1 max-h-64 overflow-y-auto">
                                {queue.map((job) => (
                                    <QueueItem
                                        key={job.id}
                                        job={job}
                                        onRemove={onRemoveJob}
                                        getStatusIcon={getStatusIcon}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {queue.length === 0 && selectedFiles.length === 0 && (
                        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                            {t.queueEmpty}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        {t.close}
                    </button>
                </div>
            </div>
        </div>
    );
};
