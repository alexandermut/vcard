import React, { useState, useEffect } from 'react';
import { X, User, Download, Upload, Sparkles, LogOut, RefreshCw, Search, Check, Loader2 } from 'lucide-react';
import { useGoogleContactsAuth } from '../auth/useGoogleContactsAuth';
import { fetchGoogleContacts, GoogleContact } from '../services/googleContactsService';
import { mapGooglePersonToVCard } from '../utils/googleMapper';

interface GoogleContactsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (vcards: string[]) => void;
}

export const GoogleContactsModal: React.FC<GoogleContactsModalProps> = ({ isOpen, onClose, onImport }) => {
    const { isAuthenticated, login, token } = useGoogleContactsAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'import' | 'sync' | 'tools'>('overview');

    // Import State
    const [contacts, setContacts] = useState<GoogleContact[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (isOpen) {
            // Reset state or refresh if needed
            if (!isAuthenticated) setActiveTab('overview');
        }
    }, [isOpen, isAuthenticated]);

    // --- Import Logic ---
    const loadContacts = async (pageToken?: string) => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetchGoogleContacts(token, pageToken);
            if (res.connections) {
                setContacts(prev => pageToken ? [...prev, ...res.connections] : res.connections);
                setNextPageToken(res.nextPageToken);
            }
        } catch (e: any) {
            console.error("Failed to load contacts", e);
            alert(`Fehler beim Laden der Kontakte: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredContacts.length) setSelectedIds(new Set());
        else {
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

    // --- Render Helpers ---
    const renderOverview = () => (
        <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full shadow-sm mx-auto flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                    {isAuthenticated ? 'Verbunden mit Google' : 'Nicht verbunden'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    {isAuthenticated
                        ? 'Sie haben Zugriff auf Ihre Google Kontakte.'
                        : 'Verbinden Sie Ihr Konto, um Kontakte zu importieren und zu synchronisieren.'}
                </p>

                {!isAuthenticated ? (
                    <button
                        onClick={() => login()}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <User size={18} />
                        Mit Google anmelden
                    </button>
                ) : (
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() => window.location.reload()} // Simple logout by reload for implicit flow or just clear token if we had a logout function
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                        >
                            <LogOut size={16} />
                            Trennen
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2 text-slate-900 dark:text-white font-medium">
                        <Download size={18} className="text-blue-500" />
                        Import
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Laden Sie Kontakte aus Google direkt in die App.
                    </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2 text-slate-900 dark:text-white font-medium">
                        <Upload size={18} className="text-green-500" />
                        Export
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Speichern Sie Kontakte aus der App in Google.
                    </p>
                </div>
            </div>
        </div>
    );

    const renderImport = () => (
        <div className="flex flex-col h-full">
            {!isAuthenticated ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                    <User size={48} className="mb-4 opacity-20" />
                    <p>Bitte verbinden Sie sich zuerst im "Übersicht" Tab.</p>
                </div>
            ) : (
                <>
                    {/* Toolbar */}
                    <div className="flex gap-3 mb-4">
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
                            onClick={() => loadContacts()}
                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title="Neu laden"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto min-h-0 space-y-1 custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-xl p-2">
                        {contacts.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                                <p>Keine Kontakte geladen.</p>
                                <button onClick={() => loadContacts()} className="mt-2 text-blue-600 hover:underline text-sm">Jetzt laden</button>
                            </div>
                        )}

                        {loading && contacts.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                                <Loader2 size={32} className="animate-spin mb-2" />
                                <p>Lade Kontakte...</p>
                            </div>
                        )}

                        {filteredContacts.map(contact => {
                            const isSelected = selectedIds.has(contact.resourceName);
                            const name = contact.names?.[0]?.displayName || 'Unbekannt';
                            const email = contact.emailAddresses?.[0]?.value;
                            const photo = contact.photos?.find(p => !p.default)?.url;

                            return (
                                <div
                                    key={contact.resourceName}
                                    onClick={() => handleToggleSelect(contact.resourceName)}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${isSelected
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                        : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                        {isSelected && <Check size={14} className="text-white" />}
                                    </div>
                                    {photo ? (
                                        <img src={photo} alt={name} className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-xs">
                                            {name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{name}</p>
                                        {email && <p className="text-xs text-slate-500 truncate">{email}</p>}
                                    </div>
                                </div>
                            );
                        })}

                        {nextPageToken && (
                            <button
                                onClick={() => loadContacts(nextPageToken)}
                                disabled={loading}
                                className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
                            >
                                {loading && <Loader2 size={14} className="animate-spin" />}
                                Mehr laden
                            </button>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 flex justify-between items-center">
                        <button onClick={handleSelectAll} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                            {selectedIds.size === filteredContacts.length ? 'Keine' : 'Alle'} auswählen
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={selectedIds.size === 0}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm flex items-center gap-2"
                        >
                            <Download size={16} />
                            {selectedIds.size} Importieren
                        </button>
                    </div>
                </>
            )}
        </div>
    );

    const renderPlaceholder = (title: string, icon: React.ReactNode, desc: string) => (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-500">
            <div className="mb-4 opacity-20 p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
            <p className="text-sm max-w-xs mx-auto">{desc}</p>
            <div className="mt-6 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider">
                Coming Soon
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">

                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Google Contacts</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 gap-6 bg-white dark:bg-slate-900">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Übersicht
                    </button>
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'import' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Import
                    </button>
                    <button
                        onClick={() => setActiveTab('sync')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sync' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Sync & Export
                    </button>
                    <button
                        onClick={() => setActiveTab('tools')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tools' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        AI Tools
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-6 bg-white dark:bg-slate-900">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'import' && renderImport()}
                    {activeTab === 'sync' && renderPlaceholder('Sync & Export', <RefreshCw size={48} />, 'Automatische Synchronisation, Gruppen-Management und erweiterte Export-Optionen.')}
                    {activeTab === 'tools' && renderPlaceholder('AI Tools', <Sparkles size={48} />, 'Intelligente Bereinigung, Dubletten-Erkennung und Daten-Anreicherung.')}
                </div>

            </div>
        </div>
    );
};
