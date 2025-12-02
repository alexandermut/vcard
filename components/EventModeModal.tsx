import React, { useState, useEffect } from 'react';
import { X, Calendar, Tag } from 'lucide-react';
import { translations } from '../utils/translations';
import { Language } from '../types';

interface EventModeModalProps {
    isOpen: boolean;
    onClose: () => void;
    isActive: boolean;
    eventName: string;
    onSave: (active: boolean, name: string) => void;
    lang: Language;
}

export const EventModeModal: React.FC<EventModeModalProps> = ({
    isOpen, onClose, isActive, eventName, onSave, lang
}) => {
    const [localActive, setLocalActive] = useState(isActive);
    const [localName, setLocalName] = useState(eventName);

    useEffect(() => {
        if (isOpen) {
            setLocalActive(isActive);
            setLocalName(eventName);
        }
    }, [isOpen, isActive, eventName]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(localActive, localName);
        onClose();
    };

    const t = translations[lang];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">

                <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
                        Event Modus
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-slate-900 dark:text-slate-100">Aktivieren</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Alle neuen Scans erhalten automatisch dieses Tag.
                            </p>
                        </div>
                        <button
                            onClick={() => setLocalActive(!localActive)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${localActive ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localActive ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Event Name (Tag)
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Tag size={16} className="text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={localName}
                                onChange={(e) => setLocalName(e.target.value)}
                                placeholder="z.B. DMEXCO 2025"
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            <strong>Hinweis:</strong> Das Tag wird im vCard-Feld <code>CATEGORIES</code> gespeichert. Dies ist kompatibel mit Outlook, Apple Contacts und Google Contacts (als Label).
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                    >
                        Speichern
                    </button>
                </div>
            </div>
        </div>
    );
};
