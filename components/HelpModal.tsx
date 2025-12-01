import React from 'react';
import { X, HelpCircle, Scan, Edit3, StickyNote, Download, Shield } from 'lucide-react';
import { translations } from '../utils/translations';
import { Language } from '../types';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    lang: Language;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, lang }) => {
    if (!isOpen) return null;

    const t = translations[lang];

    const sections = [
        {
            title: t.faqSectionScan,
            items: [
                { icon: Scan, title: t.faqScanTitle, desc: t.faqScanDesc, color: "text-blue-500" },
                { icon: Scan, title: t.faqQrTitle, desc: t.faqQrDesc, color: "text-blue-400" },
            ]
        },
        {
            title: t.faqSectionEdit,
            items: [
                { icon: Edit3, title: t.faqEditTitle, desc: t.faqEditDesc, color: "text-green-500" },
                { icon: Edit3, title: t.faqSocialTitle, desc: t.faqSocialDesc, color: "text-green-400" },
            ]
        },
        {
            title: t.faqSectionNotes,
            items: [
                { icon: StickyNote, title: t.faqNotesTitle, desc: t.faqNotesDesc, color: "text-yellow-500" },
                { icon: StickyNote, title: t.faqHybridTitle, desc: t.faqHybridDesc, color: "text-yellow-400" },
            ]
        },
        {
            title: t.faqSectionData,
            items: [
                { icon: Download, title: t.faqHistoryTitle, desc: t.faqHistoryDesc, color: "text-purple-500" },
                { icon: Download, title: t.faqExportTitle, desc: t.faqExportDesc, color: "text-purple-400" },
            ]
        },
        {
            title: t.faqSectionPrivacy,
            items: [
                { icon: Shield, title: t.faqPrivacyTitle, desc: t.faqPrivacyDesc, color: "text-slate-500" },
                { icon: Shield, title: t.faqAiTitle, desc: t.faqAiDesc, color: "text-slate-400" },
            ]
        }
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">

                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <HelpCircle size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t.helpTitle || "Help & Manual"}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-8">
                        {sections.map((section, sIndex) => (
                            <div key={sIndex}>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 px-1">
                                    {section.title}
                                </h3>
                                <div className="grid gap-4">
                                    {section.items.map((item, index) => (
                                        <div key={index} className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                                            <div className={`shrink-0 mt-1 ${item.color}`}>
                                                <item.icon size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{item.title}</h4>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            Version {__APP_VERSION__} &bull; Built with ❤️
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};
