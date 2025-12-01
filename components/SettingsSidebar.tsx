import React, { useState, useEffect } from 'react';
import { X, Check, ExternalLink, Settings2, Moon, Sun, Languages, Database, AlertTriangle, Download, Upload, Users, Merge } from 'lucide-react';
import { GoogleContactsModal } from './GoogleContactsModal';
import { DuplicateFinderModal } from './DuplicateFinderModal';
import { useGoogleContactsAuth } from '../auth/useGoogleContactsAuth';
import { Language, HistoryItem } from '../types';
import { translations } from '../utils/translations';

interface SettingsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (key: string) => void;
    apiKey: string;
    lang: Language;
    setLang: (lang: Language) => void;
    isDarkMode: boolean;
    setIsDarkMode: (isDark: boolean) => void;
    errorMessage?: string | null;
    llmProvider: 'google' | 'openai' | 'custom';
    setLLMProvider: (provider: 'google' | 'openai' | 'custom') => void;
    customBaseUrl: string;
    customApiKey: string;
    customModel: string;
    openaiApiKey: string;
    openaiModel: string;
    setCustomConfig: (config: { customBaseUrl?: string; customApiKey?: string; customModel?: string; openaiApiKey?: string; openaiModel?: string }) => void;
    onOllamaDefaults: () => void;
    isInstallable?: boolean;
    onInstall?: () => void;
    streetDbStatus: 'idle' | 'loading' | 'ready' | 'error';
    streetDbProgress: number;
    streetDbError?: string | null;
    onLoadStreetDb: () => void;
    onImportGoogleContacts: (vcards: string[]) => void;
    onExportCSV: () => void;
    onExportJSON: () => void;
    onExportVCard: () => void;
    onImportCSV: (file: File) => void;
    onImportJSON: (file: File) => void;
    onImportVCard: (file: File) => void;
    onBackupAll: () => void;
    onRestoreZip: (file: File) => void;
    history: HistoryItem[];
    setHistory: (history: HistoryItem[]) => void;
    clearHistory: () => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
    isOpen, onClose, onSave, apiKey, lang, setLang, isDarkMode, setIsDarkMode, errorMessage,
    llmProvider, setLLMProvider, customBaseUrl, customApiKey, customModel, openaiApiKey, openaiModel, setCustomConfig, onOllamaDefaults,
    isInstallable, onInstall, streetDbStatus, streetDbProgress, streetDbError, onLoadStreetDb, onImportGoogleContacts,
    onExportCSV, onExportJSON, onExportVCard, onImportCSV, onImportJSON, onImportVCard,
    onBackupAll, onRestoreZip, history, setHistory, clearHistory
}) => {
    const [hasSystemKey, setHasSystemKey] = useState(false);
    const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
    const [showDuplicateFinder, setShowDuplicateFinder] = useState(false);
    const { isAuthenticated } = useGoogleContactsAuth();
    const t = translations[lang];

    useEffect(() => {
        if (isOpen) {
            checkSystemKey();
        }
    }, [isOpen]);

    const checkSystemKey = async () => {
        if ((window as any).aistudio && typeof (window as any).aistudio.hasSelectedApiKey === 'function') {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            setHasSystemKey(hasKey);
        }
    };

    const handleConnectGoogle = async () => {
        if ((window as any).aistudio && typeof (window as any).aistudio.openSelectKey === 'function') {
            try {
                await (window as any).aistudio.openSelectKey();
                await checkSystemKey();
            } catch (e) {
                console.error("Failed to open key selector", e);
            }
        } else {
            window.open('https://aistudio.google.com/app/apikey', '_blank');
        }
    };

    return (
        <>
            <GoogleContactsModal
                isOpen={isGoogleModalOpen}
                onClose={() => setIsGoogleModalOpen(false)}
                onImport={onImportGoogleContacts}
            />

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Panel */}
            <div className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-white dark:bg-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold">
                        <Settings2 size={20} className="text-slate-600 dark:text-slate-400" />
                        <h3>{t.settingsTitle}</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white dark:bg-slate-900">

                    {errorMessage && (
                        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                                {errorMessage}
                            </p>
                        </div>
                    )}

                    <div className="space-y-6">

                        {/* 1. Account Settings */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Account</h3>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm">
                                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Google Contacts</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Sync & Manager</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsGoogleModalOpen(true)}
                                        className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        Verwalten
                                    </button>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100 dark:border-slate-800" />

                        {/* 2. LLM Provider Selection */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t.llmProvider}</h3>
                            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4">
                                <button
                                    type="button"
                                    onClick={() => setLLMProvider('google')}
                                    className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${llmProvider === 'google'
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                        }`}
                                >
                                    {t.googleDefault}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLLMProvider('openai')}
                                    className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${llmProvider === 'openai'
                                        ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                        }`}
                                >
                                    {t.openai}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLLMProvider('custom')}
                                    className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${llmProvider === 'custom'
                                        ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                        }`}
                                >
                                    {t.customLLM}
                                </button>
                            </div>

                            {
                                llmProvider === 'google' && (
                                    <>
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 mb-4">
                                            <button
                                                onClick={handleConnectGoogle}
                                                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium py-2 px-4 rounded-lg transition-all shadow-sm active:scale-[0.98] text-sm"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                                {hasSystemKey ? t.connected : t.connectGoogle}
                                            </button>
                                        </div>

                                        <div className="relative flex justify-center text-xs uppercase mb-4">
                                            <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 dark:text-slate-500">{t.orManual}</span>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                                                {t.apiKeyLabel}
                                            </label>
                                            <input
                                                type="password"
                                                value={apiKey}
                                                onChange={(e) => onSave(e.target.value)}
                                                placeholder="AIzaSy..."
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 font-mono"
                                            />
                                            <div className="mt-1 flex justify-end">
                                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                                    {t.generateKey} <ExternalLink size={8} />
                                                </a>
                                            </div>
                                        </div>
                                    </>
                                )
                            }

                            {
                                llmProvider === 'openai' && (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 space-y-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">OpenAI Settings</h4>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">API Key</label>
                                            <input
                                                type="password"
                                                value={openaiApiKey}
                                                onChange={(e) => setCustomConfig({ openaiApiKey: e.target.value })}
                                                placeholder="sk-..."
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">{t.modelName}</label>
                                            <input
                                                type="text"
                                                value={openaiModel}
                                                onChange={(e) => setCustomConfig({ openaiModel: e.target.value })}
                                                placeholder="gpt-5.1"
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600"
                                            />
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                            <p>Standard: <code>gpt-5.1</code>. Supports Vision & Text.</p>
                                        </div>
                                    </div>
                                )
                            }

                            {
                                llmProvider === 'custom' && (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Custom LLM Settings</h4>
                                            <button
                                                type="button"
                                                onClick={onOllamaDefaults}
                                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                {t.ollamaDefaults}
                                            </button>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">{t.baseUrl}</label>
                                            <input
                                                type="text"
                                                value={customBaseUrl}
                                                onChange={(e) => setCustomConfig({ customBaseUrl: e.target.value })}
                                                placeholder="http://localhost:11434/v1"
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">API Key (optional)</label>
                                            <input
                                                type="password"
                                                value={customApiKey}
                                                onChange={(e) => setCustomConfig({ customApiKey: e.target.value })}
                                                placeholder="sk-..."
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">{t.modelName}</label>
                                            <input
                                                type="text"
                                                value={customModel}
                                                onChange={(e) => setCustomConfig({ customModel: e.target.value })}
                                                placeholder="llama3"
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                                            />
                                        </div>
                                    </div>
                                )
                            }
                        </div>

                        <hr className="border-slate-100 dark:border-slate-800" />

                        {/* 3. Database Settings (Data) */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Data</h3>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Database size={16} className="text-slate-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Street Directory</span>
                                </div>

                                {/* Status Indicator */}
                                {streetDbStatus === 'loading' && (
                                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        <span className="text-xs font-bold">{streetDbProgress}%</span>
                                    </div>
                                )}
                                {streetDbStatus === 'ready' && (
                                    <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                        <Check size={14} />
                                        <span className="text-xs font-bold uppercase">Ready</span>
                                    </div>
                                )}
                                {streetDbStatus === 'idle' && (
                                    <button
                                        onClick={onLoadStreetDb}
                                        className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                    >
                                        Load Database
                                    </button>
                                )}
                                {streetDbStatus === 'error' && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-red-500" title={streetDbError || 'Error'}>Error</span>
                                        <button
                                            onClick={onLoadStreetDb}
                                            className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                )}
                            </div>
                            {streetDbError && streetDbStatus === 'error' && (
                                <p className="text-[10px] text-red-500 mt-1 px-1">{streetDbError}</p>
                            )}
                        </div>

                        {/* 4. Dubletten */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Dubletten</h3>
                            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-800/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-lg text-orange-600 dark:text-orange-400">
                                        <Users size={16} />
                                    </div>
                                    <span className="text-sm font-bold text-orange-900 dark:text-orange-200">Tools</span>
                                </div>
                                <button
                                    onClick={() => setShowDuplicateFinder(true)}
                                    className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-800 rounded-lg text-xs font-bold text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <Merge size={14} /> Dubletten suchen & bereinigen
                                </button>
                            </div>
                        </div>

                        {/* 5. One-Click Backup */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Backup</h3>
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                                        <Database size={16} />
                                    </div>
                                    <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200">One-Click Backup</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={onBackupAll}
                                        className="py-2 px-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <Download size={14} /> Backup erstellen
                                    </button>
                                    <label className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-lg text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                                        <Upload size={14} /> Backup einspielen
                                        <input type="file" accept=".zip" className="hidden" onChange={(e) => e.target.files?.[0] && onRestoreZip(e.target.files[0])} />
                                    </label>
                                </div>
                                <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 mt-2 text-center">
                                    Speichert Kontakte, Bilder & Listen in einer ZIP-Datei.
                                </p>
                            </div>
                        </div>

                        {/* 6. Import */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Import</h3>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                <div className="flex gap-2">
                                    <label className="flex-1 py-2 px-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1 cursor-pointer">
                                        <Upload size={14} /> CSV
                                        <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onImportCSV(e.target.files[0])} />
                                    </label>
                                    <label className="flex-1 py-2 px-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1 cursor-pointer">
                                        <Upload size={14} /> vCard
                                        <input type="file" accept=".vcf,.vcard" className="hidden" onChange={(e) => e.target.files?.[0] && onImportVCard(e.target.files[0])} />
                                    </label>
                                    <label className="flex-1 py-2 px-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1 cursor-pointer">
                                        <Upload size={14} /> Backup
                                        <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && onImportJSON(e.target.files[0])} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* 7. Export */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Export</h3>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={onExportCSV}
                                        className="flex-1 py-2 px-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1"
                                        title="Für Excel / Outlook"
                                    >
                                        <Download size={14} /> CSV
                                    </button>
                                    <button
                                        onClick={onExportVCard}
                                        className="flex-1 py-2 px-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1"
                                        title="Alle Kontakte als eine .vcf Datei"
                                    >
                                        <Download size={14} /> vCard
                                    </button>
                                    <button
                                        onClick={onExportJSON}
                                        className="flex-1 py-2 px-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1"
                                        title="Vollständiges Backup inkl. Bilder"
                                    >
                                        <Download size={14} /> Backup
                                    </button>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100 dark:border-slate-800" />

                        {/* 8. App Settings (Language & Theme) */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">App</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
                                    className="flex items-center justify-center gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200"
                                >
                                    <Languages size={16} />
                                    {lang === 'de' ? 'Deutsch' : 'English'}
                                </button>
                                <button
                                    onClick={() => setIsDarkMode(!isDarkMode)}
                                    className="flex items-center justify-center gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200"
                                >
                                    {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
                                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            <DuplicateFinderModal
                isOpen={showDuplicateFinder}
                onClose={() => setShowDuplicateFinder(false)}
                history={history}
                onUpdateHistory={setHistory}
            />
        </>
    );
};
