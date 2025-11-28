import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, Download, Search } from 'lucide-react';
import { fetchGoogleContacts, GoogleContact } from '../services/googleContactsService';
import { mapGooglePersonToVCard } from '../utils/googleMapper';
import { useGoogleContactsAuth } from '../auth/useGoogleContactsAuth';

interface ImportGoogleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (vcards: string[]) => void;
}

export const ImportGoogleModal: React.FC<ImportGoogleModalProps> = ({ isOpen, onClose, onImport }) => {
    const { token } = useGoogleContactsAuth();
    const [contacts, setContacts] = useState<GoogleContact[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (isOpen && token) {
            loadContacts();
        } else {
            setContacts([]);
            setSelectedIds(new Set());
        }
    }, [isOpen, token]);

    const loadContacts = async (pageToken?: string) => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetchGoogleContacts(token, pageToken);
            if (res.connections) {
                setContacts(prev => pageToken ? [...prev, ...res.connections] : res.connections);
                setNextPageToken(res.nextPageToken);
            }
        } catch (e) {
            console.error("Failed to load contacts", e);
            alert("Fehler beim Laden der Kontakte.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredContacts.length) {
            setSelectedIds(new Set());
        } else {
            const newSelected = new Set(selectedIds);
            filteredContacts.forEach(c => newSelected.add(c.resourceName));
            setSelectedIds(newSelected);
        }
    };

    const handleImport = () => {
        const selectedContacts = contacts.filter(c => selectedIds.has(c.resourceName));
        const vcards = selectedContacts.map(c => mapGooglePersonToVCard(c).vcard);
        onImport(vcards);
        onClose();
    };

    const filteredContacts = contacts.filter(c => {
        const name = c.names?.[0]?.displayName?.toLowerCase() || '';
        const email = c.emailAddresses?.[0]?.value?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();
        return name.includes(term) || email.includes(term);
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800">

                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Google Kontakte importieren</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Search & Toolbar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-3">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Suchen..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleSelectAll}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        {selectedIds.size === filteredContacts.length ? 'Keine' : 'Alle'}
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {loading && contacts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                            <Loader2 size={32} className="animate-spin mb-2" />
                            <p>Lade Kontakte...</p>
                        </div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                            <p>Keine Kontakte gefunden.</p>
                        </div>
                    ) : (
                        <>
                            {filteredContacts.map(contact => {
                                const isSelected = selectedIds.has(contact.resourceName);
                                const name = contact.names?.[0]?.displayName || 'Unbekannt';
                                const email = contact.emailAddresses?.[0]?.value;
                                const photo = contact.photos?.find(p => !p.default)?.url;

                                return (
                                    <div
                                        key={contact.resourceName}
                                        onClick={() => handleToggleSelect(contact.resourceName)}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${isSelected
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                                : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-600'
                                            }`}>
                                            {isSelected && <Check size={14} className="text-white" />}
                                        </div>

                                        {photo ? (
                                            <img src={photo} alt={name} className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-sm">
                                                {name.charAt(0)}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 dark:text-white truncate">{name}</p>
                                            {email && <p className="text-xs text-slate-500 truncate">{email}</p>}
                                        </div>
                                    </div>
                                );
                            })}

                            {nextPageToken && (
                                <button
                                    onClick={() => loadContacts(nextPageToken)}
                                    disabled={loading}
                                    className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader2 size={14} className="animate-spin" />}
                                    Mehr laden
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                    <span className="text-sm text-slate-500">
                        {selectedIds.size} ausgewählt
                    </span>
                    <button
                        onClick={handleImport}
                        disabled={selectedIds.size === 0}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Download size={18} />
                        Importieren
                    </button>
                </div>
            </div>
        </div>
    );
};
