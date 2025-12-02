import React, { useState } from 'react';
import { Sparkles, RotateCcw, Code, FileText, UploadCloud, Undo2, Clipboard } from 'lucide-react';
import { parseImpressumSafe } from '../utils/safeParser';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
  onOptimize: (input: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  onReset: () => void;
  onImageDrop: (file: File) => void;
  onClearImages: () => void;
  isOptimizing: boolean;
  lang: Language;
}

export const Editor: React.FC<EditorProps> = ({
  value, onChange, onOptimize, onUndo, canUndo, onReset, onImageDrop, onClearImages, isOptimizing, lang
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'code'>('text');
  const [rawText, setRawText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const t = translations[lang];

  const handleRawTextChange = async (text: string) => {
    setRawText(text);
    if (text.trim()) {
      onClearImages();
      try {
        const generatedVCard = await parseImpressumSafe(text);
        onChange(generatedVCard);
      } catch (e) {
        console.error("Parser error (timeout or invalid):", e);
        // Optionally show error state in UI, but for now just log it to avoid spamming user while typing
      }
    }
  };

  const handleOptimizeClick = () => {
    if (activeTab === 'text') {
      onOptimize(rawText);
    } else {
      onOptimize(value);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items[0].kind === 'file') {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageDrop(file);
      }
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-200 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-50/90 dark:bg-slate-800/90 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-dashed border-blue-500 m-2 rounded-lg animate-in fade-in duration-200">
          <UploadCloud size={64} className="text-blue-600 dark:text-blue-400 mb-4" />
          <p className="text-xl font-bold text-slate-800 dark:text-white">{t.dragDropTitle}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t.dragDropSubtitle}</p>
        </div>
      )}

      {/* Header with Tabs */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2">

        <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-lg self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'text'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            <FileText size={14} />
            {t.textTab}
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'code'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            <Code size={14} />
            {t.codeTab}
          </button>
        </div>

        <div className="flex gap-2 items-center self-end sm:self-auto">
          <button
            onClick={() => {
              if (activeTab === 'text') setRawText('');
              onReset();
            }}
            className="text-xs flex items-center gap-1 px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
            title={t.reset}
          >
            <RotateCcw size={14} />
            {t.reset}
          </button>

          {canUndo && (
            <button
              onClick={onUndo}
              className="text-xs flex items-center gap-1 px-3 py-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-colors animate-in fade-in slide-in-from-right-2"
              title={t.undo}
            >
              <Undo2 size={14} />
              {t.undo}
            </button>
          )}

          {activeTab === 'text' && (
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) {
                    handleRawTextChange(text);
                  }
                } catch (err) {
                  console.error('Failed to read clipboard', err);
                }
              }}
              className="text-xs flex items-center gap-1 px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
              title={t.paste}
            >
              <Clipboard size={14} />
              {t.paste}
            </button>
          )}

          <button
            onClick={handleOptimizeClick}
            disabled={isOptimizing}
            className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-md text-white font-medium transition-all shadow-sm ${isOptimizing
              ? 'bg-purple-400 cursor-not-allowed opacity-70'
              : 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500'
              }`}
          >
            <Sparkles size={14} className={isOptimizing ? "animate-spin" : ""} />
            {isOptimizing ? t.working : t.aiCorrect}
          </button>

        </div>
      </div>

      {/* Content Area */}
      <div className="relative flex-1 min-h-[300px]">
        {activeTab === 'text' ? (
          <textarea
            className="absolute inset-0 w-full h-full p-4 font-sans text-sm text-slate-800 dark:text-slate-200 bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/20 dark:focus:ring-blue-500/40 placeholder-slate-400 dark:placeholder-slate-600"
            value={rawText}
            onChange={(e) => handleRawTextChange(e.target.value)}
            spellCheck={false}
            placeholder={t.textPlaceholder}
          />
        ) : (
          <textarea
            className="absolute inset-0 w-full h-full p-4 font-mono text-sm text-slate-800 dark:text-slate-200 bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/20 dark:focus:ring-blue-500/40 placeholder-slate-400 dark:placeholder-slate-600"
            value={value}
            onChange={(e) => { onChange(e.target.value); }}
            spellCheck={false}
            placeholder="BEGIN:VCARD..."
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
        <span>
          {activeTab === 'text'
            ? `${rawText.length} ${t.chars}`
            : `${value.split('\n').length} ${t.lines}`
          }
        </span>
        <span className="uppercase">
          {activeTab === 'text' ? 'Regex Parser' : 'vCard 3.0'}
        </span>
      </div>
    </div>
  );
};