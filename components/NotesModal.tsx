import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Calendar, MapPin, Download, Trash2, StickyNote, UserCircle } from 'lucide-react';
import { Note, Language } from '../types';
import { getNotes, searchNotes, deleteNote } from '../utils/db';
import { translations } from '../utils/translations';

interface NotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectContact: (contactId: string) => void;
    lang: Language;
}

export const NotesModal: React.FC<NotesModalProps> = ({ isOpen, onClose, onSelectContact, lang }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const t = translations[lang];

    useEffect(() => {
        if (isOpen) {
            loadNotes();
        }
    }, [isOpen]);

    const loadNotes = async () => {
        setIsLoading(true);
        try {
            const items = await getNotes();
            // Sort by date desc
            setNotes(items.reverse());
        } catch (e) {
            console.error("Failed to load notes", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            loadNotes();
            return;
        }
        setIsLoading(true);
        try {
            const results = await searchNotes(query);
            setNotes(results);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm(t.deleteConfirm || "Delete this note?")) {
            await deleteNote(id);
            if (searchQuery) {
                handleSearch(searchQuery);
            } else {
                loadNotes();
            }
        }
    };

    const handleExport = (note: Note) => {
        const filename = `Note_${note.contactName || 'Unknown'}_${new Date(note.timestamp).toISOString().split('T')[0]}.txt`;
        const content = `NOTE
Date: ${new Date(note.timestamp).toLocaleString()}
Contact: ${note.contactName || 'Unknown'}
Location: ${note.location || 'Unknown'}
---
${note.content}
`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800">

                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <StickyNote size={20} className="text-yellow-500" />
                        {t.notesTitle || "Notes"}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={t.searchNotes || "Search notes..."}
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
                    {isLoading ? (
                        <div className="text-center py-8 text-slate-400">Loading...</div>
                    ) : notes.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                            <StickyNote size={48} className="mx-auto mb-4 opacity-20" />
                            <p>{t.noNotes || "No notes found."}</p>
                        </div>
                    ) : (
                        notes.map(note => (
                            <div key={note.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                                        <FileText size={16} className="text-blue-500" />
                                        {note.contactName || "Unknown Contact"}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {note.contactId && (
                                            <button
                                                onClick={() => onSelectContact(note.contactId!)}
                                                className="p-1.5 text-slate-400 hover:text-green-600 dark:hover:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                                                title={t.viewContact || "View Contact"}
                                            >
                                                <UserCircle size={14} />
                                            </button>
                                        )}
                                        <button onClick={() => handleExport(note)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" title="Export">
                                            <Download size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(note.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-3 pl-6 border-l-2 border-slate-100 dark:border-slate-800">
                                    {note.content}
                                </div>

                                <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500 pl-1">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(note.timestamp).toLocaleDateString()}
                                    </div>
                                    {note.location && (
                                        <div className="flex items-center gap-1">
                                            <MapPin size={12} />
                                            {note.location}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
