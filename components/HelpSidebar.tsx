import React, { useState } from 'react';
import { X, HelpCircle, Scan, Edit3, StickyNote, Download, Shield, ChevronDown, ChevronUp, Lightbulb, Layers, FileText, Sparkles, Zap, Hammer } from 'lucide-react';
import { translations } from '../utils/translations';
import { Language } from '../types';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface HelpSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    lang: Language;
}

export const HelpSidebar: React.FC<HelpSidebarProps> = ({ isOpen, onClose, lang }) => {
    useEscapeKey(onClose, isOpen);
    const t = translations[lang];
    const [expandedSection, setExpandedSection] = useState<number | null>(0);

    // Lock body scroll
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const sections = [
        {
            title: t.faqSectionScan,
            items: [
                { icon: Scan, title: t.faqScanTitle, desc: t.faqScanDesc, tips: t.faqScanTips, color: "text-blue-500" },
                { icon: Layers, title: t.faqBatchTitle, desc: t.faqBatchDesc, tips: t.faqBatchTips, color: "text-indigo-500" },
                { icon: Scan, title: t.faqQrTitle, desc: t.faqQrDesc, tips: t.faqQrTips, color: "text-blue-400" },
            ]
        },
        {
            title: t.faqSectionEdit,
            items: [
                { icon: Edit3, title: t.faqEditTitle, desc: t.faqEditDesc, tips: t.faqEditTips, color: "text-green-500" },
                { icon: Edit3, title: t.faqSocialTitle, desc: t.faqSocialDesc, tips: t.faqSocialTips, color: "text-green-400" },
            ]
        },
        {
            title: t.faqSectionNotes,
            items: [
                { icon: StickyNote, title: t.faqNotesTitle, desc: t.faqNotesDesc, tips: t.faqNotesTips, color: "text-yellow-500" },
                { icon: StickyNote, title: t.faqHybridTitle, desc: t.faqHybridDesc, tips: t.faqHybridTips, color: "text-yellow-400" },
            ]
        },
        {
            title: t.faqSectionData,
            items: [
                { icon: Download, title: t.faqHistoryTitle, desc: t.faqHistoryDesc, tips: t.faqHistoryTips, color: "text-purple-500" },
                { icon: Download, title: t.faqExportTitle, desc: t.faqExportDesc, tips: t.faqExportTips, color: "text-purple-400" },
            ]
        },
        {
            title: t.faqSectionPrivacy,
            items: [
                { icon: Shield, title: t.faqPrivacyTitle, desc: t.faqPrivacyDesc, color: "text-slate-500" },
                { icon: Shield, title: t.faqAiTitle, desc: t.faqAiDesc, tips: t.faqAiTips, color: "text-slate-400" },
            ]
        },
        {
            title: t.faqSectionSettings,
            items: [
                { icon: Layers, title: t.faqLlmTitle, desc: t.faqLlmDesc, tips: t.faqLlmTips, color: "text-orange-500" },
                { icon: Layers, title: t.faqKeyTitle, desc: t.faqKeyDesc, tips: t.faqKeyTips, color: "text-orange-400" },

                // Detailed OCR Method Descriptions
                { icon: Scan, title: "🤖 Auto (Offline-First)", desc: "Standard: Versucht erst den schnellen Offline-Scan (Tesseract). Nur bei unsicherem Ergebnis wird optional AI (Gemini) zur Verbesserung genutzt (Soft-Fallback).", color: "text-blue-500" },
                { icon: FileText, title: "🧪 Tesseract (Offline Only)", desc: "Nutzt ausschließlich die lokale Engine. 100% Datenschutz & keine Kosten. Ideal für einfache, gut lesbare Visitenkarten. Funktioniert komplett ohne Internet.", color: "text-green-600" },
                { icon: Sparkles, title: "✨ Gemini (Online Only)", desc: "Sendet das Bild direkt an die Google AI. Höchste Genauigkeit, versteht Kontext und korrigiert Fehler. Benötigt Internet & API Key.", color: "text-purple-500" },
                { icon: Zap, title: "⚡ Hybrid (Parallel)", desc: "Startet Offline- und Online-Scan gleichzeitig. Wählt automatisch das beste Ergebnis. Maximale Qualität, verbraucht aber mehr Ressourcen (da beide laufen).", color: "text-yellow-500" },
                { icon: Hammer, title: "🛠️ Regex Training (Debug)", desc: "Experten-Modus: Führt beide Scans aus und erstellt einen detaillierten Vergleichs-Bericht (JSON). Hilft Entwicklern, den Offline-Parser zu trainieren.", color: "text-red-500" },
            ]
        },
        {
            title: t.faqSectionTrouble,
            items: [
                { icon: Lightbulb, title: t.faqCamTitle, desc: t.faqCamDesc, color: "text-red-500" },
                { icon: Lightbulb, title: t.faqOllamaTitle, desc: t.faqOllamaDesc, tips: t.faqOllamaTips, color: "text-red-400" },
                { icon: FileText, title: "Tesseract / Regex Debugging", desc: "Nutze den 'OCR / Tesseract' Tab im Editor, um das rohe Ergebnis des Offline-Scanners zu sehen. Mit 'Use in Parser' kannst du es manuell testen.", color: "text-red-300" },
            ]
        },
        {
            title: t.faqSectionApp,
            items: [
                { icon: Download, title: t.faqPwaTitle, desc: t.faqPwaDesc, tips: t.faqPwaTips, color: "text-teal-500" },
                { icon: Lightbulb, title: t.faqShortcutsTitle, desc: t.faqShortcutsDesc, color: "text-teal-400" },
            ]
        }
    ];

    const toggleSection = (index: number) => {
        setExpandedSection(expandedSection === index ? null : index);
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                        <HelpCircle size={20} className="text-blue-500" />
                        <h3>{t.helpTitle || "Help & Manual"}</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white dark:bg-slate-900">
                    <div className="space-y-4">
                        {sections.map((section, sIndex) => (
                            <div key={sIndex} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => toggleSection(sIndex)}
                                    className="w-full flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                                        {section.title}
                                    </h3>
                                    {expandedSection === sIndex ? (
                                        <ChevronUp size={16} className="text-slate-400" />
                                    ) : (
                                        <ChevronDown size={16} className="text-slate-400" />
                                    )}
                                </button>

                                {expandedSection === sIndex && (
                                    <div className="p-4 bg-white dark:bg-slate-900 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        {section.items.map((item, index) => (
                                            <div key={index} className="space-y-2">
                                                <div className="flex gap-2 items-start">
                                                    <div className={`shrink-0 mt-0.5 ${item.color}`}>
                                                        <item.icon size={18} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 mb-1">{item.title}</h4>
                                                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>

                                                        {item.tips && (
                                                            <div className="mt-2 flex gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-100 dark:border-yellow-900/20">
                                                                <Lightbulb size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                                                                <p className="text-[11px] text-slate-700 dark:text-slate-300 italic">
                                                                    {item.tips}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {index < section.items.length - 1 && (
                                                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-3 ml-6" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 text-center pb-4">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            Version {__APP_VERSION__} &bull; Built with ❤️
                        </p>
                    </div>
                </div>

            </div>
        </>
    );
};
