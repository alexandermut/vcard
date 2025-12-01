import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Check, AlertTriangle, Users, Merge } from 'lucide-react';
import { HistoryItem } from '../types';
import { findDuplicates, DuplicateGroup, mergeContacts } from '../utils/deduplicationUtils';
import { parseVCardString } from '../utils/vcardUtils';

interface DuplicateFinderModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryItem[];
    onUpdateHistory: (newHistory: HistoryItem[]) => void;
}

export const DuplicateFinderModal: React.FC<DuplicateFinderModalProps> = ({ isOpen, onClose, history, onUpdateHistory }) => {
    const [groups, setGroups] = useState<DuplicateGroup[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanComplete, setScanComplete] = useState(false);
    const [currentGroupIndex, setCurrentGroupIndex] = useState<number | null>(null);

    // Merge State
    const [mergeOverrides, setMergeOverrides] = useState<Partial<HistoryItem>>({});
    const [masterSide, setMasterSide] = useState<'left' | 'right'>('left'); // Which contact is the base?

    useEffect(() => {
        if (isOpen) {
            setGroups([]);
            setScanComplete(false);
            setCurrentGroupIndex(null);
        }
    }, [isOpen]);

    const startScan = async () => {
        setIsScanning(true);
        // Simulate delay for UX
        setTimeout(() => {
            const found = findDuplicates(history);
            setGroups(found);
            setIsScanning(false);
            setScanComplete(true);
        }, 500);
    };

    const handleMerge = (group: DuplicateGroup) => {
        const c1 = history.find(h => h.id === group.contactIds[0]);
        const c2 = history.find(h => h.id === group.contactIds[1]);

        if (!c1 || !c2) return;

        const master = masterSide === 'left' ? c1 : c2;
        const duplicate = masterSide === 'left' ? c2 : c1;

        // Perform Merge
        const mergedContact = mergeContacts(master, [duplicate], mergeOverrides);

        // Update History: Remove both originals, add merged
        const newHistory = history.filter(h => h.id !== c1.id && h.id !== c2.id);
        newHistory.unshift(mergedContact); // Add to top

        onUpdateHistory(newHistory);

        // Remove group from list
        setGroups(groups.filter(g => g.id !== group.id));
        setCurrentGroupIndex(null);
        setMergeOverrides({});
    };

    const handleIgnore = (groupId: string) => {
        setGroups(groups.filter(g => g.id !== groupId));
        setCurrentGroupIndex(null);
    };

    if (!isOpen) return null;

    // --- Render Helpers ---

    const renderComparison = () => {
        if (currentGroupIndex === null) return null;
        const group = groups[currentGroupIndex];
        const c1 = history.find(h => h.id === group.contactIds[0]);
        const c2 = history.find(h => h.id === group.contactIds[1]);

        if (!c1 || !c2) return <div>Fehler: Kontakte nicht gefunden</div>;

        // Helper to render a field row with arrows
        const renderFieldRow = (label: string, val1: string | undefined, val2: string | undefined, fieldKey: keyof HistoryItem) => {
            const isDifferent = val1 !== val2;
            if (!val1 && !val2) return null;

            // Determine which value is currently selected for the merged result
            // Default is masterSide's value, unless overridden
            const masterVal = masterSide === 'left' ? val1 : val2;
            const currentVal = mergeOverrides[fieldKey] !== undefined ? mergeOverrides[fieldKey] : masterVal;

            return (
                <div className="grid grid-cols-[1fr_40px_1fr] gap-2 items-center mb-2 text-sm">
                    <div className={`p-2 rounded border ${masterSide === 'left' && currentVal === val1 ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200'} ${!val1 ? 'text-slate-400 italic' : ''}`}>
                        {val1 || 'Leer'}
                    </div>

                    <div className="flex flex-col items-center justify-center gap-1">
                        {isDifferent && (
                            <>
                                <button
                                    onClick={() => setMergeOverrides({ ...mergeOverrides, [fieldKey]: val1 })}
                                    className={`p-1 rounded hover:bg-slate-100 ${currentVal === val1 ? 'text-indigo-600' : 'text-slate-400'}`}
                                >
                                    <ArrowLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setMergeOverrides({ ...mergeOverrides, [fieldKey]: val2 })}
                                    className={`p-1 rounded hover:bg-slate-100 ${currentVal === val2 ? 'text-indigo-600' : 'text-slate-400'}`}
                                >
                                    <ArrowRight size={16} />
                                </button>
                            </>
                        )}
                    </div>

                    <div className={`p-2 rounded border ${masterSide === 'right' && currentVal === val2 ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200'} ${!val2 ? 'text-slate-400 italic' : ''}`}>
                        {val2 || 'Leer'}
                    </div>
                </div>
            );
        };

        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Dublette überprüfen</h3>
                    <div className="flex gap-2">
                        <button onClick={() => handleIgnore(group.id)} className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded">Ignorieren</button>
                        <button onClick={() => handleMerge(group)} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1">
                            <Merge size={16} /> Zusammenführen
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-[1fr_40px_1fr] gap-2 mb-2 font-bold text-slate-700 text-center">
                    <div
                        className={`cursor-pointer p-1 rounded ${masterSide === 'left' ? 'bg-indigo-100 text-indigo-800' : ''}`}
                        onClick={() => setMasterSide('left')}
                    >
                        Kontakt A (Master?)
                    </div>
                    <div></div>
                    <div
                        className={`cursor-pointer p-1 rounded ${masterSide === 'right' ? 'bg-indigo-100 text-indigo-800' : ''}`}
                        onClick={() => setMasterSide('right')}
                    >
                        Kontakt B (Master?)
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    {renderFieldRow("Name", c1.name, c2.name, 'name')}
                    {renderFieldRow("Firma", c1.org, c2.org, 'org')}

                    {/* Info Section for non-editable lists */}
                    <div className="mt-4 p-3 bg-slate-50 rounded text-xs text-slate-500">
                        <p className="mb-1 font-semibold">Automatisch zusammengeführt:</p>
                        <ul className="list-disc pl-4">
                            <li>E-Mail Adressen</li>
                            <li>Telefonnummern</li>
                            <li>Adressen</li>
                            <li>Bilder & Notizen</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Users size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Dubletten-Finder</h2>
                            <p className="text-xs text-slate-500">Bereinige dein Adressbuch</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex">

                    {/* Left Sidebar: List */}
                    <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/30">
                        {!scanComplete ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                <Users size={48} className="text-slate-300 mb-4" />
                                <p className="text-slate-600 mb-4">Suche nach doppelten Einträgen...</p>
                                <button
                                    onClick={startScan}
                                    disabled={isScanning}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isScanning ? 'Suche läuft...' : 'Jetzt scannen'}
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-2">
                                <div className="flex justify-between items-center px-2 mb-2">
                                    <span className="text-xs font-bold text-slate-500">{groups.length} Gruppen gefunden</span>
                                    <button onClick={startScan} className="text-xs text-indigo-600 hover:underline">Neu scannen</button>
                                </div>
                                {groups.length === 0 ? (
                                    <div className="text-center p-8 text-slate-500">
                                        <Check size={32} className="mx-auto mb-2 text-green-500" />
                                        <p>Keine Dubletten gefunden!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {groups.map((group, idx) => (
                                            <div
                                                key={group.id}
                                                onClick={() => { setCurrentGroupIndex(idx); setMergeOverrides({}); }}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all ${currentGroupIndex === idx ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${group.confidence === 'high' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                                        {group.confidence}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">{group.contactIds.length} Kontakte</span>
                                                </div>
                                                <p className="text-sm font-bold text-slate-800 truncate">{group.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Main Area: Comparison */}
                    <div className="flex-1 p-6 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto">
                        {currentGroupIndex !== null ? (
                            renderComparison()
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Merge size={64} className="mb-4 opacity-20" />
                                <p>Wähle eine Gruppe aus, um sie zu bearbeiten.</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
