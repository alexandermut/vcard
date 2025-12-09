import React, { useState, useRef } from 'react';
import { X, Upload, Trash2, RefreshCw, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Language, ScanJob } from '../types';
import { translations } from '../utils/translations';
import { convertPdfToImages } from '../utils/pdfUtils';
import { toast } from 'sonner';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface BatchUploadSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onAddJobs: (jobs: File[][], mode: 'vision' | 'hybrid') => void;
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
    const pageCount = job.images.length;

    React.useEffect(() => {
        let url = '';
        const firstImage = job.images[0];
        if (firstImage instanceof File) {
            url = URL.createObjectURL(firstImage);
            setImageUrl(url);
        } else {
            setImageUrl(firstImage);
        }

        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [job.images]);

    return (
        <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            {getStatusIcon(job.status)}
            <div className="flex-1 min-w-0 relative">
                {imageUrl && (
                    <div className="relative inline-block">
                        <img
                            src={imageUrl}
                            alt="Card"
                            className="h-12 w-auto object-cover rounded border border-slate-200 dark:border-slate-700"
                        />
                        {pageCount > 1 && (
                            <span className="absolute -top-1 -right-1 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded-full border border-white">
                                {pageCount}
                            </span>
                        )}
                    </div>
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

export const BatchUploadSidebar: React.FC<BatchUploadSidebarProps> = ({
    isOpen,
    onClose,
    onAddJobs,
    queue,
    onRemoveJob,
    lang
}) => {
    useEscapeKey(onClose, isOpen);
    // Each "Job" is an array of files (e.g. 1 image or N PDF pages)
    const [selectedJobs, setSelectedJobs] = useState<File[][]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scanMode, setScanMode] = useState<'vision' | 'hybrid'>('vision');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const t = translations[lang];

    // Lock body scroll
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const processFiles = async (files: FileList | null) => {
        if (!files) return;

        const filesArray = Array.from(files);
        const newJobs: File[][] = [];

        setIsProcessing(true);
        console.log(`[BatchUpload] Starting to process ${filesArray.length} files`);

        for (const file of filesArray) {
            if (file.type === 'application/pdf') {
                console.log(`[BatchUpload] Converting PDF: ${file.name}`);
                try {
                    const blobs = await convertPdfToImages(file);
                    console.log(`[BatchUpload] PDF converted: ${file.name} → ${blobs.length} pages`);

                    const pdfPages: File[] = [];
                    for (let i = 0; i < blobs.length; i++) {
                        const imageFile = new File([blobs[i]], `${file.name}_page_${i + 1}.jpg`, { type: 'image/jpeg' });
                        pdfPages.push(imageFile);
                    }
                    if (pdfPages.length > 0) {
                        newJobs.push(pdfPages); // All pages = 1 Job
                        toast.success(`PDF "${file.name}" → ${pdfPages.length} Seiten extrahiert`);
                    } else {
                        console.warn(`[BatchUpload] PDF has no pages: ${file.name}`);
                        toast.error(`PDF "${file.name}" enthält keine Seiten`);
                    }
                } catch (err: any) {
                    console.error(`[BatchUpload] PDF conversion failed for ${file.name}`, err);
                    toast.error(`Fehler beim Verarbeiten von ${file.name}: ${err.message}`);
                }
            } else if (file.type.startsWith('image/')) {
                console.log(`[BatchUpload] Adding image: ${file.name}`);
                newJobs.push([file]); // 1 Image = 1 Job
            } else {
                console.warn(`[BatchUpload] Unsupported file type: ${file.type} (${file.name})`);
                toast.error(`Nicht unterstützter Dateityp: ${file.name}`);
            }
        }

        console.log(`[BatchUpload] Processed ${newJobs.length} jobs from ${filesArray.length} files`);
        setSelectedJobs(prev => [...prev, ...newJobs]);
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
        if (selectedJobs.length > 0) {
            console.log(`[BatchUpload] Starting processing of ${selectedJobs.length} jobs in ${scanMode} mode`);
            toast.info(`${selectedJobs.length} Karten werden verarbeitet...`);
            onAddJobs(selectedJobs, scanMode);
            setSelectedJobs([]);
        } else {
            console.warn('[BatchUpload] No jobs selected for processing');
            toast.error('Keine Dateien ausgewählt');
        }
    };

    const handleRemoveSelected = (index: number) => {
        setSelectedJobs(prev => prev.filter((_, i) => i !== index));
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
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            <div
                data-testid="batch-upload-sidebar"
                className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

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
                <div className="p-6 overflow-y-auto bg-white dark:bg-slate-900 space-y-4 flex-1 custom-scrollbar">

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
                        data-testid="batch-dropzone"
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
                    {selectedJobs.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {selectedJobs.length} {t.imagesSelected}
                                </p>
                                <button
                                    onClick={handleStartProcessing}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2"
                                >
                                    {t.startProcessing}
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                {selectedJobs.map((jobFiles, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={URL.createObjectURL(jobFiles[0])}
                                            alt="Preview"
                                            className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                                        />
                                        {jobFiles.length > 1 && (
                                            <span className="absolute top-1 left-1 bg-slate-800/80 text-white text-xs px-1.5 py-0.5 rounded">
                                                {jobFiles.length} Seiten
                                            </span>
                                        )}
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
                            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
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

                    {queue.length === 0 && selectedJobs.length === 0 && (
                        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                            {t.queueEmpty}
                        </div>
                    )}
                </div>

            </div>
        </>
    );
};
