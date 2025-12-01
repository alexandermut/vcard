import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, AlertTriangle, ArrowLeft, ArrowRight, User, Building2, Phone, Mail, Globe, MapPin, Cake, StickyNote, Award, Search, ExternalLink, Linkedin, Facebook, Instagram, Twitter, Github, Youtube, Music, Merge, Plus, Trash2 } from 'lucide-react';
import { HistoryItem, VCardData } from '../types';
import { mergeContacts, DuplicateGroup } from '../utils/deduplicationUtils';
import { parseVCardString, generateVCardFromData } from '../utils/vcardUtils';
import { toast } from 'sonner';
import { addHistoryItem, deleteHistoryItem } from '../utils/db';
import DedupWorker from '../workers/dedup.worker?worker';

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

    // New State: Draft Data (The "Result" being built)
    const [draftData, setDraftData] = useState<VCardData | null>(null);
    const [masterSide, setMasterSide] = useState<'left' | 'right'>('left');
    const [dirtyFields, setDirtyFields] = useState<Set<keyof VCardData>>(new Set());

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setScanComplete(false);
            setDuplicates([]);
            setCurrentGroupIndex(0);
            setDraftData(null);
            setMasterSide('left');
            setDirtyFields(new Set());
            // Lock body scroll
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Initialize Draft when group changes
    useEffect(() => {
        setMasterSide('left');
        setDirtyFields(new Set());
        setDraftData(null);
    }, [currentGroupIndex]);

    // Update Draft when Master Side changes (preserving dirty fields)
    useEffect(() => {
        if (duplicates.length > 0 && currentGroupIndex < duplicates.length) {
            const group = duplicates[currentGroupIndex];
            const c1 = history.find(h => h.id === group.contactIds[0]);
            const c2 = history.find(h => h.id === group.contactIds[1]);

            if (c1 && c2) {
                const master = masterSide === 'left' ? c1 : c2;
                const parsed = parseVCardString(master.vcard).data;

                setDraftData(prev => {
                    if (!prev) return parsed; // First load for this group

                    // Merge: Use new master's data, but override with dirty fields from prev
                    const newData = { ...parsed };
                    dirtyFields.forEach(field => {
                        // @ts-ignore
                        if (prev[field] !== undefined) {
                            // @ts-ignore
                            newData[field] = prev[field];
                        }
                    });
                    return newData;
                });
            }
        }
    }, [duplicates, currentGroupIndex, masterSide, history]); // dirtyFields is used in callback but not dependency to avoid loops

    const handleScan = () => {
        setIsScanning(true);

        const worker = new DedupWorker();
        worker.postMessage({ type: 'findDuplicates' });

        worker.onmessage = (e) => {
            const { type, groups, error } = e.data;
            if (type === 'results') {
                setDuplicates(groups);
                setIsScanning(false);
                setScanComplete(true);
                worker.terminate();
            } else if (type === 'error') {
                console.error("Dedup Worker Error:", error);
                toast.error("Fehler bei der Dublettensuche.");
                setIsScanning(false);
                worker.terminate();
            }
        };
    };

    const handleMerge = async (group: DuplicateGroup) => {
        if (!draftData) return;

        const c1 = history.find(h => h.id === group.contactIds[0]);
        const c2 = history.find(h => h.id === group.contactIds[1]);

        if (!c1 || !c2) return;

        const master = masterSide === 'left' ? c1 : c2;
        const duplicate = masterSide === 'left' ? c2 : c1;

        // Generate final vCard from Draft
        const finalVCardString = generateVCardFromData(draftData);

        // Create merged item
        // We keep the Master's ID and Images (unless we want to merge images too? For now keep master's images)
        // Actually, we should probably merge images if possible, but let's stick to master's images + maybe duplicate's if master has none?
        // Simple logic: Use Master's images.
        const mergedContact: HistoryItem = {
            ...master,
            vcard: finalVCardString,
            name: draftData.fn || master.name,
            org: draftData.org || master.org,
            timestamp: Date.now()
        };

        // 1. Persist to DB
        try {
            await deleteHistoryItem(duplicate.id);
            await addHistoryItem(mergedContact); // Updates master (same ID)
        } catch (e) {
            console.error("Failed to update DB during merge", e);
            toast.error("Fehler beim Speichern der Änderungen.");
            return;
        }

        // 2. Update Local State
        const newHistory = history.filter(h => h.id !== c1.id && h.id !== c2.id);
        newHistory.unshift(mergedContact);

        onUpdateHistory(newHistory);

        // Move to next
        if (currentGroupIndex < duplicates.length - 1) {
            setCurrentGroupIndex(prev => prev + 1);
            // Side reset and dirty fields reset handled by useEffect on currentGroupIndex
        } else {
            setDuplicates([]);
            setScanComplete(false);
            onClose();
            toast.success("Alle Dubletten erfolgreich bearbeitet!");
        }
    };

    const handleIgnore = () => {
        if (currentGroupIndex < duplicates.length - 1) {
            setCurrentGroupIndex(prev => prev + 1);
            // Side reset and dirty fields reset handled by useEffect on currentGroupIndex
        } else {
            setDuplicates([]);
            setScanComplete(false);
            onClose();
        }
    };

    const updateDraft = (field: keyof VCardData, value: any) => {
        if (!draftData) return;
        setDraftData({ ...draftData, [field]: value });
        setDirtyFields(prev => {
            const next = new Set(prev);
            next.add(field);
            return next;
        });
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
                </div>
            );
        }

        const group = duplicates[currentGroupIndex];
        const c1 = history.find(h => h.id === group.contactIds[0]);
        const c2 = history.find(h => h.id === group.contactIds[1]);

        if (!c1 || !c2 || !draftData) return null;

        // Parse Original Data for Display
        const d1 = parseVCardString(c1.vcard).data;
        const d2 = parseVCardString(c2.vcard).data;

        // Helper to render a single value field
        const renderSingleField = (
            label: string,
            icon: React.ElementType,
            val1: string | undefined,
            val2: string | undefined,
            fieldKey: keyof VCardData,
            colorClass: string = "text-slate-500"
        ) => {
            const isDifferent = val1 !== val2;
            const draftVal = draftData[fieldKey] as string;

            return (
                <div className="mb-4 shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`p - 1 rounded - md bg - slate - 100 dark: bg - slate - 800 ${colorClass} `}>
                            {React.createElement(icon, { size: 14 })}
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                    </div>

                    <div className="grid grid-cols-[1fr_32px_1fr] md:grid-cols-[1fr_40px_1fr] gap-1 md:gap-2 items-center">
                        {/* LEFT SIDE */}
                        {masterSide === 'left' ? (
                            // Left is Master (Editable)
                            <input
                                type="text"
                                value={draftVal || ''}
                                onChange={(e) => updateDraft(fieldKey, e.target.value)}
                                className="w-full p-2 md:p-3 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs md:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
                                placeholder="Leer"
                            />
                        ) : (
                            // Left is Duplicate (Read-only)
                            <div
                                className={`p - 2 md: p - 3 rounded - lg border border - slate - 200 dark: border - slate - 800 bg - slate - 50 dark: bg - slate - 900 / 50 text - xs md: text - sm text - slate - 500 dark: text - slate - 400 break-words ${!val1 ? 'italic opacity-50' : ''} `}
                            >
                                {val1 || 'Leer'}
                            </div>
                        )}

                        {/* CENTER ARROW */}
                        <div className="flex justify-center">
                            {isDifferent && (
                                <button
                                    onClick={() => {
                                        // Copy from Duplicate to Master
                                        const valueToCopy = masterSide === 'left' ? val2 : val1;
                                        if (valueToCopy) updateDraft(fieldKey, valueToCopy);
                                    }}
                                    className="p-1.5 rounded-full bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-900/50 dark:text-slate-500 dark:hover:text-indigo-400 transition-colors"
                                    title="Wert übernehmen"
                                >
                                    {masterSide === 'left' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                                </button>
                            )}
                        </div>

                        {/* RIGHT SIDE */}
                        {masterSide === 'right' ? (
                            // Right is Master (Editable)
                            <input
                                type="text"
                                value={draftVal || ''}
                                onChange={(e) => updateDraft(fieldKey, e.target.value)}
                                className="w-full p-2 md:p-3 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs md:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
                                placeholder="Leer"
                            />
                        ) : (
                            // Right is Duplicate (Read-only)
                            <div
                                className={`p - 2 md: p - 3 rounded - lg border border - slate - 200 dark: border - slate - 800 bg - slate - 50 dark: bg - slate - 900 / 50 text - xs md: text - sm text - slate - 500 dark: text - slate - 400 break-words ${!val2 ? 'italic opacity-50' : ''} `}
                            >
                                {val2 || 'Leer'}
                            </div>
                        )}
                    </div>
                </div>
            );
        };

        // Helper for List Fields (Emails, Phones, etc.)
        // For now, we just show them. Full list editing is complex.
        // Let's make them editable as a comma-separated string? Or just simple inputs for the first few?
        // User asked for "full editing".
        // Let's stick to read-only for lists for now, but allow copying?
        // Actually, let's just render them as read-only for now to avoid breaking layout, 
        // but maybe add a "Copy All" button?
        // Or better: Render the DRAFT list on the master side, and allow deleting items?

        // Let's simplify: Just show the lists side-by-side. 
        // If user wants to edit lists, they can do it after merge in the main editor.
        // OR: We provide a simple "Use this list" toggle?
        // Let's keep the previous list logic but make it clearer.

        const formatValue = (value: any): string => {
            if (typeof value === 'object' && value !== null) {
                // Handle Address Object
                if ('street' in value || 'city' in value) {
                    const parts = [value.street, value.zip, value.city, value.country].filter(p => p);
                    return parts.join(', ');
                }
                return JSON.stringify(value);
            }
            return String(value);
        };

        const renderListField = (
            label: string,
            icon: React.ElementType,
            list1: any[] | undefined, // Original Data 1
            list2: any[] | undefined, // Original Data 2
            fieldKey: keyof VCardData
        ) => {
            // Determine which list is Master (Draft) and which is Duplicate (Source)
            const draftList = (draftData?.[fieldKey] as any[]) || [];
            const duplicateList = (masterSide === 'left' ? list2 : list1) || [];

            // Helper to check if item exists in draft
            const isInDraft = (item: any) => {
                return draftList.some((d: any) => d.value === item.value && d.type === item.type);
            };

            const addToList = (item: any) => {
                if (isInDraft(item)) return;
                const newList = [...draftList, item];
                updateDraft(fieldKey, newList);
            };

            const removeFromList = (index: number) => {
                const newList = [...draftList];
                newList.splice(index, 1);
                updateDraft(fieldKey, newList);
            };

            if (draftList.length === 0 && duplicateList.length === 0) return null;

            return (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {React.createElement(icon, { size: 14 })}
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_32px_1fr] md:grid-cols-[1fr_40px_1fr] gap-1 md:gap-2 items-start">

                        {/* LEFT SIDE */}
                        {masterSide === 'left' ? (
                            // Left is Master (Draft - Editable)
                            <div className="space-y-1 ring-1 ring-indigo-500/30 rounded-lg p-1 min-h-[32px]">
                                {draftList.map((item: any, i: number) => (
                                    <div key={i} className="group flex items-center justify-between text-xs p-1.5 bg-white dark:bg-slate-900 rounded border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                                        <div className="truncate mr-1" title={formatValue(item.value)}>
                                            {formatValue(item.value)} <span className="text-[10px] text-slate-400 ml-1">{item.type}</span>
                                        </div>
                                        <button
                                            onClick={() => removeFromList(i)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                                            title="Entfernen"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                {draftList.length === 0 && <span className="text-xs text-slate-400 italic pl-1">Leer</span>}
                            </div>
                        ) : (
                            // Left is Duplicate (Source - Addable)
                            <div className="space-y-1 p-1">
                                {list1?.map((item, i) => {
                                    const exists = isInDraft(item);
                                    return (
                                        <div key={i} className={`group flex items-center justify-between text-xs p-1.5 rounded border ${exists ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-50' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                            <div className="truncate mr-1" title={formatValue(item.value)}>
                                                {formatValue(item.value)} <span className="text-[10px] text-slate-400 ml-1">{item.type}</span>
                                            </div>
                                            {!exists && (
                                                <button
                                                    onClick={() => addToList(item)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-all"
                                                    title="Hinzufügen"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            )}
                                            {exists && <Check size={12} className="text-green-500" />}
                                        </div>
                                    );
                                })}
                                {(!list1 || list1.length === 0) && <span className="text-xs text-slate-400 italic pl-1">Leer</span>}
                            </div>
                        )}

                        {/* CENTER ARROW (Visual Only) */}
                        <div className="flex justify-center pt-2 text-slate-300">
                            {masterSide === 'left' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                        </div>

                        {/* RIGHT SIDE */}
                        {masterSide === 'right' ? (
                            // Right is Master (Draft - Editable)
                            <div className="space-y-1 ring-1 ring-indigo-500/30 rounded-lg p-1 min-h-[32px]">
                                {draftList.map((item: any, i: number) => (
                                    <div key={i} className="group flex items-center justify-between text-xs p-1.5 bg-white dark:bg-slate-900 rounded border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                                        <div className="truncate mr-1" title={formatValue(item.value)}>
                                            {formatValue(item.value)} <span className="text-[10px] text-slate-400 ml-1">{item.type}</span>
                                        </div>
                                        <button
                                            onClick={() => removeFromList(i)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                                            title="Entfernen"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                {draftList.length === 0 && <span className="text-xs text-slate-400 italic pl-1">Leer</span>}
                            </div>
                        ) : (
                            // Right is Duplicate (Source - Addable)
                            <div className="space-y-1 p-1">
                                {list2?.map((item, i) => {
                                    const exists = isInDraft(item);
                                    return (
                                        <div key={i} className={`group flex items-center justify-between text-xs p-1.5 rounded border ${exists ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-50' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                            <div className="truncate mr-1" title={formatValue(item.value)}>
                                                {formatValue(item.value)} <span className="text-[10px] text-slate-400 ml-1">{item.type}</span>
                                            </div>
                                            {!exists && (
                                                <button
                                                    onClick={() => addToList(item)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-all"
                                                    title="Hinzufügen"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            )}
                                            {exists && <Check size={12} className="text-green-500" />}
                                        </div>
                                    );
                                })}
                                {(!list2 || list2.length === 0) && <span className="text-xs text-slate-400 italic pl-1">Leer</span>}
                            </div>
                        )}
                    </div>
                </div>
            );
        };

        return (
            <div className="flex flex-col flex-1 min-h-0">
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
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 md:pr-2 min-h-0">

                    {/* Profile Pictures & Master Selection */}
                    <div className="grid grid-cols-[1fr_32px_1fr] md:grid-cols-[1fr_40px_1fr] gap-1 md:gap-2 mb-6 items-end">
                        <div
                            onClick={() => setMasterSide('left')}
                            className={`cursor - pointer p - 2 md: p - 4 rounded - xl border - 2 transition - all flex flex - col items - center gap - 2 md: gap - 3 ${masterSide === 'left' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'} `}
                        >
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 overflow-hidden">
                                {c1.images && c1.images.length > 0 ? (
                                    <img src={c1.images[0]} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={24} className="md:w-8 md:h-8" />
                                )}
                            </div>
                            <div className="text-center w-full">
                                <span className={`text - [10px] md: text - xs font - bold uppercase px - 2 py - 1 rounded - full block w - full truncate ${masterSide === 'left' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'} `}>
                                    {masterSide === 'left' ? 'Master (Bearbeitbar)' : 'Duplikat'}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-center pb-6 md:pb-8 text-slate-300">
                            {masterSide === 'left' ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
                        </div>

                        <div
                            onClick={() => setMasterSide('right')}
                            className={`cursor - pointer p - 2 md: p - 4 rounded - xl border - 2 transition - all flex flex - col items - center gap - 2 md: gap - 3 ${masterSide === 'right' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'} `}
                        >
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 overflow-hidden">
                                {c2.images && c2.images.length > 0 ? (
                                    <img src={c2.images[0]} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={24} className="md:w-8 md:h-8" />
                                )}
                            </div>
                            <div className="text-center w-full">
                                <span className={`text - [10px] md: text - xs font - bold uppercase px - 2 py - 1 rounded - full block w - full truncate ${masterSide === 'right' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'} `}>
                                    {masterSide === 'right' ? 'Master (Bearbeitbar)' : 'Duplikat'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Single Value Fields */}
                    {renderSingleField("Name", User, d1.fn, d2.fn, 'fn', 'text-indigo-500')}
                    {renderSingleField("Titel", Award, d1.title, d2.title, 'title', 'text-purple-500')}
                    {renderSingleField("Firma", Building2, d1.org, d2.org, 'org', 'text-slate-500')}
                    {renderSingleField("Geburtstag", Cake, d1.bday, d2.bday, 'bday', 'text-pink-500')}
                    {renderSingleField("Notiz", StickyNote, d1.note, d2.note, 'note', 'text-yellow-500')}

                    {/* Multi Value Fields (Interactive) */}
                    {renderListField("E-Mails", Mail, d1.email, d2.email, 'email')}
                    {renderListField("Telefon", Phone, d1.tel, d2.tel, 'tel')}
                    {renderListField("Websites", Globe, d1.url, d2.url, 'url')}
                    {renderListField("Adressen", MapPin, d1.adr, d2.adr, 'adr')}

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
                            <span>Speichern & Weiter</span>
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
                <div className="flex-1 overflow-hidden p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col min-h-0">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
