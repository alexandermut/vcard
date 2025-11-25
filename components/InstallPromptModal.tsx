import React from 'react';
import { Share, PlusSquare, X } from 'lucide-react';
import { Language } from '../types';

interface InstallPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    lang: Language;
}

export const InstallPromptModal: React.FC<InstallPromptModalProps> = ({ isOpen, onClose, lang }) => {
    if (!isOpen) return null;

    const isGerman = lang === 'de';

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-in slide-in-from-bottom-10 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <X size={20} />
                </button>

                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {isGerman ? 'App installieren' : 'Install App'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {isGerman
                            ? 'Installiere diese App auf deinem iPhone für den besten Komfort.'
                            : 'Install this app on your iPhone for the best experience.'}
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                            <Share size={20} />
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-200">
                            {isGerman
                                ? <span>Tippe unten auf <strong>Teilen</strong></span>
                                : <span>Tap <strong>Share</strong> below</span>}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                            <PlusSquare size={20} />
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-200">
                            {isGerman
                                ? <span>Wähle <strong>Zum Home-Bildschirm</strong></span>
                                : <span>Select <strong>Add to Home Screen</strong></span>}
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <div className="inline-block w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mb-2"></div>
                    <p className="text-xs text-gray-400">
                        {isGerman ? 'Safari Browser erforderlich' : 'Safari Browser required'}
                    </p>
                </div>
            </div>
        </div>
    );
};
