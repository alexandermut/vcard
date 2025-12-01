import React, { useState, useEffect } from 'react';
import { List, LayoutGrid, Search, History, X, Download, Trash2, Image as ImageIcon, Upload, Contact, FileText, Merge, Users } from 'lucide-react';
import JSZip from 'jszip';
import { HistoryItem, Language } from '../types';
import { translations } from '../utils/translations';
import { generateCSV, downloadCSV } from '../utils/csvUtils';
import { generateJSON, downloadJSON } from '../utils/jsonUtils';
import { generateContactFilename, downloadVCard, parseVCardString, getTimestamp } from '../utils/vcardUtils';
import { combineImages } from '../utils/imageUtils';
import { useGoogleContactsAuth } from '../auth/useGoogleContactsAuth';
import { createGoogleContact } from '../services/googleContactsService';
import { mapVCardToGooglePerson } from '../utils/googleMapper';
import { DuplicateFinderModal } from './DuplicateFinderModal';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
  onSearch: (query: string) => void;
  onRestore: (file: File) => Promise<void>;
  lang: Language;
  onUpdateHistory: (history: HistoryItem[]) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen, onClose, history, onLoad, onDelete, onClear, onLoadMore, hasMore, onSearch, onRestore, lang, onUpdateHistory
}) => {
  const t = translations[lang];
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDuplicateFinder, setShowDuplicateFinder] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { token } = useGoogleContactsAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  const handleExportCSV = () => {
    const csv = generateCSV(history);
    downloadCSV(csv, `${getTimestamp()}_vcard_export.csv`);
  };

  const handleExportJSON = async () => {
    const json = await generateJSON(history);
    downloadJSON(json, `${getTimestamp()}_vcard_backup.json`);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await onRestore(file);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset
    }
  };

  const handleExportAllVCF = () => {
    const vcfContent = history.map(item => item.vcard).join('\n');
    downloadVCard(vcfContent, `${getTimestamp()}_vcard_backup_all.vcf`);
  };

  const handleDownloadSingle = (item: HistoryItem) => {
    const filename = generateContactFilename({ fn: item.name, org: item.org }) + '.vcf';
    downloadVCard(item.vcard, filename);
  };

  const handleSaveToGoogle = async (item: HistoryItem) => {
    if (!token) {
      alert("Bitte zuerst in den Einstellungen mit Google verbinden.");
      return;
    }

    if (!confirm(`Möchtest du "${item.name}" zu deinen Google Kontakten hinzufügen?`)) return;

    try {
      const vcardData = parseVCardString(item.vcard);
      const googlePerson = mapVCardToGooglePerson(vcardData.data);
      await createGoogleContact(token, googlePerson);
      alert(`Kontakt "${item.name}" erfolgreich gespeichert!`);
    } catch (e: any) {
      console.error("Failed to save contact", e);
      alert(`Fehler beim Speichern: ${e.message}`);
    }
  };

  const handleExportImages = async () => {
    const zip = new JSZip();
    const folder = zip.folder("scans");

    if (!folder) return;

    // Find items with images
    const itemsWithImages = history.filter(item => item.images && item.images.length > 0);

    if (itemsWithImages.length === 0) {
      alert("Keine Bilder zum Exportieren gefunden.");
      return;
    }

    for (const item of itemsWithImages) {
      if (!item.images) continue;

      const baseFilename = generateContactFilename({ fn: item.name, org: item.org });

      // Combine front and back if multiple
      try {
        const combinedBlob = await combineImages(item.images[0], item.images[1]);
        folder.file(`${baseFilename}.jpg`, combinedBlob);
      } catch (e) {
        console.error("Failed to combine images for", item.name, e);
      }
    }

    zip.generateAsync({ type: "blob" }).then((content) => {
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${getTimestamp()}_vcard_scans.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Helper for highlighting search terms
  const HighlightText = ({ text, query }: { text: string | undefined, query: string }) => {
    if (!text) return null;
    if (!query.trim()) return <>{text}</>;

    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-slate-900 dark:text-slate-100 rounded px-0.5">{part}</span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <>
      <DuplicateFinderModal
        isOpen={showDuplicateFinder}
        onClose={() => setShowDuplicateFinder(false)}
        history={history}
        onUpdateHistory={onUpdateHistory}
      />

      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      <div className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-white dark:bg-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold">
            <History size={20} className="text-blue-600 dark:text-blue-400" />
            <h3>{t.historyTitle} ({history.length})</h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                title="Liste"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                title="Raster"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-500 ml-2">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 pb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={t.searchPlaceholder || "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-center">
              <History size={48} className="mb-4 opacity-20" />
              <p>{t.noHistory}</p>
              <p className="text-xs mt-2">{t.noHistoryHint}</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => { onLoad(item); onClose(); }}
                  className={`group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer relative overflow-hidden ${viewMode === 'grid' ? 'flex flex-col h-40' : 'p-3'}`}
                >
                  {viewMode === 'grid' ? (
                    // GRID ITEM
                    <>
                      <div className="h-24 bg-slate-100 dark:bg-slate-800 w-full relative overflow-hidden">
                        {item.images && item.images.length > 0 ? (
                          <img src={item.images[0]} alt="Scan" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600 text-2xl font-bold">
                            {getInitials(item.name || '?')}
                          </div>
                        )}
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadSingle(item); }}
                            className="p-1.5 bg-white/90 text-slate-700 rounded-full hover:bg-blue-500 hover:text-white transition-colors"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSaveToGoogle(item); }}
                            className="p-1.5 bg-white/90 text-slate-700 rounded-full hover:bg-green-500 hover:text-white transition-colors"
                            title="In Google Kontakte speichern"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                            className="p-1.5 bg-white/90 text-slate-700 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="p-2 flex-1 flex flex-col justify-center">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 text-xs truncate" title={item.name}>
                          <HighlightText text={item.name || 'Unbekannt'} query={searchQuery} />
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate" title={item.org}>
                          <HighlightText text={item.org} query={searchQuery} />
                        </p>
                      </div>
                    </>
                  ) : (
                    // LIST ITEM
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="overflow-hidden mr-2">
                          <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                            <HighlightText text={item.name || 'Unbekannt'} query={searchQuery} />
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            <HighlightText text={item.org} query={searchQuery} />
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {item.images && item.images.length > 0 && (
                            <div className="p-1 text-slate-400" title="Enthält Bild">
                              <ImageIcon size={14} />
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadSingle(item); }}
                            className="text-slate-400 hover:text-blue-500 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="VCF herunterladen"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSaveToGoogle(item); }}
                            className="text-slate-400 hover:text-green-600 p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                            title="In Google Kontakte speichern"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                            className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Löschen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
                          <Upload size={12} /> {t.load}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {history.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">

            {/* Duplicate Finder Button */}
            <button
              onClick={() => setShowDuplicateFinder(true)}
              className="w-full py-2 px-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-xs font-bold text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Merge size={14} /> Dubletten suchen & bereinigen
            </button>

            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={handleExportAllVCF}
                className="flex flex-col items-center justify-center gap-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-[10px] font-medium transition-colors"
              >
                <Contact size={16} />
                {t.vcfBackup}
              </button>
              <button
                onClick={handleExportCSV}
                className="flex flex-col items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-[10px] font-medium transition-colors shadow-sm"
              >
                <FileText size={16} />
                {t.csvExport}
              </button>
              <button
                onClick={handleExportJSON}
                className="flex flex-col items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-[10px] font-medium transition-colors shadow-sm"
              >
                <FileText size={16} />
                {t.jsonExport}
              </button>
              <button
                onClick={handleExportImages}
                className="flex flex-col items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-[10px] font-medium transition-colors shadow-sm"
              >
                <ImageIcon size={16} />
                {t.imgExport}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={handleRestoreClick}
                className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 py-2 rounded-lg text-xs font-medium transition-colors"
                title={t.restoreBackup || "Restore Backup"}
              >
                <Upload size={14} />
                <span className="truncate">{t.restoreBackup || "Restore"}</span>
              </button>

              <button
                onClick={() => { if (window.confirm(t.confirmClear)) onClear(); }}
                className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 py-2 rounded-lg text-xs transition-colors"
                title={t.clearHistory}
              >
                <Trash2 size={14} />
                <span className="truncate">{t.clearHistory}</span>
              </button>
            </div>
          </div>
        )}

        {hasMore && (
          <button
            onClick={onLoadMore}
            className="w-full mt-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          >
            {t.loadMore || 'Load More'}
          </button>
        )}
      </div>
    </>
  );
};