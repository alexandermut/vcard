import React, { useState } from 'react';
import { Sparkles, RotateCcw, Code, FileText, UploadCloud, Undo2, Clipboard, Copy } from 'lucide-react';
import { parseImpressumSafe } from '../utils/safeParser';
import { parseWithRust, rustToVCardString } from '../utils/rustParser';
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
  ocrRawText?: string; // Raw OCR text from Tesseract to populate parser field
}

export const Editor: React.FC<EditorProps> = ({
  value, onChange, onOptimize, onUndo, canUndo, onReset, onImageDrop, onClearImages, isOptimizing, lang, ocrRawText
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'code' | 'tesseract'>('text');
  const [rawText, setRawText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const t = translations[lang];

  const lastTextRef = React.useRef(value);

  // When OCR result is provided, switch to Tesseract tab but DON'T auto-fill parser
  React.useEffect(() => {
    if (ocrRawText) {
      setActiveTab('tesseract');
    }
  }, [ocrRawText]);

  const handleRawTextChange = async (text: string) => {
    setRawText(text);
    lastTextRef.current = text;

    if (text.trim()) {
      onClearImages();
      try {
        // Try Rust parser first
        let generatedVCard: string;
        try {
          const rustResult = await parseWithRust(text);
          generatedVCard = rustToVCardString(rustResult);
        } catch (rustError) {
          console.warn("Rust parser failed, falling back to TS parser:", rustError);
          // Fallback to TypeScript parser
          generatedVCard = await parseImpressumSafe(text);
        }

        // Only update if the text hasn't changed since we started parsing
        if (lastTextRef.current === text) {
          onChange(generatedVCard);
        }
      } catch (e) {
        console.error("Parser error (timeout or invalid):", e);
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

      {/* Header with Tabs and Actions in 2 Rows */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2 p-3">

        {/* Row 1: Tabs */}
        <div className="flex gap-1 overflow-x-auto w-full no-scrollbar">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'text'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
          >
            <FileText size={14} />
            {t.textTab}
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'code'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
          >
            <Code size={14} />
            {t.codeTab}
          </button>

          {/* OCR / Tesseract Tab */}
          {ocrRawText && (
            <button
              onClick={() => setActiveTab('tesseract')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'tesseract'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
            >
              <FileText size={14} />
              OCR / Tesseract
            </button>
          )}
        </div>

        {/* Row 2: Action Buttons */}
        <div className="flex gap-2 items-center justify-start border-t border-slate-200 dark:border-slate-800 pt-2 w-full">
          {/* Reset */}
          <button
            onClick={() => {
              if (activeTab === 'text') setRawText('');
              onReset();
            }}
            className="text-xs flex items-center gap-1 px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            title={t.reset}
          >
            <RotateCcw size={14} />
            {t.reset}
          </button>

          {/* Einfügen (Paste) - only for text tab */}
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

          {/* Kopieren (Copy) - only for text tab */}
          {activeTab === 'text' && (
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(rawText || value);
                  // Optional: Toast here if needed, but simple copy is fine
                } catch (err) {
                  console.error('Failed to copy', err);
                }
              }}
              className="text-xs flex items-center gap-1 px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
              title={t.copy || "Kopieren"}
            >
              <Copy size={14} />
              {t.copy || "Kopieren"}
            </button>
          )}

          {/* AI Optimize */}
          <button
            onClick={handleOptimizeClick}
            disabled={isOptimizing}
            className={`ml-auto text-xs flex items-center gap-1 px-3 py-1.5 rounded-md transition-all font-medium ${isOptimizing
              ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
              }`}
            title={t.optimize}
          >
            <Sparkles size={14} className={isOptimizing ? 'animate-spin' : ''} />
            {isOptimizing ? 'AI...' : 'AI'}
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
        ) : activeTab === 'code' ? (
          <textarea
            className="absolute inset-0 w-full h-full p-4 font-mono text-sm text-slate-800 dark:text-slate-200 bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/20 dark:focus:ring-blue-500/40 placeholder-slate-400 dark:placeholder-slate-600"
            value={value}
            onChange={(e) => { onChange(e.target.value); }}
            spellCheck={false}
            placeholder="BEGIN:VCARD..."
          />
        ) : (
          /* Tesseract Read-Only View */
          <div className="absolute inset-0 w-full h-full relative">
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={() => {
                  handleRawTextChange(ocrRawText || '');
                  setActiveTab('text');
                }}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded hover:bg-blue-200"
              >
                Use in Parser
              </button>
            </div>
            <textarea
              className="absolute inset-0 w-full h-full p-4 font-mono text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 resize-none focus:outline-none"
              value={ocrRawText}
              readOnly
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
        <span>
          {activeTab === 'text'
            ? `${rawText.length} ${t.chars}`
            : activeTab === 'code' ? `${value.split('\n').length} ${t.lines}` : `${ocrRawText?.length || 0} ${t.chars}`
          }
        </span>
        <span className="uppercase">
          {activeTab === 'text' ? 'Regex Parser' : activeTab === 'code' ? 'vCard 3.0' : 'Tesseract Raw'}
        </span>
      </div>
    </div>
  );
};