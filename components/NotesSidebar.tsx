import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Calendar, MapPin, Download, Trash2, StickyNote, UserCircle } from 'lucide-react';
import { Note, Language } from '../types';
import { getNotes, searchNotes, deleteNote } from '../utils/db';
import { translations } from '../utils/translations';

interface NotesSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectContact: (contactId: string) => void;
    lang: Language;
}

export const NotesSidebar: React.FC<NotesSidebarProps> = ({ isOpen, onClose, onSelectContact, lang }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const t = translations[lang];

    useEffect(() => {
        if (isOpen) {
            loadNotes();
        }
    }, [isOpen]);

    const loadNotes = async () => {
        try {
            const items = await getNotes();
            // Sort by date desc
            setNotes(items.reverse());
        } catch (e) {
            console.error("Failed to load notes", e);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            loadNotes();
            return;
        }
        try {
            const results = await searchNotes(query);
            setNotes(results);
        } catch (e) {
            console.error("Search failed", e);
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

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            <div className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-white dark:bg-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                        <StickyNote size={20} className="text-yellow-500" />
                        <h3>{t.notesTitle || "Notes"} ({notes.length})</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 pb-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder={t.searchNotes || "Search notes..."}
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                    {notes.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-center">
                            <StickyNote size={48} className="mb-4 opacity-20" />
                            <p>{t.noNotes || "No notes found."}</p>
                        </div>
                    ) : (
                        notes.map(note => (
                            <div key={note.id} className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                                        <FileText size={14} className="text-blue-500" />
                                        <span className="truncate max-w-[120px]">{note.contactName || "Unknown"}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {note.contactId && (
                                            <button
                                                onClick={() => onSelectContact(note.contactId!)}
                                                className="p-1 text-slate-400 hover:text-green-600 dark:hover:text-green-400 rounded hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                                                title={t.viewContact || "View Contact"}
                                            >
                                                <UserCircle size={14} />
                                            </button>
                                        )}
                                        <button onClick={() => handleExport(note)} className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" title="Export">
                                            <Download size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(note.id)} className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-2 pl-3 border-l-2 border-slate-100 dark:border-slate-800 line-clamp-4">
                                    {note.content}
                                </div>

                                <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={10} />
                                        {new Date(note.timestamp).toLocaleDateString()}
                                    </div>
                                    {note.location && (
                                        <div className="flex items-center gap-1">
                                            <MapPin size={10} />
                                            <span className="truncate max-w-[80px]">{note.location}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};
