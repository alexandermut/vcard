import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Calendar, MapPin, Download, Trash2, StickyNote, UserCircle, Edit2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Note, Language } from '../types';
import { getNotes, searchNotes, deleteNote, addNote } from '../utils/db';
import { translations } from '../utils/translations';
import { toast } from 'sonner';
import { Virtuoso } from 'react-virtuoso';

interface NotesSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectContact: (contactId: string) => void;
    lang: Language;
    filterContactId?: string | null;
}

export const NotesSidebar: React.FC<NotesSidebarProps> = ({ isOpen, onClose, onSelectContact, lang, filterContactId }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

    const t = translations[lang];

    useEffect(() => {
        if (isOpen) {
            loadNotes();
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, filterContactId]);

    const loadNotes = async () => {
        try {
            let items = await getNotes();
            // Sort by date desc
            items = items.reverse();

            if (filterContactId) {
                items = items.filter(n => n.contactId === filterContactId);
            }

            setNotes(items);
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
            let results = await searchNotes(query);
            if (filterContactId) {
                results = results.filter(n => n.contactId === filterContactId);
            }
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

    const handleStartEdit = (note: Note) => {
        setEditingNoteId(note.id);
        setEditContent(note.content);
        setExpandedNoteId(note.id); // Auto-expand when editing
    };

    const handleSaveEdit = async () => {
        if (!editingNoteId) return;

        const noteToUpdate = notes.find(n => n.id === editingNoteId);
        if (!noteToUpdate) return;

        const updatedNote: Note = {
            ...noteToUpdate,
            content: editContent,
            timestamp: Date.now() // Update timestamp? Maybe keep original or add updated field. Let's update for now.
        };

        try {
            await addNote(updatedNote);
            setEditingNoteId(null);
            setEditContent('');
            loadNotes();
        } catch (e) {
            console.error("Failed to update note", e);
            toast.error("Failed to save note.");
        }
    };

    const handleCancelEdit = () => {
        setEditingNoteId(null);
        setEditContent('');
    };

    const toggleExpand = (id: string) => {
        setExpandedNoteId(expandedNoteId === id ? null : id);
    };

    const handleExport = (note: Note) => {
        const dateStr = new Date(note.timestamp).toISOString().split('T')[0];

        // Sanitize strings for filename
        const safeName = (note.contactName || 'Unknown').replace(/[^a-z0-9]/gi, '_');
        const safeCompany = (note.company || '').replace(/[^a-z0-9]/gi, '_');

        // Format: Date_Name_Company
        let filename = `${dateStr}_${safeName}`;
        if (safeCompany) {
            filename += `_${safeCompany}`;
        }
        filename += '.txt';

        const content = `NOTE
Date: ${new Date(note.timestamp).toLocaleString()}
Contact: ${note.contactName || 'Unknown'}
Company: ${note.company || 'Unknown'}
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

                {/* Filter Indicator */}
                {filterContactId && (
                    <div className="px-4 pt-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg text-xs flex justify-between items-center">
                            <span>Filtered by Contact</span>
                            {/* We could add a clear filter button here, but the header button does that */}
                        </div>
                    </div>
                )}

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
                <div className="flex-1 overflow-hidden p-4 custom-scrollbar">
                    {notes.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-center">
                            <StickyNote size={48} className="mb-4 opacity-20" />
                            <p>{t.noNotes || "No notes found."}</p>
                        </div>
                    ) : (
                        <Virtuoso
                            style={{ height: '100%' }}
                            data={notes}
                            itemContent={(index, note) => (
                                <div key={note.id} className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group mb-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                                            <FileText size={14} className="text-blue-500" />
                                            <span className="truncate max-w-[120px]">{note.contactName || "Unknown"}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {editingNoteId === note.id ? (
                                                <>
                                                    <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors" title="Save">
                                                        <Check size={14} />
                                                    </button>
                                                    <button onClick={handleCancelEdit} className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Cancel">
                                                        <X size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    {note.contactId && (
                                                        <button
                                                            onClick={() => onSelectContact(note.contactId!)}
                                                            className="p-1 text-slate-400 hover:text-green-600 dark:hover:text-green-400 rounded hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                                                            title={t.viewContact || "View Contact"}
                                                        >
                                                            <UserCircle size={14} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleStartEdit(note)} className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" title="Edit">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => handleExport(note)} className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" title="Export">
                                                        <Download size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(note.id)} className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {editingNoteId === note.id ? (
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="w-full text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-y"
                                            autoFocus
                                        />
                                    ) : (
                                        <div
                                            className={`text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-2 pl-3 border-l-2 border-slate-100 dark:border-slate-800 ${expandedNoteId === note.id ? '' : 'line-clamp-4'} cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors`}
                                            onClick={() => toggleExpand(note.id)}
                                            title="Click to expand/collapse"
                                        >
                                            {note.content || <span className="italic opacity-50">{lang === 'de' ? "Leere Notiz" : "Empty note"}</span>}
                                        </div>
                                    )}

                                    {editingNoteId !== note.id && (
                                        <div className="flex justify-center -mt-1 mb-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleExpand(note.id); }}
                                                className="text-slate-300 hover:text-slate-500 transition-colors"
                                            >
                                                {expandedNoteId === note.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            </button>
                                        </div>
                                    )}

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
                            )}
                        />
                    )}
                </div>
            </div>
        </>
    );
};
