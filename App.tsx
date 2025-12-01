import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { parseVCardString, generateVCardFromData, clean_number, generateContactFilename, downloadVCard, DEFAULT_VCARD } from './utils/vcardUtils';
import { correctVCard } from './services/aiService';
import { useLLMConfig } from './hooks/useLLMConfig';
import { useScanQueue } from './hooks/useScanQueue';
import { translations } from './utils/translations';
import { generateCSV, downloadCSV } from './utils/csvUtils';
import { generateJSON, downloadJSON, restoreJSON } from './utils/jsonUtils';
import { HistorySidebar } from './components/HistorySidebar';
import { SettingsSidebar } from './components/SettingsSidebar';
import { BatchUploadModal } from './components/BatchUploadModal';
import { NotesSidebar } from './components/NotesSidebar';
import { ChatSidebar } from './components/ChatSidebar';
import { ScanModal } from './components/ScanModal';
import { QueueIndicator } from './components/QueueIndicator';
import { QRCodeModal } from './components/QRCodeModal';
import { SocialSearchModal } from './components/SocialSearchModal';
import { LegalModal } from './components/LegalModal';
import { HelpModal } from './components/HelpModal';
import { Editor } from './components/Editor';
import { Logo } from './components/Logo';
import { PreviewCard } from './components/PreviewCard';
import { ReloadPrompt } from './components/ReloadPrompt';
import { HistoryItem, VCardData, Language } from './types';
import { addHistoryItem, addHistoryItems, getHistory, getHistoryPaged, searchHistory, deleteHistoryItem, clearHistory, migrateFromLocalStorage, migrateBase64ToBlob, migrateKeywords, addNote, getNotes, getHistoryItem } from './utils/db';
import { ChatModal } from './components/ChatModal';
import { NotesModal } from './components/NotesModal';
import { QRScannerModal } from './components/QRScannerModal';
import { ingestStreets } from './utils/streetIngestion';
import { enrichAddress } from './utils/addressEnricher';
import {
  Upload, Camera, Download, RotateCcw, Save, FileText, Settings,
  MessageSquare, X, History, StickyNote, QrCode, AlertTriangle,
  Heart, UserCircle, AppWindow, Contact, Database, HelpCircle, Loader2
} from 'lucide-react';
import { convertPdfToImages } from './utils/pdfUtils';



const App: React.FC = () => {
  // --- STATE ---
  const [vcardString, setVcardString] = useState<string>(DEFAULT_VCARD);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImages, setCurrentImages] = useState<string[] | undefined>(undefined);
  const [backupVCard, setBackupVCard] = useState<string | null>(null);

  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isSocialSearchOpen, setIsSocialSearchOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'imprint' | 'privacy'>('imprint');
  const [searchPlatform, setSearchPlatform] = useState<string>('LINKEDIN');
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Config State
  const [lang, setLang] = useState<Language>('de');
  const [isDarkMode, setIsDarkMode] = useState(true); // Default: Dark Mode



  // Hooks
  const {
    apiKey,
    llmConfig,
    setProvider,
    setCustomConfig,
    setOllamaDefaults,
    getKeyToUse,
    hasSystemKey
  } = useLLMConfig();

  const { queue, addJob, removeJob, clearErrors } = useScanQueue(
    getKeyToUse() || '',
    lang,
    llmConfig,
    async (vcard, images, mode) => {
      // 1. Enrich Address (if Street DB is ready)
      let finalVCard = vcard;
      if (streetDbStatus === 'ready') {
        try {
          const parsed = parseVCardString(vcard);
          const enrichedData = await enrichAddress(parsed.data);
          finalVCard = generateVCardFromData(enrichedData);
        } catch (e) {
          console.warn("Address enrichment failed", e);
        }
      }

      setVcardString(finalVCard);
      setCurrentImages(images);

      // Auto-save to history on successful scan
      try {
        await addToHistory(finalVCard, undefined, images, mode);
      } catch (err) {
        console.error("Failed to save to history:", err);
        alert("Fehler beim Speichern im Verlauf: " + (err as Error).message);
      }
    }
  );

  const handleLoadHistoryItem = (item: HistoryItem) => {
    setVcardString(item.vcard);
    setCurrentImages(item.images);
    setCurrentHistoryId(item.id);
    setIsHistoryOpen(false);
  };

  const t = translations[lang];

  // Derived State
  const parsedData = useMemo(() => parseVCardString(vcardString), [vcardString]);

  // History State (Start empty, load async)
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [notesCount, setNotesCount] = useState(0);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null); // Track currently loaded/saved item
  const [notesFilterId, setNotesFilterId] = useState<string | null>(null); // Filter for NotesSidebar
  const HISTORY_LIMIT = 20;



  // Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load Settings from LocalStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('vcard_lang') as Language;
    if (savedLang) setLang(savedLang);

    const savedDark = localStorage.getItem('vcard_dark_mode');
    if (savedDark) setIsDarkMode(JSON.parse(savedDark));
  }, []);

  // Save Settings
  const handleSaveSettings = (newKey: string) => {
    // Save Google API key when manually entered
    setCustomConfig({ googleApiKey: newKey });
  };

  // Auto-save Lang & Dark Mode
  useEffect(() => {
    localStorage.setItem('vcard_lang', lang);
    localStorage.setItem('vcard_dark_mode', JSON.stringify(isDarkMode));
  }, [lang, isDarkMode]);


  // Street DB State
  const [streetDbStatus, setStreetDbStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [streetDbProgress, setStreetDbProgress] = useState(0);
  const [streetDbError, setStreetDbError] = useState<string | null>(null);

  const handleLoadStreetDb = async () => {
    try {
      setStreetDbStatus('loading');
      setStreetDbError(null);
      await ingestStreets((progress, msg) => {
        setStreetDbProgress(progress);
      });
      setStreetDbStatus('ready');
    } catch (e) {
      console.error("Street DB load failed", e);
      setStreetDbStatus('error');
      setStreetDbError((e as Error).message || "Unbekannter Fehler");
    }
  };



  // Load History & Migrate on Mount
  useEffect(() => {
    const loadHistory = async () => {
      await migrateFromLocalStorage();
      await migrateBase64ToBlob(); // Optimize storage
      await migrateKeywords(); // Add search index
      const items = await getHistoryPaged(HISTORY_LIMIT);
      setHistory(items);
      setHasMoreHistory(items.length >= HISTORY_LIMIT);

      // Load notes count
      const notes = await getNotes();
      setNotesCount(notes.length);
    };
    loadHistory();
  }, []);

  const handleLoadMoreHistory = async () => {
    if (!history.length) return;
    const lastItem = history[history.length - 1];
    const newItems = await getHistoryPaged(HISTORY_LIMIT, lastItem.timestamp);

    if (newItems.length > 0) {
      setHistory(prev => [...prev, ...newItems]);
      if (newItems.length < HISTORY_LIMIT) {
        setHasMoreHistory(false);
      }
    } else {
      setHasMoreHistory(false);
    }
  };

  const handleSearchHistory = async (query: string) => {
    if (!query.trim()) {
      // Reset to normal paged view
      const items = await getHistoryPaged(HISTORY_LIMIT);
      setHistory(items);
      setHasMoreHistory(items.length >= HISTORY_LIMIT);
      return;
    }

    const results = await searchHistory(query);
    setHistory(results);
    setHasMoreHistory(false); // Search results are not paginated for now
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Check for PDFs
      const processedFiles: File[] = [];

      for (const file of files) {
        if (file.type === 'application/pdf') {
          try {
            const blobs = await convertPdfToImages(file);
            for (let i = 0; i < blobs.length; i++) {
              processedFiles.push(new File([blobs[i]], `${file.name}_page_${i + 1}.jpg`, { type: 'image/jpeg' }));
            }
          } catch (err) {
            console.error("PDF conversion failed", err);
          }
        } else {
          processedFiles.push(file);
        }
      }

      if (processedFiles.length > 1) {
        // Batch mode
        setDroppedFile(null); // Reset single file

        // Open batch modal and add jobs
        setIsBatchUploadOpen(true);

        // We need to group them properly. 
        // If they came from a PDF, they are pages of ONE job.
        // If they were multiple images, they are MULTIPLE jobs (currently).
        // But handleDrop logic above flattened everything into processedFiles.
        // We lost the grouping info!

        // REFACTOR: We should pass the grouping info.
        // But for now, let's assume if it was a PDF, we want to group them.
        // The loop above flattened it.

        // Let's change the loop to preserve grouping.
        // Actually, handleBatchUploadFiles expects File[][].

        const jobs: File[][] = [];

        // Re-process to preserve structure
        for (const file of files) {
          if (file.type === 'application/pdf') {
            try {
              const blobs = await convertPdfToImages(file);
              const pdfPages: File[] = [];
              for (let i = 0; i < blobs.length; i++) {
                pdfPages.push(new File([blobs[i]], `${file.name}_page_${i + 1}.jpg`, { type: 'image/jpeg' }));
              }
              if (pdfPages.length > 0) jobs.push(pdfPages);
            } catch (e) {
              console.error(e);
            }
          } else {
            jobs.push([file]);
          }
        }

        handleBatchUploadFiles(jobs);
      } else if (processedFiles.length === 1) {
        // Single file
        setDroppedFile(processedFiles[0]);
        // If it was a single PDF page, processedFiles[0] is it.
        // But if it was a PDF, we might want to open ScanModal with it?
        // ScanModal is opened via useEffect on droppedFile.
        setIsScanOpen(true);
      }
    }
  }, []);

  const handleRestoreBackup = async (file: File) => {
    try {
      const text = await file.text();
      const count = await restoreJSON(text);

      // Reload history
      const items = await getHistoryPaged(HISTORY_LIMIT);
      setHistory(items);
      setHasMoreHistory(items.length >= HISTORY_LIMIT);

      alert(translations[lang].qrScanSuccess.replace('vCard', `${count} Items`)); // Reuse success message or add new one
    } catch (e) {
      console.error(e);
      alert("Restore failed: " + (e as Error).message);
    }
  };

  // ... theme/lang effects ...

  // Remove old localStorage history effect
  // useEffect(() => {
  //   try {
  //     localStorage.setItem('vcard_history', JSON.stringify(history));
  //   } catch (e) { ... }
  // }, [history]);

  // ...

  // Smart Add To History (Merges Duplicates)
  const addToHistory = useCallback(async (str: string, parsed?: any, scanImages?: string[], mode?: 'vision' | 'hybrid') => {
    console.log("addToHistory called", { strLength: str?.length, hasParsed: !!parsed, images: scanImages?.length, mode });

    const p = parsed || parseVCardString(str);
    if (!p.isValid) {
      console.error("addToHistory: Invalid vCard", str);
      return;
    }

    const newData = p.data as VCardData;
    const newFn = newData.fn?.trim();
    const newPhones = newData.tel?.map(t => clean_number(t.value)) || [];

    // Get latest history from DB to ensure we check against current state
    const currentHistory = await getHistory();

    // 1. Check for exact string duplicate
    if (currentHistory.length > 0 && currentHistory[0].vcard === str) {
      console.log("Exact duplicate detected - skipping save");
      // Optional: Notify user?
      // alert("Kontakt ist bereits der neueste Eintrag.");
      return;
    }

    // 2. Search for semantic duplicate
    const existingIndex = currentHistory.findIndex(item => {
      if (newFn && item.name?.trim().toLowerCase() === newFn.toLowerCase()) return true;
      if (newPhones.length > 0) {
        const oldParsed = parseVCardString(item.vcard);
        const oldPhones = oldParsed.data.tel?.map(t => clean_number(t.value)) || [];
        const hasCommonPhone = newPhones.some(np => np.length > 6 && oldPhones.includes(np));
        if (hasCommonPhone) return true;
      }
      return false;
    });

    let itemToSave: HistoryItem;

    if (existingIndex !== -1) {
      // --- MERGE LOGIC ---
      const oldItem = currentHistory[existingIndex];
      const oldParsed = parseVCardString(oldItem.vcard);
      const mergedImages = scanImages && scanImages.length > 0 ? scanImages : oldItem.images;

      if (oldParsed.isValid) {
        const oldData = oldParsed.data;
        const mergedData = { ...newData };

        if (!mergedData.fn && oldData.fn) mergedData.fn = oldData.fn;
        if (!mergedData.n && oldData.n) mergedData.n = oldData.n;
        if (!mergedData.title && oldData.title) mergedData.title = oldData.title;
        if (!mergedData.role && oldData.role) mergedData.role = oldData.role;
        if (!mergedData.org && oldData.org) mergedData.org = oldData.org;
        if (!mergedData.bday && oldData.bday) mergedData.bday = oldData.bday;
        if (!mergedData.note && oldData.note) mergedData.note = oldData.note;
        if (!mergedData.photo && oldData.photo) mergedData.photo = oldData.photo;

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
      } else {
        // Fallback
        itemToSave = {
          id: oldItem.id,
          timestamp: Date.now(),
          name: newFn || oldItem.name,
          org: newData.org || oldItem.org,
          vcard: str,
          images: mergedImages
        };
      }
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
    }

    // Save to DB
    await addHistoryItem(itemToSave);

    // Better: We can check if 'parsed' data has a note.
    const noteContent = newData.note;

    console.log("Checking for Note Extraction:", { mode, hasNote: !!noteContent, noteLength: noteContent?.length });

    // If Hybrid Mode OR note is substantial, save it
    if ((mode === 'hybrid' && noteContent) || (noteContent && noteContent.length > 5)) {
      console.log("Extracting Note...", { content: noteContent });
      // Create a separate note entry
      await addNote({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        content: noteContent,
        contactId: itemToSave.id,
        contactName: itemToSave.name,
        company: itemToSave.org, // Save company name
        location: newData.adr?.[0]?.value.city // Try to grab city as location
      });
      console.log("Note extracted and saved.");

      // Update count
      const notes = await getNotes();
      setNotesCount(notes.length);
    }

    // Refresh UI
    const updatedHistory = await getHistory();
    setHistory(updatedHistory);
    setCurrentHistoryId(itemToSave.id);

    console.log("History updated successfully", { id: itemToSave.id, mode });

  }, []);





  // ... queue ...

  // Update HistorySidebar props
  // <HistorySidebar
  //   ...
  //   onDelete={async (id) => { await deleteHistoryItem(id); setHistory(await getHistory()); }}
  //   onClear={async () => { await clearHistory(); setHistory([]); }}
  // />

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

  const handleBatchUploadFiles = async (jobs: File[][], mode: 'vision' | 'hybrid' = 'vision') => {
    // Pass File arrays directly to queue (lazy loading)
    for (const jobFiles of jobs) {
      addJob(jobFiles, mode);
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
    setVcardString('');
    setCurrentImages(undefined);
    setCurrentHistoryId(null);
    setBackupVCard(null);
  };

  const isAIReady = !!apiKey || hasSystemKey;

  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  const handleImportGoogleContacts = async (vcards: string[]) => {
    if (vcards.length === 0) return;

    setIsSettingsOpen(false);
    setImportProgress({ current: 0, total: vcards.length });

    const CHUNK_SIZE = 500;
    const timestamp = Date.now();

    // Process in chunks to keep UI responsive and show progress
    for (let i = 0; i < vcards.length; i += CHUNK_SIZE) {
      const chunk = vcards.slice(i, i + CHUNK_SIZE);
      const newItems: HistoryItem[] = [];

      chunk.forEach((vcard, idx) => {
        const p = parseVCardString(vcard);
        if (p.isValid) {
          newItems.push({
            id: crypto.randomUUID(),
            timestamp: timestamp + i + idx, // Ensure unique order
            name: p.data.fn || 'Unbekannt',
            org: p.data.org,
            vcard: vcard,
            images: []
          });
        }
      });

      if (newItems.length > 0) {
        await addHistoryItems(newItems);
      }

      // Update progress
      setImportProgress({ current: Math.min(i + CHUNK_SIZE, vcards.length), total: vcards.length });

      // Yield to UI loop
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Refresh UI
    const items = await getHistoryPaged(HISTORY_LIMIT);
    setHistory(items);
    setHasMoreHistory(true);

    // Small delay to show 100%
    await new Promise(resolve => setTimeout(resolve, 500));
    setImportProgress(null);
    alert(`${vcards.length} Kontakte erfolgreich importiert!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 relative overflow-x-hidden">
      {/* Import Progress Overlay */}
      {importProgress && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center border border-slate-200 dark:border-slate-800">
            <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Importiere Kontakte...</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Bitte warten, dies kann einen Moment dauern.
            </p>

            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 mb-2 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {importProgress.current} von {importProgress.total}
            </p>
          </div>
        </div>
      )}

      <SettingsSidebar
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        apiKey={apiKey}
        lang={lang}
        setLang={setLang}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        errorMessage={error}
        llmProvider={llmConfig.provider}
        setLLMProvider={setProvider}
        customBaseUrl={llmConfig.customBaseUrl || ''}
        customApiKey={llmConfig.customApiKey || ''}
        customModel={llmConfig.customModel || ''}
        openaiApiKey={llmConfig.openaiApiKey || ''}
        openaiModel={llmConfig.openaiModel || ''}
        setCustomConfig={setCustomConfig}
        onOllamaDefaults={setOllamaDefaults}

        streetDbStatus={streetDbStatus}
        streetDbProgress={streetDbProgress}
        streetDbError={streetDbError}
        onLoadStreetDb={handleLoadStreetDb}
        onImportGoogleContacts={handleImportGoogleContacts}
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
        onScanComplete={(vcard) => {
          setVcardString(vcard);
          addToHistory(vcard);
        }}
        onAddToQueue={(front, back, mode) => {
          const images = [front];
          if (back) images.push(back);
          addJob(images, mode);
        }}
        apiKey={getKeyToUse()}
        initialFile={droppedFile}
        lang={lang}
      />

      <QueueIndicator
        queue={queue}
        lang={lang}
        onOpenQueue={() => setIsBatchUploadOpen(true)}
        onClearErrors={clearErrors}
      />

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
        onDelete={async (id) => {
          await deleteHistoryItem(id);
          // Reload first page to keep consistent
          const items = await getHistoryPaged(history.length); // Reload current count
          setHistory(items);
        }}
        onClear={async () => {
          await clearHistory();
          setHistory([]);
          setHasMoreHistory(false);
        }}
        onLoadMore={handleLoadMoreHistory}
        hasMore={hasMoreHistory}
        onSearch={handleSearchHistory}
        onRestore={handleRestoreBackup}
        lang={lang}
      />

      <NotesSidebar
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        onSelectContact={(id) => {
          setIsNotesOpen(false);
          // Find contact and open it
          const contact = history.find(h => h.id === id);
          if (contact) {
            // We need a way to open preview for a specific ID.
            // For now, just load it into editor? Or maybe we need a PreviewSidebar too?
            // The user didn't ask for PreviewSidebar.
            // Let's just load it.
            handleLoadHistoryItem(contact);
          }
        }}
        lang={lang}
      />

      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        initialTab={legalTab}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        lang={lang}
      />

      <ChatSidebar
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        history={history}
        apiKey={getKeyToUse()}
        llmConfig={llmConfig}
        lang={lang}
      />

      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={async (data) => {
          setIsQRScannerOpen(false);

          // Check if it's a URL to a vCard
          const isUrl = data.trim().match(/^https?:\/\//i);

          if (isUrl) {
            // Open URL in new tab (avoids CORS issues)
            const userChoice = window.confirm(
              'Der QR-Code enthält einen Link:\n\n' + data + '\n\nMöchtest du diesen Link in einem neuen Tab öffnen? (Die vCard kannst du dann herunterladen und hier hochladen.)'
            );

            if (userChoice) {
              window.open(data, '_blank', 'noopener,noreferrer');
            }
          } else {
            // Direct vCard content
            const parsed = parseVCardString(data);
            if (parsed.isValid) {
              setVcardString(data);
              addToHistory(data);
            } else {
              console.warn('QR Code scanned but invalid vCard format');
              alert('Der QR-Code enthält keine gültige vCard.');
            }
          }
        }}
        lang={lang}
      />

      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 fixed top-0 left-0 right-0 z-30 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Logo removed as per user request (space constraints) */}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">

            {/* 1. Scan */}
            <button
              onClick={handleOpenScan}
              className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors"
              title={t.scanTitle}
            >
              <Camera size={18} />
              <span className="hidden lg:inline text-sm">{t.scan}</span>
            </button>

            {/* 2. Batch Upload */}
            <button
              onClick={handleOpenBatchUpload}
              className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors"
              title={t.batchUpload}
            >
              <Upload size={18} />
              <span className="hidden lg:inline text-sm">{t.batchUpload}</span>
            </button>

            {/* 3. QR Scan */}
            <button
              onClick={() => setIsQRScannerOpen(true)}
              className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors"
              title="QR Code scannen"
            >
              <QrCode size={18} />
              <span className="hidden lg:inline text-sm">QR Scan</span>
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

            {/* 4. History */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative group"
              title={t.history}
            >
              <History size={20} />
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {t.history}
              </span>
            </button>

            {/* 5. Notes */}
            <button
              onClick={() => { setNotesFilterId(null); setIsNotesOpen(true); }}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative group"
              title={t.notes}
            >
              <div className="relative">
                <StickyNote size={20} />
                {notesCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] font-bold px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center">
                    {notesCount}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {t.notes}
              </span>
            </button>

            {/* 6. Chat */}
            <button
              onClick={() => setIsChatOpen(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative group"
              title="Chat"
            >
              <MessageSquare size={20} />
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Chat
              </span>
            </button>


            {/* 7. Settings */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative group"
              title={t.settings}
            >
              <Settings size={20} />
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {t.settings}
              </span>
            </button>

            {/* 8. Help */}
            <button
              onClick={() => setIsHelpOpen(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative group"
              title={t.helpTitle || "Help"}
            >
              <HelpCircle size={20} />
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {t.helpTitle || "Help"}
              </span>
            </button>




            {parsedData.isValid ? (
              <div className="flex gap-1">
                {/* Actions moved to PreviewCard */}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg text-sm font-medium border border-amber-200 dark:border-amber-800 ml-2">
                <AlertTriangle size={16} />
                <span className="hidden sm:inline">{t.invalid}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-20 pb-8 flex flex-col">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 flex items-start sm:items-center gap-3 animate-in slide-in-from-top-2 shadow-sm shrink-0">
            <AlertTriangle size={20} className="shrink-0 mt-0.5 sm:mt-0" />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setIsSettingsOpen(true)} className="text-sm underline hover:text-red-900 dark:hover:text-red-200 ml-auto font-semibold whitespace-nowrap">
              {t.settings}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:h-[calc(100vh-180px)] lg:min-h-[500px] min-h-[600px] flex-1">
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
              onViewNotes={() => {
                if (currentHistoryId) {
                  setNotesFilterId(currentHistoryId);
                  setIsNotesOpen(true);
                } else {
                  // Fallback if no ID (e.g. unsaved manual entry)
                  // Maybe just open notes without filter?
                  setNotesFilterId(null);
                  setIsNotesOpen(true);
                }
              }}
            />
          </div>
        </div>
      </main>

      <footer className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 py-3 transition-colors duration-200 mt-auto shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4">

          {/* Top Row: Version & Links */}
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 order-2 md:order-1">
            <Logo variant="full" height={24} className="text-slate-900 dark:text-white" />
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>&copy; {__APP_VERSION__}</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <a href="impressum.html" className="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">{t.impressum}</a>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <a href="datenschutz.html" className="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">{t.privacy}</a>
          </div>

          {/* Bottom Row: Actions */}
          <div className="flex items-center gap-3 order-1 md:order-2">

            <a
              href="https://buy.stripe.com/28E9ATf3n6pl7Wfcmt24000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#635BFF] hover:bg-[#5851E1] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <Heart size={12} fill="currentColor" />
              {t.support}
            </a>
          </div>
        </div>
      </footer>
      <ReloadPrompt />

    </div>
  );
};

export default App;