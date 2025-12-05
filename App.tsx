import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { parseVCardString, generateVCardFromData, clean_number, generateContactFilename, downloadVCard, DEFAULT_VCARD, getTimestamp } from './utils/vcardUtils';
import { correctVCard, scanBusinessCard } from './services/aiService';
import { useLLMConfig } from './hooks/useLLMConfig';
import { useScanQueue } from './hooks/useScanQueue';
import { translations } from './utils/translations';
import { generateCSV, downloadCSV, parseCSV, csvToVCard } from './utils/csvUtils';
import { generateJSON, downloadJSON, restoreJSON } from './utils/jsonUtils';
import { generateBackupZip, restoreBackupZip, downloadZip } from './utils/zipUtils';
import { HistorySidebar } from './components/HistorySidebar';
import { SettingsSidebar } from './components/SettingsSidebar';
import { BatchUploadSidebar } from './components/BatchUploadSidebar';
import { EventModeModal } from './components/EventModeModal';
import { NotesSidebar } from './components/NotesSidebar';
import { ChatSidebar } from './components/ChatSidebar';
import { ScanSidebar } from './components/ScanSidebar';
import { QueueIndicator } from './components/QueueIndicator';
import { QRCodeSidebar } from './components/QRCodeSidebar';
import { SocialSearchSidebar } from './components/SocialSearchSidebar';
import { LegalSidebar } from './components/LegalSidebar';
import { HelpSidebar } from './components/HelpSidebar';
import { Editor } from './components/Editor';
import { Logo } from './components/Logo';
import { PreviewCard } from './components/PreviewCard';
import { ReloadPrompt } from './components/ReloadPrompt';
import { HistoryItem, VCardData, Language } from './types';
import { addHistoryItem, addHistoryItems, getHistory, getHistoryPaged, searchHistory, deleteHistoryItem, clearHistory, migrateFromLocalStorage, migrateBase64ToBlob, migrateKeywords, addNote, getNotes, getHistoryItem, getFailedScans, countHistory, countStreets, getHistoryItemImages } from './utils/db';

import { FailedScansSidebar } from './components/FailedScansSidebar';
import { QRScannerModal } from './components/QRScannerModal';
import { ingestStreets } from './utils/streetIngestion';
import { enrichAddress } from './utils/addressEnricher';
import {
  Upload, Camera, Download, RotateCcw, Save, FileText, Settings,
  MessageSquare, X, History, StickyNote, QrCode, AlertTriangle,
  Heart, UserCircle, AppWindow, Contact, Database, HelpCircle, Loader2
} from 'lucide-react';
import { convertPdfToImages } from './utils/pdfUtils';
import { Toaster, toast } from 'sonner';
import { useSmartStreetLoader } from './hooks/useSmartStreetLoader';
import { RegexDebugger } from './components/RegexDebugger';




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
  const [isFailedScansOpen, setIsFailedScansOpen] = useState(false);
  const [failedScansCount, setFailedScansCount] = useState(0);



  // Config State
  const [lang, setLang] = useState<Language>('de');
  const [isDarkMode, setIsDarkMode] = useState(true); // Default: Dark Mode
  const [ocrMethod, setOcrMethod] = useState<'auto' | 'tesseract' | 'gemini' | 'hybrid'>('auto'); // OCR Method: auto (offline-first), tesseract, gemini, or hybrid
  const [ocrRawText, setOcrRawText] = useState<string | undefined>(undefined); // Raw OCR text from Tesseract for parser field



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

  // Scan Queue (Batch Processing with auto-retry)
  const { queue, addJob, removeJob, clearErrors } = useScanQueue(
    getKeyToUse() || '',
    lang,
    llmConfig,
    ocrMethod,
    async (vcard, images, mode) => {
      setVcardString(vcard);
      setCurrentImages(images);

      // Auto-save to history on successful scan
      try {
        await addToHistory(vcard, undefined, images, mode);
      } catch (err) {
        console.error("Failed to save to history:", err);
        toast.error("Fehler beim Speichern im Verlauf: " + (err as Error).message);
      }

      // 1. Enrich Address (if Street DB is ready)
      let finalVCard = vcard;
      if (streetDbStatus === 'ready') {
        try {
          const parsed = parseVCardString(vcard);
          // Timeout for enrichment
          const enrichPromise = enrichAddress(parsed.data);
          const timeoutPromise = new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          );

          try {
            await Promise.race([enrichPromise, timeoutPromise]);
            if (parsed.data.adr && parsed.data.adr.length > 0) {
              finalVCard = generateVCardFromData(parsed.data); // Assuming generateVCardFromData is the correct function
              setVcardString(finalVCard);
            }
          } catch (timeoutError) {
            console.warn('Address enrichment timed out, using original vCard');
          }
        } catch (enrichError) {
          console.warn('Address enrichment failed:', enrichError);
        }
      }

      setVcardString(finalVCard);
      setCurrentImages(images);

      // Auto-save to history on successful scan
      try {
        await addToHistory(finalVCard, undefined, images, mode);
      } catch (err) {
        console.error("Failed to save to history:", err);
        toast.error("Fehler beim Speichern im Verlauf: " + (err as Error).message);
      }
    },
    setOcrRawText // Pass raw OCR text callback to populate parser field
  );

  const handleLoadHistoryItem = async (item: HistoryItem) => {
    setVcardString(item.vcard);

    // ✅ NEW: Lazy load images from DB
    const images = await getHistoryItemImages(item.id);

    // Convert Blob images to base64 strings if needed
    if (images && images.length > 0) {
      const stringImages = await Promise.all(
        images.map(async (img) => {
          if (typeof img === 'string') return img;
          // Convert Blob to base64
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(img);
          });
        })
      );
      setCurrentImages(stringImages);
    } else {
      setCurrentImages(undefined);
    }

    setCurrentHistoryId(item.id);
    setIsHistoryOpen(false);
  };

  const t = translations[lang];

  // Derived State
  const parsedData = useMemo(() => parseVCardString(vcardString), [vcardString]);

  // History State (Start empty, load async)
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyCount, setHistoryCount] = useState(0); // ✅ NEW: Total count in DB
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [notesCount, setNotesCount] = useState(0);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null); // Track currently loaded/saved item
  const [notesFilterId, setNotesFilterId] = useState<string | null>(null); // Filter for NotesSidebar
  const HISTORY_LIMIT = 50;



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

    const savedOcrMethod = localStorage.getItem('vcard_ocr_method');
    if (savedOcrMethod) setOcrMethod(savedOcrMethod as 'auto' | 'tesseract' | 'gemini' | 'hybrid');
  }, []);

  // Save Settings
  const handleSaveSettings = (newKey: string) => {
    // Save Google API key when manually entered
    setCustomConfig({ googleApiKey: newKey });
  };

  // Auto-save Lang, Dark Mode & Tesseract Test Mode
  useEffect(() => {
    localStorage.setItem('vcard_lang', lang);
    localStorage.setItem('vcard_dark_mode', JSON.stringify(isDarkMode));
    localStorage.setItem('vcard_ocr_method', ocrMethod);
  }, [lang, isDarkMode, ocrMethod]);




  // Street DB State
  const [streetDbStatus, setStreetDbStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [streetDbProgress, setStreetDbProgress] = useState(0);
  const [streetDbError, setStreetDbError] = useState<string | null>(null);

  const handleLoadStreetDb = useCallback(async () => {
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
  }, []);

  // Smart Loader
  useSmartStreetLoader({
    enabled: true,
    status: streetDbStatus,
    onLoad: handleLoadStreetDb
  });



  // Load History & Migrate on Mount
  useEffect(() => {
    const loadHistory = async () => {
      await migrateFromLocalStorage();
      await migrateBase64ToBlob();
      await migrateKeywords(); // Add search index
      const items = await getHistoryPaged(HISTORY_LIMIT, undefined, true);
      const count = await countHistory(); // ✅ NEW: Load total count
      setHistory(items);
      setHistoryCount(count); // ✅ NEW: Set total count
      setHasMoreHistory(items.length >= HISTORY_LIMIT);

      // Load notes count
      const notes = await getNotes();
      setNotesCount(notes.length);

      // Load failed scans count
      const failed = await getFailedScans();
      setFailedScansCount(failed.length);

      // Check Street DB status
      try {
        const streetCount = await countStreets();
        if (streetCount > 0) {
          setStreetDbStatus('ready');
        }
      } catch (e) {
        console.error("Failed to check street count", e);
      }
    };
    loadHistory();
  }, []);

  // Poll for failed scans count (simple way to keep it in sync when queue updates)
  useEffect(() => {
    const interval = setInterval(async () => {
      const failed = await getFailedScans();
      setFailedScansCount(failed.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadMoreHistory = async () => {
    if (!history.length) return;
    const lastItem = history[history.length - 1];
    const newItems = await getHistoryPaged(HISTORY_LIMIT, lastItem.timestamp, true);

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
      const items = await getHistoryPaged(HISTORY_LIMIT, undefined, true);
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
      const items = await getHistoryPaged(HISTORY_LIMIT, undefined, true);
      setHistory(items);
      setHasMoreHistory(items.length >= HISTORY_LIMIT);
      setHistoryCount(await countHistory()); // Update total count

      toast.success(translations[lang].qrScanSuccess.replace('vCard', `${count} Items`)); // Reuse success message or add new one
    } catch (e) {
      console.error(e);
      toast.error("Restore failed: " + (e as Error).message);
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

  const addToHistory = useCallback(async (str: string, parsed?: any, scanImages?: string[], mode?: 'vision' | 'hybrid'): Promise<{ status: 'saved' | 'duplicate' | 'error', savedVCard?: string }> => {
    console.log("addToHistory called", { strLength: str?.length, hasParsed: !!parsed, images: scanImages?.length, mode });

    const p = parsed || parseVCardString(str);
    if (!p.isValid) {
      console.error("addToHistory: Invalid vCard", str);
      return { status: 'error' };
    }

    const newData = p.data as VCardData;
    const newFn = newData.fn?.trim();
    const newPhones = newData.tel?.map(t => clean_number(t.value)) || [];

    let vcardToSave = str;

    // --- EVENT MODE INJECTION REMOVED ---
    // User requested to move to backlog.
    /*
    try {
      if (eventModeActive && eventName && eventName.trim().length > 0) {
        console.log("Injecting Event Tag:", eventName);
        if (!newData.categories) newData.categories = [];
        if (!newData.categories.includes(eventName)) {
          newData.categories.push(eventName);
          // Regenerate vCard string with new category
          vcardToSave = generateVCardFromData(newData);
        }
      }
    } catch (e) {
      console.error("Error injecting event tag:", e);
    }
    */

    // Get latest history from DB to ensure we check against current state
    const currentHistory = await getHistory();

    // 1. Check for exact string duplicate
    if (currentHistory.length > 0 && currentHistory[0].vcard === vcardToSave) {
      console.log("Exact duplicate detected - skipping save");
      // Optional: Notify user?
      // toast.info("Kontakt ist bereits der neueste Eintrag.");
      return { status: 'duplicate' };
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

        // Merge Categories
        if (oldData.categories) {
          if (!mergedData.categories) mergedData.categories = [];
          oldData.categories.forEach(c => {
            if (!mergedData.categories!.includes(c)) mergedData.categories!.push(c);
          });
        }

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
          vcard: vcardToSave,
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
        vcard: vcardToSave,
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

    // Refresh UI - Prepend new item to visible history instead of reloading all
    // Optimization: Don't store images in state
    const itemForState = { ...itemToSave };
    delete itemForState.images;
    setHistory(prev => [itemForState, ...prev.slice(0, HISTORY_LIMIT - 1)]);
    const newCount = await countHistory(); // ✅ NEW: Update total count
    setHistoryCount(newCount);
    setCurrentHistoryId(itemToSave.id);

    console.log("History updated successfully", { id: itemToSave.id, mode });
    return { status: 'saved', savedVCard: itemToSave.vcard };
  }, []);





  // ... queue ...

  // Bulk Enhance Handler
  const handleBulkEnhance = async (ids: string[]) => {
    if (ids.length === 0) return;

    toast.info(`${ids.length} Kontakte werden vorbereitet...`);

    let addedCount = 0;

    for (const id of ids) {
      // ✅ FIXED: Fetch images from DB as they are not in state anymore
      const images = await getHistoryItemImages(id);

      if (images && images.length > 0) {
        const processedImages = images.map((img, idx) => {
          if (img instanceof Blob) {
            return new File([img], `bulk_enhance_${id}_${idx}.jpg`, { type: img.type });
          }
          return img as string | File;
        });

        addJob(processedImages, 'vision');
        addedCount++;
      }
    }

    if (addedCount === 0) {
      toast.error("Keine der ausgewählten Kontakte haben Bilder zum Verbessern.");
      return;
    }

    toast.success(`${addedCount} Kontakte zur Warteschlange hinzugefügt.`);
    setIsHistoryOpen(false);
    setIsBatchUploadOpen(true);
  };

  // Update HistorySidebar props
  // <HistorySidebar
  //   ...
  //   onDelete={async (id) => { await deleteHistoryItem(id); setHistory(await getHistory()); }}
  //   onClear={async () => { await clearHistory(); setHistory([]); }}
  //   onBulkEnhance={handleBulkEnhance}
  // />

  const handleDownload = () => {
    if (parsedData.isValid) {
      // Save current state to history on download
      addToHistory(vcardString, parsedData, currentImages);
    }
    const filename = generateContactFilename(parsedData.data) + '.vcf';
    downloadVCard(vcardString, filename);
  };

  const handleManualSave = async () => {
    console.log("Manual Save triggered");
    if (parsedData.isValid) {
      const result = await addToHistory(vcardString, parsedData, currentImages);
      console.log("Manual Save result:", result);

      if (result.status === 'saved') {
        toast.success("Gespeichert!");
        // Update editor with the saved version (which includes injected tags)
        if (result.savedVCard && result.savedVCard !== vcardString) {
          setVcardString(result.savedVCard);
        }
      } else if (result.status === 'duplicate') {
        toast.info("Bereits vorhanden.");
      } else {
        toast.error("Fehler beim Speichern.");
      }
    } else {
      console.warn("Manual Save: Invalid Data");
      toast.error(t.invalid || "Ungültige Daten.");
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
    // Tesseract and Auto mode work without API key (offline-first)
    if (ocrMethod === 'tesseract' || ocrMethod === 'auto' || ocrMethod === 'hybrid') {
      setIsScanOpen(true);
      return;
    }

    // Gemini mode requires API key
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
    // Tesseract and Auto mode work without API key (offline-first)
    if (ocrMethod === 'tesseract' || ocrMethod === 'auto' || ocrMethod === 'hybrid') {
      setIsBatchUploadOpen(true);
      return;
    }

    // Gemini mode requires API key
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

  const handleAIEnhance = async () => {
    if (!currentImages || currentImages.length === 0) {
      toast.error('Keine Bilder vorhanden zum Verbessern.');
      return;
    }

    // Check for API key
    const apiKeyToUse = getKeyToUse();
    if (!apiKeyToUse && llmConfig.provider !== 'custom') {
      toast.error('API Key erforderlich für AI-Verbesserung. Bitte in den Einstellungen konfigurieren.');
      setIsSettingsOpen(true);
      return;
    }

    // Quick network connectivity check
    if (!navigator.onLine) {
      toast.error('Keine Internetverbindung. Bitte überprüfen Sie Ihre Netzwerkverbindung.');
      return;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      // Prepare images for AI
      const imageInputs = currentImages.map((img) => {
        const parts = img.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        return {
          mimeType: mime,
          base64: parts[1]
        };
      });

      console.log('[AI Enhance] Re-scanning with Gemini...');
      const enhancedVCard = await scanBusinessCard(
        imageInputs,
        llmConfig.provider,
        apiKeyToUse,
        lang,
        llmConfig,
        'vision'
      );

      setVcardString(enhancedVCard);
      setBackupVCard(vcardString); // Save current as backup for undo
      toast.success('✨ Mit AI verbessert!');
    } catch (err) {
      console.error('[AI Enhance] Error:', err);
      const errorMessage = (err as Error).message;
      setError('AI-Verbesserung fehlgeschlagen: ' + errorMessage);

      // Show user-friendly error with guidance
      if (errorMessage.includes('Netzwerk')) {
        toast.error('Netzwerkfehler. Prüfen Sie Ihre Internetverbindung oder verwenden Sie Tesseract OCR in den Einstellungen.');
      } else if (errorMessage.includes('API-Schlüssel')) {
        toast.error('API-Schlüssel Problem. Bitte prüfen Sie Ihre Einstellungen.');
      } else {
        toast.error('AI-Verbesserung fehlgeschlagen: ' + errorMessage);
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleImageDrop = (file: File) => {
    // Tesseract and Auto mode work without API key (offline-first)
    if (ocrMethod === 'tesseract' || ocrMethod === 'auto' || ocrMethod === 'hybrid') {
      setDroppedFile(file);
      setIsScanOpen(true);
      return;
    }

    // Gemini mode requires API key
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

  const [importProgress, setImportProgress] = useState<{ current: number; total: number; status?: string } | null>(null);

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
    toast.success(`${vcards.length} Kontakte erfolgreich importiert!`);
  };

  // --- WORKER SETUP ---
  const importExportWorker = useMemo(() => new Worker(new URL('./workers/importExport.worker.ts', import.meta.url), { type: 'module' }), []);

  const runWorkerJob = (type: string, payload: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const handler = (e: MessageEvent) => {
        if (e.data.id === id) {
          importExportWorker.removeEventListener('message', handler);
          if (e.data.type === 'success') {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        }
      };
      importExportWorker.addEventListener('message', handler);
      importExportWorker.postMessage({ type, payload, id });
    });
  };

  // --- EXPORT HANDLERS ---
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const items = await getHistory();
      const csv = await runWorkerJob('generateCSV', items);
      downloadCSV(csv, `kontakte_export_${getTimestamp()}.csv`);
      toast.success("CSV Export erfolgreich!");
    } catch (e) {
      console.error(e);
      toast.error("Export fehlgeschlagen: " + (e as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      const items = await getHistory();
      const json = await runWorkerJob('generateJSON', items);
      downloadJSON(json, `kontakte_backup_${getTimestamp()}.json`);
      toast.success("Backup erfolgreich erstellt!");
    } catch (e) {
      console.error(e);
      toast.error("Export fehlgeschlagen: " + (e as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportVCard = async () => {
    // vCard concatenation is fast enough on main thread usually, 
    // but for consistency we could move it. 
    // For now, let's keep it simple as it's just string join.
    // Actually, let's move it to worker if we want to be consistent.
    // But I didn't add it to worker yet.
    // Let's stick to main thread for simple join, or add to worker.
    // Worker has 'parseVCardFile' but not 'generateVCardFile'.
    // Let's keep main thread for now.
    const items = await getHistory();
    const allVcards = items.map(i => i.vcard).join('\n');
    downloadVCard(allVcards, `kontakte_all_${getTimestamp()}.vcf`);
  };

  // --- IMPORT HANDLERS ---
  const handleImportCSV = async (file: File) => {
    try {
      const text = await file.text();
      const vcards = await runWorkerJob('parseCSVFile', text);

      if (vcards.length > 0) {
        await handleImportGoogleContacts(vcards);
      } else {
        toast.info("Keine gültigen Kontakte in der CSV gefunden.");
      }
    } catch (e) {
      console.error(e);
      toast.error("CSV Import fehlgeschlagen: " + (e as Error).message);
    }
  };

  const handleImportJSON = async (file: File) => {
    await handleRestoreBackup(file);
  };

  const handleImportVCard = async (file: File) => {
    try {
      const text = await file.text();
      const rawVcards = await runWorkerJob('parseVCardFile', text);

      if (rawVcards.length > 0) {
        await handleImportGoogleContacts(rawVcards);
      } else {
        toast.info("Keine vCards in der Datei gefunden.");
      }
    } catch (e) {
      console.error(e);
      toast.error("vCard Import fehlgeschlagen: " + (e as Error).message);
    }
  };

  // --- ZIP BACKUP HANDLERS ---
  const handleBackupAll = async () => {
    try {
      setIsExporting(true);
      const items = await getHistory();
      // This is the heavy one!
      const blob = await runWorkerJob('generateBackupZip', items);
      downloadZip(blob, `kontakte_full_backup_${getTimestamp()}.zip`);
      toast.success("Vollständiges Backup erstellt!");
    } catch (e) {
      console.error(e);
      toast.error("Backup fehlgeschlagen: " + (e as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreZip = async (file: File) => {
    // Manually handle loading state since we can't easily reuse handleRestoreBackup's internal logic without refactoring
    // But we can reuse the setImportProgress if we expose it or just use a simple toast for now if complex.
    // Actually, App.tsx has importProgress state.

    // Let's just use the existing handleRestoreBackup if it supports zip? No, it expects JSON.
    // So we implement the logic here.

    // We need to access setImportProgress. It is defined in App.tsx?
    // Looking at previous context, yes.

    // Wait, the error said "Cannot find name 'setIsImporting'". 
    // Let's check if setIsImporting exists in App.tsx. 
    // Let's check the file content or just remove the loading state for now to be safe and use simple alerts/toasts.
    // OR better: use the existing `setImportProgress` which IS in App.tsx (based on previous edits).

    setImportProgress({ current: 0, total: 100, status: 'Backup wird analysiert...' });

    try {
      const count = await restoreBackupZip(file);
      setHistory(await getHistoryPaged(1, 50)); // Refresh
      toast.success(`${count} Kontakte erfolgreich aus Backup wiederhergestellt!`);
    } catch (e) {
      console.error(e);
      toast.error("Restore fehlgeschlagen: " + (e as Error).message);
    } finally {
      setImportProgress(null);
    }
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
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>{importProgress.status || 'Importiere...'}</span>
              <span>{importProgress.current} von {importProgress.total}</span>
            </div>
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
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
        onExportVCard={handleExportVCard}
        onImportCSV={handleImportCSV}
        onImportJSON={handleImportJSON}
        onImportVCard={handleImportVCard}
        onBackupAll={handleBackupAll}
        onRestoreZip={handleRestoreZip}
        isExporting={isExporting}
        clearHistory={clearHistory}
        ocrMethod={ocrMethod}
        setOcrMethod={setOcrMethod}
        concurrentScans={llmConfig.concurrentScans || 1}
        setConcurrentScans={(value) => setCustomConfig({ concurrentScans: value })}
      />

      <BatchUploadSidebar
        isOpen={isBatchUploadOpen}
        onClose={() => setIsBatchUploadOpen(false)}
        onAddJobs={handleBatchUploadFiles}
        queue={queue}
        onRemoveJob={removeJob}
        lang={lang}
      />

      <ScanSidebar
        isOpen={isScanOpen}
        onClose={() => {
          setIsScanOpen(false);
          setDroppedFile(null);
        }}
        onScanComplete={(vcard) => {
          setVcardString(vcard);
          setIsScanOpen(false);
        }}
        onAddToQueue={(front, back, mode) => {
          const images = [front];
          if (back) images.push(back);
          addJob(images, mode);
        }}
        apiKey={getKeyToUse() || ''}
        initialFile={droppedFile}
        lang={lang}
      />

      <QueueIndicator
        queue={queue}
        failedCount={failedScansCount}
        lang={lang}
        onOpenQueue={() => setIsBatchUploadOpen(true)}
        onClearErrors={clearErrors}
        onOpenFailedScans={() => setIsFailedScansOpen(true)}
      />

      <FailedScansSidebar
        isOpen={isFailedScansOpen}
        onClose={() => setIsFailedScansOpen(false)}
        onRetry={(images, mode) => {
          addJob(images, mode);
        }}
      />

      <QRCodeSidebar
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        vcardString={vcardString}
      />

      <SocialSearchSidebar
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
        historyCount={historyCount}
        hasMore={hasMoreHistory}
        onLoadMore={handleLoadMoreHistory}
        onLoad={handleLoadHistoryItem}
        onUpdateHistory={async () => {
          const items = await getHistoryPaged(history.length); // Reload current count
          const count = await countHistory();
          setHistory(items);
          setHistoryCount(count);
        }}
        onBulkEnhance={handleBulkEnhance}
        onDelete={async (id) => {
          await deleteHistoryItem(id);
          const items = await getHistoryPaged(history.length); // Reload current count
          const count = await countHistory();
          setHistory(items);
          setHistoryCount(count);
        }}
        onClear={async () => {
          await clearHistory();
          setHistory([]);
          setHistoryCount(0);
          setHasMoreHistory(false);
        }}
        onSearch={handleSearchHistory}
        onRestore={handleRestoreBackup}
        lang={lang}

      />



      <NotesSidebar
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        onSelectContact={(id) => {
          setIsNotesOpen(false);
          const contact = history.find(h => h.id === id);
          if (contact) {
            handleLoadHistoryItem(contact);
          }
        }}
        lang={lang}
      />



      <LegalSidebar
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        initialTab={legalTab}
      />


      <HelpSidebar
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
              toast.error('Der QR-Code enthält keine gültige vCard.');
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

          <div className="flex items-center gap-1 sm:gap-2">



            {/* 1. Scan */}
            <button
              onClick={handleOpenScan}
              className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 p-2 lg:px-4 lg:py-2 rounded-lg font-medium transition-colors"
              title={t.scanTitle}
            >
              <Camera size={18} />
              <span className="hidden lg:inline text-sm">{t.scan}</span>
            </button>

            {/* 2. Batch Upload */}
            <button
              onClick={handleOpenBatchUpload}
              className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 p-2 lg:px-4 lg:py-2 rounded-lg font-medium transition-colors"
              title={t.batchUpload}
            >
              <Upload size={18} />
              <span className="hidden lg:inline text-sm">{t.batchUpload}</span>
            </button>

            {/* 3. QR Scan */}
            <button
              onClick={() => setIsQRScannerOpen(true)}
              className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50 p-2 lg:px-4 lg:py-2 rounded-lg font-medium transition-colors"
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
              <StickyNote size={20} />
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

            <Toaster position="bottom-center" richColors />
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
              ocrRawText={ocrRawText}
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
              onAIEnhance={handleAIEnhance}
              onViewNotes={() => {
                if (currentHistoryId) {
                  setNotesFilterId(currentHistoryId);
                  setIsNotesOpen(true);
                } else {
                  // Fallback if no ID (e.g. unsaved manual entry)
                  toast.error(t.noteSaveFirst);
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

      {
        new URLSearchParams(window.location.search).get('debug_regex') === 'true' && (
          <RegexDebugger />
        )
      }
    </div>
  );
};

export default App;