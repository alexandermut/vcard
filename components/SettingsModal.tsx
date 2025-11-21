import React, { useState, useEffect } from 'react';
import { X, Check, ExternalLink, Sparkles, Settings2, Moon, Sun, Languages } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  apiKey: string;
  lang: Language;
  setLang: (lang: Language) => void;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  errorMessage?: string | null;
  llmProvider: 'google' | 'custom';
  setLLMProvider: (provider: 'google' | 'custom') => void;
  customBaseUrl: string;
  customApiKey: string;
  customModel: string;
  setCustomConfig: (config: { customBaseUrl: string; customApiKey: string; customModel: string }) => void;
  onOllamaDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, onSave, apiKey, lang, setLang, isDarkMode, setIsDarkMode, errorMessage,
  llmProvider, setLLMProvider, customBaseUrl, customApiKey, customModel, setCustomConfig, onOllamaDefaults
}) => {
  // Local state for input
  const [key, setKey] = useState('');
  const [localBaseUrl, setLocalBaseUrl] = useState('');
  const [localApiKey, setLocalApiKey] = useState('');
  const [localModel, setLocalModel] = useState('');
  const [hasSystemKey, setHasSystemKey] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    if (isOpen) {
      setKey(apiKey);
      setLocalBaseUrl(customBaseUrl);
      setLocalApiKey(customApiKey);
      setLocalModel(customModel);
      checkSystemKey();
    }
  }, [isOpen, apiKey, customBaseUrl, customApiKey, customModel]);

  const checkSystemKey = async () => {
    if ((window as any).aistudio && typeof (window as any).aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setHasSystemKey(hasKey);
    }
  };

  const handleConnectGoogle = async () => {
    if ((window as any).aistudio && typeof (window as any).aistudio.openSelectKey === 'function') {
      try {
        await (window as any).aistudio.openSelectKey();
        await checkSystemKey();
      } catch (e) {
        console.error("Failed to open key selector", e);
      }
    } else {
      window.open('https://aistudio.google.com/app/apikey', '_blank');
    }
  };

  const handleSave = () => {
    onSave(key);
    setCustomConfig({
      customBaseUrl: localBaseUrl,
      customApiKey: localApiKey,
      customModel: localModel,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Settings2 size={18} className="text-slate-600 dark:text-slate-400" />
            {t.settingsTitle}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-white dark:bg-slate-900">

          {errorMessage && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                {errorMessage}
              </p>
            </div>
          )}

          <div className="space-y-6">

            {/* App Settings */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">App</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
                  className="flex items-center justify-center gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  <Languages size={16} />
                  {lang === 'de' ? 'Deutsch' : 'English'}
                </button>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="flex items-center justify-center gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
                  {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </button>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">{t.geminiIntegration}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t.geminiDesc}</p>
              </div>
            </div>

            {/* LLM Provider Selection */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t.llmProvider}</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setLLMProvider('google')}
                  className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${llmProvider === 'google'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                >
                  {t.googleDefault}
                </button>
                <button
                  type="button"
                  onClick={() => setLLMProvider('custom')}
                  className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${llmProvider === 'custom'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                >
                  {t.customLLM}
                </button>
              </div>
            </div>

            {llmProvider === 'google' ? (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                  <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                    {t.recommended}
                  </h3>
                  <button
                    onClick={handleConnectGoogle}
                    className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium py-2 px-4 rounded-lg transition-all shadow-sm active:scale-[0.98] text-sm"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    {hasSystemKey ? t.connected : t.connectGoogle}
                  </button>
                </div>

                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 dark:text-slate-500">{t.orManual}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                    {t.apiKeyLabel}
                  </label>
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 font-mono"
                  />
                  <div className="mt-1 flex justify-end">
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                      {t.generateKey} <ExternalLink size={8} />
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Custom LLM Settings</h4>
                  <button
                    type="button"
                    onClick={onOllamaDefaults}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t.ollamaDefaults}
                  </button>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">{t.baseUrl}</label>
                  <input
                    type="text"
                    value={localBaseUrl}
                    onChange={(e) => setLocalBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434/v1"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">API Key (optional)</label>
                  <input
                    type="password"
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">{t.modelName}</label>
                  <input
                    type="text"
                    value={localModel}
                    onChange={(e) => setLocalModel(e.target.value)}
                    placeholder="llama3"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                  />
                </div>
              </div>
            )}

          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 rounded-lg shadow-sm flex items-center gap-2"
          >
            <Check size={16} />
            {t.saveSettings}
          </button>
        </div>
      </div>
    </div>
  );
};