import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, AlertTriangle, ArrowLeft, ArrowRight, User, Building2, Phone, Mail, Globe, MapPin, Cake, StickyNote, Award, Search, ExternalLink, Linkedin, Facebook, Instagram, Twitter, Github, Youtube, Music, Merge } from 'lucide-react';
import { HistoryItem, VCardData } from '../types';
import { findDuplicates, mergeContacts, DuplicateGroup } from '../utils/deduplicationUtils';
import { parseVCardString } from '../utils/vcardUtils';
import { addHistoryItem, deleteHistoryItem } from '../utils/db';

interface DuplicateFinderModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryItem[];
    onUpdateHistory: (newHistory: HistoryItem[]) => void;
}

export const DuplicateFinderModal: React.FC<DuplicateFinderModalProps> = ({ isOpen, onClose, history, onUpdateHistory }) => {
    const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
    const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
    const [isScanning, setIsScanning] = useState(false);
    const [scanComplete, setScanComplete] = useState(false);
    const [mergeOverrides, setMergeOverrides] = useState<Partial<HistoryItem>>({});
    const [masterSide, setMasterSide] = useState<'left' | 'right'>('left');

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setScanComplete(false);
            setDuplicates([]);
            setCurrentGroupIndex(0);
            setMergeOverrides({});
            setMasterSide('left');
            // Lock body scroll
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleScan = async () => {
        setIsScanning(true);
        // Simulate delay for UX
        await new Promise(resolve => setTimeout(resolve, 800));
        const found = findDuplicates(history);
        setDuplicates(found);
        setIsScanning(false);
        setScanComplete(true);
    };

    const handleMerge = async (group: DuplicateGroup) => {
        const c1 = history.find(h => h.id === group.contactIds[0]);
        const c2 = history.find(h => h.id === group.contactIds[1]);

        if (!c1 || !c2) return;

        const master = masterSide === 'left' ? c1 : c2;
        const duplicate = masterSide === 'left' ? c2 : c1;

        const mergedContact = mergeContacts(master, [duplicate], mergeOverrides);

        // 1. Persist to DB
        try {
            await deleteHistoryItem(duplicate.id);
            await addHistoryItem(mergedContact); // Updates master (same ID)
        } catch (e) {
            console.error("Failed to update DB during merge", e);
            alert("Fehler beim Speichern der Änderungen.");
            return;
        }

        // 2. Update Local State
        // Remove both originals, add merged
        const newHistory = history.filter(h => h.id !== c1.id && h.id !== c2.id);
        newHistory.unshift(mergedContact); // Add to top

        onUpdateHistory(newHistory);

        // Move to next group or finish
        if (currentGroupIndex < duplicates.length - 1) {
            setCurrentGroupIndex(prev => prev + 1);
            setMergeOverrides({});
            setMasterSide('left');
        } else {
            // All done
            setDuplicates([]);
            setScanComplete(false);
            onClose();
            alert("Alle Dubletten erfolgreich bearbeitet!");
        }
    };

    const handleIgnore = () => {
        if (currentGroupIndex < duplicates.length - 1) {
            setCurrentGroupIndex(prev => prev + 1);
            setMergeOverrides({});
            setMasterSide('left');
        } else {
            setDuplicates([]);
            setScanComplete(false);
            onClose();
        }
    };

    // Helper to get Social Icon
    const getUrlStyle = (type: string) => {
        const t = type.toUpperCase();
        if (t.includes('LINKEDIN')) return { icon: Linkedin, color: 'text-[#0077b5]' };
        if (t.includes('XING')) return { icon: User, color: 'text-[#006567]' };
        if (t.includes('TWITTER') || t.includes('X')) return { icon: Twitter, color: 'text-slate-900 dark:text-slate-100' };
        if (t.includes('FACEBOOK')) return { icon: Facebook, color: 'text-[#1877F2]' };
        if (t.includes('INSTAGRAM')) return { icon: Instagram, color: 'text-[#E4405F]' };
        if (t.includes('GITHUB')) return { icon: Github, color: 'text-slate-900 dark:text-slate-100' };
        if (t.includes('YOUTUBE')) return { icon: Youtube, color: 'text-[#FF0000]' };
        if (t.includes('TIKTOK')) return { icon: Music, color: 'text-black dark:text-white' };
        return { icon: Globe, color: 'text-slate-500' };
    };

    // Render Content
    const renderContent = () => {
        if (!isOpen) return null;

        if (!scanComplete && !isScanning) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400">
                        <Search size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Dubletten suchen</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                        Analysiert deine Kontakte auf ähnliche Namen, gleiche E-Mails oder Telefonnummern.
                    </p>
                    <button
                        onClick={handleScan}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                    >
                        Scan starten
                    </button>
                </div>
            );
        }

        if (isScanning) {
            return (
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-slate-600 dark:text-slate-300 font-medium">Suche nach Dubletten...</p>
                </div>
            );
        }

        if (duplicates.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                        <Check size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Keine Dubletten gefunden</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        Deine Kontaktliste sieht sauber aus!
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
                    >
                        Schließen
                    </button>
                </div>
            );
        }

        const group = duplicates[currentGroupIndex];
        const c1 = history.find(h => h.id === group.contactIds[0]);
        const c2 = history.find(h => h.id === group.contactIds[1]);

        if (!c1 || !c2) return null;

        // Parse Data
        const d1 = parseVCardString(c1.vcard).data;
        const d2 = parseVCardString(c2.vcard).data;

        // Helper to render a single value field with arrow selection
        const renderSingleField = (
            label: string,
            icon: React.ElementType,
            val1: string | undefined,
            val2: string | undefined,
            fieldKey: keyof HistoryItem,
            colorClass: string = "text-slate-500"
        ) => {
            if (!val1 && !val2) return null;
            const isDifferent = val1 !== val2;
            const masterVal = masterSide === 'left' ? val1 : val2;
            const currentVal = mergeOverrides[fieldKey] !== undefined ? mergeOverrides[fieldKey] : masterVal;

            // Determine which value is currently "active" / "selected"
            const isLeftSelected = currentVal === val1;
            const isRightSelected = currentVal === val2;

            return (
                <div className="mb-4 shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`p-1 rounded-md bg-slate-100 dark:bg-slate-800 ${colorClass}`}>
                            {React.createElement(icon, { size: 14 })}
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_32px_1fr] md:grid-cols-[1fr_40px_1fr] gap-1 md:gap-2 items-center">
                        {/* Left Value Box */}
                        <div
                            onClick={() => isDifferent && val1 && setMergeOverrides({ ...mergeOverrides, [fieldKey]: val1 })}
                            className={`p-2 md:p-3 rounded-lg border text-xs md:text-sm break-words transition-colors relative ${isDifferent ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800' : ''} ${isLeftSelected
                                ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 ring-1 ring-indigo-500/20 z-10'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60'
                                } ${!val1 ? 'text-slate-400 italic' : 'text-slate-900 dark:text-slate-100'}`}
                        >
                            {val1 || 'Leer'}
                            {isLeftSelected && <div className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full"></div>}
                        </div>

                        {/* Center Arrow Action */}
                        <div className="flex flex-col items-center justify-center">
                            {isDifferent && (
                                <button
                                    onClick={() => {
                                        // Toggle logic: If we are currently using the "other" value, revert to master.
                                        // If we are using master, switch to "other".
                                        if (masterSide === 'left') {
                                            // Master is Left. Default is val1.
                                            // If current is val1, switch to val2. If current is val2, switch to val1.
                                            const newVal = currentVal === val1 ? val2 : val1;
                                            setMergeOverrides({ ...mergeOverrides, [fieldKey]: newVal });
                                        } else {
                                            // Master is Right. Default is val2.
                                            const newVal = currentVal === val2 ? val1 : val2;
                                            setMergeOverrides({ ...mergeOverrides, [fieldKey]: newVal });
                                        }
                                    }}
                                    className={`p-1.5 rounded-full transition-all shadow-sm ${
                                        // Highlight if we are NOT using the master value (i.e. we are pulling from the other side)
                                        (masterSide === 'left' && currentVal === val2) || (masterSide === 'right' && currentVal === val1)
                                            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 scale-110'
                                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    title="Wert übernehmen"
                                >
                                    {masterSide === 'left' ? (
                                        <ArrowLeft size={16} className="md:w-5 md:h-5" />
                                    ) : (
                                        <ArrowRight size={16} className="md:w-5 md:h-5" />
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Right Value Box */}
                        <div
                            onClick={() => isDifferent && val2 && setMergeOverrides({ ...mergeOverrides, [fieldKey]: val2 })}
                            className={`p-2 md:p-3 rounded-lg border text-xs md:text-sm break-words transition-colors relative ${isDifferent ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800' : ''} ${isRightSelected
                                ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 ring-1 ring-indigo-500/20 z-10'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60'
                                } ${!val2 ? 'text-slate-400 italic' : 'text-slate-900 dark:text-slate-100'}`}
                        >
                            {val2 || 'Leer'}
                            {isRightSelected && <div className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full"></div>}
                        </div>
                    </div>
                </div>
            );
        };

        // Helper to render list fields (just display, no arrow selection for individual items yet)
        const renderListField = (
            label: string,
            icon: React.ElementType,
            list1: any[] | undefined,
            list2: any[] | undefined,
            renderItem: (item: any) => React.ReactNode
        ) => {
            if ((!list1 || list1.length === 0) && (!list2 || list2.length === 0)) return null;

            return (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {React.createElement(icon, { size: 14 })}
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_32px_1fr] md:grid-cols-[1fr_40px_1fr] gap-1 md:gap-2 items-start">
                        <div className="space-y-2">
                            {list1?.map((item, i) => (
                                <div key={i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs md:text-sm overflow-hidden">
                                    {renderItem(item)}
                                </div>
                            ))}
                            {(!list1 || list1.length === 0) && <span className="text-xs text-slate-400 italic">Leer</span>}
                        </div>

                        <div className="flex justify-center pt-2">
                            {/* Placeholder for future detailed merge controls */}
                            <span className="text-slate-300"></span>
                        </div>

                        <div className="space-y-2">
                            {list2?.map((item, i) => (
                                <div key={i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs md:text-sm overflow-hidden">
                                    {renderItem(item)}
                                </div>
                            ))}
                            {(!list2 || list2.length === 0) && <span className="text-xs text-slate-400 italic">Leer</span>}
                        </div>
                    </div>
                </div>
            );
        };

        return (
            <div className="flex flex-col h-full">
                {/* Header Info */}
                <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600 dark:text-blue-300 shrink-0">
                            <AlertTriangle size={20} />
                        </div>
                        <div className="overflow-hidden">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm md:text-base truncate">Dublette ({currentGroupIndex + 1}/{duplicates.length})</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                {group.reason}
                            </p>
                        </div>
                    </div>
                    <div className="text-xs font-mono text-slate-400 hidden sm:block">
                        ID: {group.id.slice(0, 8)}
                    </div>
                </div>

                {/* Comparison Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 md:pr-2">

                    {/* Profile Pictures & Master Selection */}
                    <div className="grid grid-cols-[1fr_32px_1fr] md:grid-cols-[1fr_40px_1fr] gap-1 md:gap-2 mb-6 items-end">
                        <div
                            onClick={() => setMasterSide('left')}
                            className={`cursor-pointer p-2 md:p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 md:gap-3 ${masterSide === 'left' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 overflow-hidden">
                                {c1.images && c1.images.length > 0 ? (
                                    <img src={c1.images[0]} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={24} className="md:w-8 md:h-8" />
                                )}
                            </div>
                            <div className="text-center w-full">
                                <span className={`text-[10px] md:text-xs font-bold uppercase px-2 py-1 rounded-full block w-full truncate ${masterSide === 'left' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                    {masterSide === 'left' ? 'Master' : 'Duplikat'}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-center pb-6 md:pb-8 text-slate-300">
                            <ArrowRight size={20} className="md:w-6 md:h-6" />
                        </div>

                        <div
                            onClick={() => setMasterSide('right')}
                            className={`cursor-pointer p-2 md:p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 md:gap-3 ${masterSide === 'right' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 overflow-hidden">
                                {c2.images && c2.images.length > 0 ? (
                                    <img src={c2.images[0]} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={24} className="md:w-8 md:h-8" />
                                )}
                            </div>
                            <div className="text-center w-full">
                                <span className={`text-[10px] md:text-xs font-bold uppercase px-2 py-1 rounded-full block w-full truncate ${masterSide === 'right' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                    {masterSide === 'right' ? 'Master' : 'Duplikat'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Single Value Fields */}
                    {renderSingleField("Name", User, d1.fn, d2.fn, 'name', 'text-indigo-500')}
                    {renderSingleField("Titel", Award, d1.title, d2.title, 'title', 'text-purple-500')}
                    {renderSingleField("Firma", Building2, d1.org, d2.org, 'org', 'text-slate-500')}
                    {renderSingleField("Geburtstag", Cake, d1.bday, d2.bday, 'bday', 'text-pink-500')}
                    {renderSingleField("Notiz", StickyNote, d1.note, d2.note, 'note', 'text-yellow-500')}

                    {/* Multi Value Fields */}
                    {renderListField("E-Mails", Mail, d1.email, d2.email, (item) => (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase w-10 shrink-0">{item.type}</span>
                            <a href={`mailto:${item.value}`} className="truncate text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline break-all">
                                {item.value}
                            </a>
                        </div>
                    ))}

                    {renderListField("Telefon", Phone, d1.tel, d2.tel, (item) => (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase w-10 shrink-0">{item.type}</span>
                            <a href={`tel:${item.value}`} className="font-mono text-slate-700 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400 hover:underline break-all">
                                {item.value}
                            </a>
                        </div>
                    ))}

                    {renderListField("Websites & Social", Globe, d1.url, d2.url, (item) => {
                        const style = getUrlStyle(item.type);
                        const Icon = style.icon;
                        return (
                            <div className="flex items-center gap-2">
                                <Icon size={12} className={`shrink-0 ${style.color}`} />
                                <a href={item.value} target="_blank" rel="noopener noreferrer" className="truncate text-blue-600 dark:text-blue-400 underline decoration-dotted hover:text-blue-800 dark:hover:text-blue-300 break-all">
                                    {item.value}
                                </a>
                            </div>
                        );
                    })}

                    {renderListField("Adressen", MapPin, d1.adr, d2.adr, (item) => (
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.value.street}, ${item.value.zip} ${item.value.city}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col gap-0.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 -m-1 p-1 rounded transition-colors"
                        >
                            <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">{item.type}</span>
                            <span className="text-slate-700 dark:text-slate-300 break-words">{item.value.street}</span>
                            <span className="text-slate-500 text-[10px] md:text-xs">{item.value.zip} {item.value.city}</span>
                        </a>
                    ))}

                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 -mx-6 -mb-6 p-4 md:p-6">
                    <button
                        onClick={handleIgnore}
                        className="px-3 py-2 text-sm md:text-base text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                    >
                        Ignorieren
                    </button>
                    <div className="flex gap-2 md:gap-3 items-center">
                        <div className="text-xs text-slate-400 hidden sm:flex items-center px-2">
                            {duplicates.length - currentGroupIndex - 1} verbleibend
                        </div>
                        <button
                            onClick={() => handleMerge(group)}
                            className="px-4 md:px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 text-sm md:text-base"
                        >
                            <Check size={16} className="md:w-[18px] md:h-[18px]" />
                            <span>Zusammenführen</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-0 md:p-4">
            <div className="bg-white dark:bg-slate-950 md:rounded-2xl shadow-2xl w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden border-0 md:border border-slate-200 dark:border-slate-800">

                {/* Modal Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950 shrink-0">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Merge size={20} className="text-indigo-500" />
                        Dubletten-Finder
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-hidden p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/50">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
