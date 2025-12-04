import React, { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon, Plus, ExternalLink, Globe, Linkedin, Facebook, Instagram } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface SocialSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  initialOrg: string;
  onAddUrl: (url: string, platform: string) => void;
  initialPlatform?: string;
  lang: Language;
}

export const SocialSearchModal: React.FC<SocialSearchModalProps> = ({
  isOpen, onClose, initialName, initialOrg, onAddUrl, initialPlatform, lang
}) => {
  const [name, setName] = useState(initialName);
  const [org, setOrg] = useState(initialOrg);
  const [foundUrl, setFoundUrl] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('LINKEDIN');
  const t = translations[lang];

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setOrg(initialOrg);
      setFoundUrl('');
      if (initialPlatform) {
        setSelectedPlatform(initialPlatform.toUpperCase());
      } else {
        setSelectedPlatform('LINKEDIN');
      }
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialName, initialOrg, initialPlatform]);

  if (!isOpen) return null;

  const platforms = [
    { id: 'LINKEDIN', label: 'LinkedIn', domain: 'linkedin.com/in/', icon: Linkedin, color: 'text-blue-700' },
    { id: 'XING', label: 'Xing', domain: 'xing.com/profile', icon: Globe, color: 'text-teal-600' },
    { id: 'INSTAGRAM', label: 'Instagram', domain: 'instagram.com', icon: Instagram, color: 'text-pink-600' },
    { id: 'FACEBOOK', label: 'Facebook', domain: 'facebook.com', icon: Facebook, color: 'text-blue-600' },
    { id: 'TWITTER', label: 'X (Twitter)', domain: 'twitter.com', icon: Globe, color: 'text-slate-800 dark:text-slate-200' },
  ];

  const handleSearch = (platform: typeof platforms[0]) => {
    setSelectedPlatform(platform.id);
    const query = `site:${platform.domain} "${name}" ${org ? `"${org}"` : ''}`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  const handleAdd = () => {
    if (foundUrl) {
      onAddUrl(foundUrl, selectedPlatform);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">

        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Search size={20} className="text-blue-600 dark:text-blue-400" />
            {t.socialTitle}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Search Parameters */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3 block">{t.searchParams}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vorname Nachname"
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="Firma / Stadt"
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Platform Grid */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3 block">{t.startSearch}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {platforms.map(p => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSearch(p)}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                  >
                    <Icon size={24} className={`${p.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{p.label}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                      {t.googleSearch} <ExternalLink size={8} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 my-4"></div>

          {/* Add URL Section */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3 block">{t.addLink}</label>
            <div className="flex gap-2 items-start">
              <div className="w-1/3">
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {platforms.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                  <option value="SOCIAL">{t.other}</option>
                </select>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={foundUrl}
                  onChange={(e) => setFoundUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

        </div>

        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
            {t.cancel}
          </button>
          <button
            onClick={handleAdd}
            disabled={!foundUrl}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm flex items-center gap-2 transition-all ${!foundUrl
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
              }`}
          >
            <Plus size={16} />
            {t.addToVCard}
          </button>
        </div>

      </div>
    </div>
  );
};