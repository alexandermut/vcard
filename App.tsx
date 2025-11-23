import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Download, AlertTriangle, Settings, UserCircle, Camera, History, QrCode, Save, AppWindow, Contact, Upload, Heart } from 'lucide-react';
import { Editor } from './components/Editor';
import { PreviewCard } from './components/PreviewCard';
import { SettingsModal } from './components/SettingsModal';
import { ScanModal } from './components/ScanModal';
import { BatchUploadModal } from './components/BatchUploadModal';
import { QRCodeModal } from './components/QRCodeModal';
import { HistorySidebar } from './components/HistorySidebar';
import { SocialSearchModal } from './components/SocialSearchModal';
import { QueueIndicator } from './components/QueueIndicator';
import { LegalModal } from './components/LegalModal';
import { DEFAULT_VCARD, parseVCardString, downloadVCard, generateVCardFromData, generateContactFilename } from './utils/vcardUtils';
import { correctVCard } from './services/aiService';
import { HistoryItem, Language, VCardData } from './types';
import { translations } from './utils/translations';
import { runSelfTests } from './utils/tests';
import { useScanQueue } from './hooks/useScanQueue';
import { useLLMConfig } from './hooks/useLLMConfig';
import { clean_number } from './utils/regexParser'; // Import helper for phone matching

const App: React.FC = () => {
  const [vcardString, setVcardString] = useState<string>(DEFAULT_VCARD);
  const [backupVCard, setBackupVCard] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals & UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSocialSearchOpen, setIsSocialSearchOpen] = useState(false);
  const [searchPlatform, setSearchPlatform] = useState<string>('LINKEDIN');
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'imprint' | 'privacy'>('imprint');
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Current Images State (to show in preview)
  const [currentImages, setCurrentImages] = useState<string[] | undefined>(undefined);

  // Drag & Drop State
  const [droppedFile, setDroppedFile] = useState<File | null>(null);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('vcard_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Theme State (Default to dark)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  // Language State
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('lang');
    return (saved === 'en' || saved === 'de') ? saved : 'de';
  });

  // Settings State
  const [apiKey, setApiKey] = useState('');
  const [hasSystemKey, setHasSystemKey] = useState(false);

  // LLM Configuration
  const { config: llmConfig, setProvider, setCustomConfig, setOllamaDefaults } = useLLMConfig();

  // Run Tests on Mount (Dev/Safety check)
  useEffect(() => {
    const timer = setTimeout(() => {
      runSelfTests();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Save History
  useEffect(() => {
    try {
      localStorage.setItem('vcard_history', JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history (Quota Exceeded?)", e);
      // Optional: Could show a toast here, but for now just don't crash
    }
  }, [history]);

  // Save Language
  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const t = translations[lang];

  // Check for system key (e.g. from window.aistudio)
  const checkSystemKey = async () => {
    if ((window as any).aistudio && typeof (window as any).aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setHasSystemKey(hasKey);
    }
  };

  // Load Settings from LocalStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    setApiKey(savedKey);
    checkSystemKey();
  }, []);

  // Save Settings
  const handleSaveSettings = (newKey: string) => {
    setApiKey(newKey);
    if (newKey) localStorage.setItem('gemini_api_key', newKey);
    else localStorage.removeItem('gemini_api_key');
    checkSystemKey();
    setError(null);
  };

  // Parse the string whenever it changes
  const parsedData = useMemo(() => parseVCardString(vcardString), [vcardString]);

  // Helper to get active key
  const getKeyToUse = () => {
    let keyToUse = apiKey;
    if (!keyToUse) {
      try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
          // @ts-ignore
          keyToUse = process.env.API_KEY;
        }
      } catch (e) {
        keyToUse = '';
      }
    }
    return keyToUse;
  };

  // Smart Add To History (Merges Duplicates)
  const addToHistory = useCallback((str: string, parsed?: any, scanImages?: string[]) => {
    const p = parsed || parseVCardString(str);
    if (!p.isValid) return;

    const newData = p.data as VCardData;
    const newFn = newData.fn?.trim();

    // Extract clean phone numbers for matching
    const newPhones = newData.tel?.map(t => clean_number(t.value)) || [];

    if (!newFn && newPhones.length === 0) return; // Need at least name or phone

    setHistory(prev => {
      // 1. Check for exact string duplicate (fast exit)
      if (prev.length > 0 && prev[0].vcard === str) return prev;

      // 2. Search for semantic duplicate (by Name OR Phone)
      const existingIndex = prev.findIndex(item => {
        // Match by Name
        if (newFn && item.name?.trim().toLowerCase() === newFn.toLowerCase()) return true;

        // Match by Phone (Deep check)
        if (newPhones.length > 0) {
          const oldParsed = parseVCardString(item.vcard);
          const oldPhones = oldParsed.data.tel?.map(t => clean_number(t.value)) || [];
          // Check for intersection
          const hasCommonPhone = newPhones.some(np => np.length > 6 && oldPhones.includes(np));
          if (hasCommonPhone) return true;
        }

        return false;
      });

      let itemToSave: HistoryItem;

      if (existingIndex !== -1) {
        // --- MERGE LOGIC ---
        const oldItem = prev[existingIndex];
        const oldParsed = parseVCardString(oldItem.vcard);

        // If we have new scan images, use them. If not (manual edit), keep old images.
        const mergedImages = scanImages && scanImages.length > 0 ? scanImages : oldItem.images;

        if (oldParsed.isValid) {
          const oldData = oldParsed.data;
          const mergedData = { ...newData };

          // Fill in gaps from OLD data (Enrichment)
          if (!mergedData.fn && oldData.fn) mergedData.fn = oldData.fn; // Keep name if new one is missing
          if (!mergedData.n && oldData.n) mergedData.n = oldData.n;
          if (!mergedData.title && oldData.title) mergedData.title = oldData.title;
          if (!mergedData.role && oldData.role) mergedData.role = oldData.role;
          if (!mergedData.org && oldData.org) mergedData.org = oldData.org;
          if (!mergedData.bday && oldData.bday) mergedData.bday = oldData.bday;
          if (!mergedData.note && oldData.note) mergedData.note = oldData.note;
          if (!mergedData.photo && oldData.photo) mergedData.photo = oldData.photo;

          // Merge Arrays (Emails, Phones, URLs)
          const mergeArrays = (newArr: any[] = [], oldArr: any[] = []) => {
            const result = [...newArr];
            oldArr.forEach(oldItem => {
              const exists = result.some(r => r.value === oldItem.value);
              if (!exists) result.push(oldItem);
            });
            return result;
          };

          mergedData.email = mergeArrays(mergedData.email, oldData.email);
          mergedData.tel = mergeArrays(mergedData.tel, oldData.tel);
          mergedData.url = mergeArrays(mergedData.url, oldData.url);

          if ((!mergedData.adr || mergedData.adr.length === 0) && oldData.adr) {
            mergedData.adr = oldData.adr;
          }

          const mergedString = generateVCardFromData(mergedData);

          itemToSave = {
            ...oldItem,
            timestamp: Date.now(),
            name: mergedData.fn || oldItem.name,
            org: mergedData.org || oldItem.org,
            vcard: mergedString,
            images: mergedImages
          };

          const newHistory = [...prev];
          newHistory.splice(existingIndex, 1);
          return [itemToSave, ...newHistory];
        }

        // Fallback if old parse failed
        itemToSave = {
          id: oldItem.id,
          timestamp: Date.now(),
          name: newFn || oldItem.name,
          org: newData.org || oldItem.org,
          vcard: str,
          images: mergedImages
        };
        const newHistory = [...prev];
        newHistory.splice(existingIndex, 1);
        return [itemToSave, ...newHistory];

      } else {
        // --- NEW ENTRY ---
        itemToSave = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          name: newFn || 'Unbekannt',
          org: newData.org,
          vcard: str,
          images: scanImages
        };
        return [itemToSave, ...prev].slice(0, 50);
      }
    });
  }, []);

  // --- SCAN QUEUE ---
  const { queue, addJob, removeJob } = useScanQueue(getKeyToUse(), lang, llmConfig, (vcard, images) => {
    // Background job completed
    addToHistory(vcard, undefined, images);
  });

  // Update current displayed images when loading form history or scanning
  const handleLoadHistoryItem = (item: HistoryItem) => {
    setVcardString(item.vcard);
    setCurrentImages(item.images);
  };

  const handleDownload = () => {
    if (parsedData.isValid) {
      // Save current state to history on download
      addToHistory(vcardString, parsedData, currentImages);
    }
    const filename = generateContactFilename(parsedData.data) + '.vcf';
    downloadVCard(vcardString, filename);
  };

  const handleManualSave = () => {
    if (parsedData.isValid) {
      addToHistory(vcardString, parsedData, currentImages);
    }
  };

  const handleOptimize = async (overrideInput?: string | any) => {
    const keyToUse = getKeyToUse();

    if (!keyToUse && !hasSystemKey) {
      setIsSettingsOpen(true);
      return;
    }

    setIsOptimizing(true);
    setError(null);
    setBackupVCard(vcardString);

    let inputToSend = vcardString;
    if (typeof overrideInput === 'string' && overrideInput.trim().length > 0) {
      inputToSend = overrideInput;
    }

    try {
      const corrected = await correctVCard(inputToSend, 'google', keyToUse, lang);

      const check = parseVCardString(corrected);
      const hasContent = check.data.fn || check.data.org;

      if (check.isValid && hasContent) {
        setVcardString(corrected);
        // Note: We don't pass images here as this is text-based optimization
        // If images were already associated with this contact, the addToHistory merge logic handles it
        addToHistory(corrected, check);
      } else {
        throw new Error("KI konnte keine gültigen Kontaktdaten extrahieren.");
      }

    } catch (e: any) {
      console.error(e);
      if (e.message === 'MISSING_KEY') {
        setIsSettingsOpen(true);
        setError(t.missingKey);
      } else {
        setError(e.message || "Fehler bei der KI-Verarbeitung.");
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleUndo = () => {
    if (backupVCard) {
      setVcardString(backupVCard);
      setBackupVCard(null);
    }
  };

  const handleOpenScan = () => {
    // Allow scan if Google key OR custom LLM is configured
    const hasGoogleKey = getKeyToUse() || hasSystemKey;
    const hasCustomLLM = llmConfig.provider === 'custom' && llmConfig.customBaseUrl && llmConfig.customModel;

    if (hasGoogleKey || hasCustomLLM) {
      setIsScanOpen(true);
    } else {
      setIsSettingsOpen(true);
      setError(t.configError);
    }
  };

  const handleOpenBatchUpload = () => {
    const hasGoogleKey = getKeyToUse() || hasSystemKey;
    const hasCustomLLM = llmConfig.provider === 'custom' && llmConfig.customBaseUrl && llmConfig.customModel;

    if (hasGoogleKey || hasCustomLLM) {
      setIsBatchUploadOpen(true);
    } else {
      setIsSettingsOpen(true);
      setError(t.configError);
    }
  };

  const handleBatchUploadFiles = async (files: File[]) => {
    // Pass File objects directly to queue (lazy loading)
    for (const file of files) {
      addJob(file, null);
    }
  };

  const handleImageDrop = (file: File) => {
    // Allow scan if Google key OR custom LLM is configured
    const hasGoogleKey = getKeyToUse() || hasSystemKey;
    const hasCustomLLM = llmConfig.provider === 'custom' && llmConfig.customBaseUrl && llmConfig.customModel;

    if (hasGoogleKey || hasCustomLLM) {
      setDroppedFile(file);
      setIsScanOpen(true);
    } else {
      setIsSettingsOpen(true);
      setError(t.configError);
    }
  };

  const handleAddSocialUrl = (url: string, platform: string) => {
    if (!url) return;
    const upperPlatform = platform.toUpperCase();
    let lines = vcardString.split(/\r\n|\r|\n/);
    let found = false;

    lines = lines.map(line => {
      const upperLine = line.toUpperCase();
      if (upperLine.startsWith('URL') && upperLine.includes(`TYPE=${upperPlatform}`)) {
        found = true;
        return `URL;CHARSET=utf-8;TYPE=${upperPlatform}:${url}`;
      }
      return line;
    });

    if (!found) {
      const endIdx = lines.findIndex(l => l.trim().toUpperCase() === 'END:VCARD');
      const newLine = `URL;CHARSET=utf-8;TYPE=${upperPlatform}:${url}`;
      if (endIdx !== -1) {
        lines.splice(endIdx, 0, newLine);
      } else {
        lines.push(newLine);
      }
    }

    setVcardString(lines.join('\n'));
  };

  const handleReset = () => {
    if (window.confirm(t.resetConfirm)) {
      setVcardString(DEFAULT_VCARD);
      setCurrentImages(undefined);
      setBackupVCard(null);
    }
  }

  const isAIReady = !!apiKey || hasSystemKey;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 relative">
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => { setIsSettingsOpen(false); setError(null); }}
        onSave={handleSaveSettings}
        apiKey={apiKey}
        lang={lang}
        setLang={setLang}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        errorMessage={error}
        llmProvider={llmConfig.provider}
        setLLMProvider={setProvider}
        customBaseUrl={llmConfig.customBaseUrl}
        customApiKey={llmConfig.customApiKey}
        customModel={llmConfig.customModel}
        openaiApiKey={llmConfig.openaiApiKey}
        openaiModel={llmConfig.openaiModel}
        setCustomConfig={setCustomConfig}
        onOllamaDefaults={setOllamaDefaults}
      />

      <BatchUploadModal
        isOpen={isBatchUploadOpen}
        onClose={() => setIsBatchUploadOpen(false)}
        onAddJobs={handleBatchUploadFiles}
        queue={queue}
        onRemoveJob={removeJob}
        lang={lang}
      />

      <ScanModal
        isOpen={isScanOpen}
        onClose={() => { setIsScanOpen(false); setDroppedFile(null); }}
        onScanComplete={() => { }}
        onAddToQueue={addJob}
        apiKey={getKeyToUse()}
        initialFile={droppedFile}
        lang={lang}
      />

      <QueueIndicator queue={queue} lang={lang} />

      <QRCodeModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        vcardString={vcardString}
      />

      <SocialSearchModal
        isOpen={isSocialSearchOpen}
        onClose={() => setIsSocialSearchOpen(false)}
        initialName={parsedData.data.fn || ''}
        initialOrg={parsedData.data.org || ''}
        onAddUrl={handleAddSocialUrl}
        initialPlatform={searchPlatform}
        lang={lang}
      />

      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onLoad={handleLoadHistoryItem}
        onDelete={(id) => setHistory(prev => prev.filter(i => i.id !== id))}
        onClear={() => setHistory([])}
        lang={lang}
      />

      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        initialTab={legalTab}
      />

      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <Contact size={24} />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">{t.appTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">

            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              title={t.history}
            >
              <History size={18} />
              {history.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </button>

            {installPrompt && (
              <button
                onClick={handleInstallApp}
                className="p-2 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors animate-pulse"
                title="App installieren"
              >
                <AppWindow size={18} />
              </button>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all border ${isAIReady
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                }`}
            >
              {isAIReady ? <UserCircle size={18} className="text-green-600 dark:text-green-500" /> : <Settings size={18} />}
              <span className="text-xs font-medium hidden md:inline">
                {t.settings}
              </span>
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

            <button
              onClick={handleOpenScan}
              className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors"
              title={t.scanTitle}
            >
              <Camera size={18} />
              <span className="hidden lg:inline text-sm">{t.scan}</span>
            </button>

            <button
              onClick={handleOpenBatchUpload}
              className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors"
              title={t.batchUpload}
            >
              <Upload size={18} />
              <span className="hidden lg:inline text-sm">{t.batchUpload}</span>
            </button>

            {parsedData.isValid ? (
              <div className="flex gap-1">
                {/* Actions moved to PreviewCard */}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg text-sm font-medium border border-amber-200 dark:border-amber-800">
                <AlertTriangle size={16} />
                <span className="hidden sm:inline">{t.invalid}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 flex items-start sm:items-center gap-3 animate-in slide-in-from-top-2 shadow-sm">
            <AlertTriangle size={20} className="shrink-0 mt-0.5 sm:mt-0" />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setIsSettingsOpen(true)} className="text-sm underline hover:text-red-900 dark:hover:text-red-200 ml-auto font-semibold whitespace-nowrap">
              {t.settings}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-180px)] min-h-[600px]">
          <div className="h-full flex flex-col gap-4">
            <Editor
              value={vcardString}
              onChange={setVcardString}
              onOptimize={handleOptimize}
              onUndo={handleUndo}
              canUndo={!!backupVCard}
              onReset={handleReset}
              isOptimizing={isOptimizing}
              onImageDrop={handleImageDrop}
              onClearImages={() => setCurrentImages(undefined)}
              lang={lang}
            />
          </div>

          <div className="h-full">
            <PreviewCard
              parsed={parsedData}
              onShowQR={() => setIsQROpen(true)}
              onSocialSearch={(platform) => {
                setSearchPlatform(platform || 'LINKEDIN');
                setIsSocialSearchOpen(true);
              }}
              onUpdate={setVcardString}
              lang={lang}
              images={currentImages}
              onSave={handleManualSave}
              onDownload={handleDownload}
            />
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 py-4 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <div>
            &copy; {__APP_VERSION__} {t.appTitle}
          </div>
          <div className="flex gap-4 sm:gap-6">
            <button onClick={() => { setLegalTab('imprint'); setIsLegalOpen(true); }} className="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">{t.impressum}</button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button onClick={() => { setLegalTab('privacy'); setIsLegalOpen(true); }} className="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">{t.privacy}</button>
          </div>

          <a
            href="https://buy.stripe.com/28E9ATf3n6pl7Wfcmt24000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#635BFF] hover:bg-[#5851E1] text-white px-4 py-2 rounded-full text-xs font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all ml-4 sm:ml-0"
          >
            <Heart size={14} fill="currentColor" />
            {t.support}
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;