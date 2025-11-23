import React, { useEffect, useState } from 'react';
import { ParsedVCard, VCardData, Language, VCardAddress } from '../types';
import { User, Building2, Phone, Mail, Globe, MapPin, Award, Send, ExternalLink, Search, Linkedin, Facebook, Instagram, Twitter, Github, Youtube, Music, Mic, Video, Cake, Image as ImageIcon, Save, Download, QrCode } from 'lucide-react';
import { generateVCardFromData } from '../utils/vcardUtils';
import { translations } from '../utils/translations';

interface PreviewCardProps {
  parsed: ParsedVCard;
  onShowQR: () => void;
  onSocialSearch: (platform?: string) => void;
  onUpdate: (newVCard: string) => void;
  onSave: () => void;
  onDownload: () => void;
  lang: Language;
  images?: string[];
}

const IMPORTANT_SOCIALS = ['LINKEDIN', 'XING', 'INSTAGRAM'];

export const PreviewCard: React.FC<PreviewCardProps> = ({ parsed, onShowQR, onSocialSearch, onUpdate, onSave, onDownload, lang, images }) => {
  const [localData, setLocalData] = useState<VCardData>(parsed.data);
  const t = translations[lang];

  useEffect(() => {
    setLocalData(parsed.data);
  }, [parsed]);

  const updateField = (field: keyof VCardData, value: any) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    const newVCard = generateVCardFromData(newData);
    onUpdate(newVCard);
  };

  const updateArrayField = (field: 'tel' | 'email' | 'url', index: number, key: 'type' | 'value', newValue: string) => {
    const newArray = [...(localData[field] || [])];
    if (newArray[index]) {
      newArray[index] = { ...newArray[index], [key]: newValue };
      updateField(field, newArray);
    }
  };

  const updateAddressField = (index: number, key: keyof VCardAddress, newValue: string) => {
    const newAdrs = [...(localData.adr || [])];
    if (newAdrs[index]) {
      newAdrs[index] = {
        ...newAdrs[index],
        value: { ...newAdrs[index].value, [key]: newValue }
      };
      updateField('adr', newAdrs);
    }
  };

  const getPhotoSrc = (photoString?: string) => {
    if (!photoString) return undefined;
    if (photoString.startsWith('http')) return photoString;
    return photoString;
  };

  const photoUrl = getPhotoSrc(localData.photo);

  const getUrlStyle = (type: string, value: string) => {
    const t = type.toUpperCase();
    const v = value.toLowerCase();

    if (t.includes('LINKEDIN') || v.includes('linkedin.com')) {
      return { icon: Linkedin, colorBg: 'bg-blue-50 dark:bg-blue-900/20', colorText: 'text-blue-700 dark:text-blue-400', label: 'LinkedIn' };
    }
    if (t.includes('FACEBOOK') || v.includes('facebook.com')) {
      return { icon: Facebook, colorBg: 'bg-indigo-50 dark:bg-indigo-900/20', colorText: 'text-indigo-600 dark:text-indigo-400', label: 'Facebook' };
    }
    if (t.includes('INSTAGRAM') || v.includes('instagram.com')) {
      return { icon: Instagram, colorBg: 'bg-pink-50 dark:bg-pink-900/20', colorText: 'text-pink-600 dark:text-pink-400', label: 'Instagram' };
    }
    if (t.includes('XING') || v.includes('xing.com')) {
      return { icon: Globe, colorBg: 'bg-teal-50 dark:bg-teal-900/20', colorText: 'text-teal-700 dark:text-teal-400', label: 'Xing' };
    }
    if (t.includes('TWITTER') || t.includes('X') || v.includes('twitter.com') || v.includes('x.com')) {
      return { icon: Twitter, colorBg: 'bg-slate-100 dark:bg-slate-800', colorText: 'text-slate-700 dark:text-slate-300', label: 'X / Twitter' };
    }
    if (t.includes('GITHUB') || v.includes('github.com')) {
      return { icon: Github, colorBg: 'bg-slate-100 dark:bg-slate-800', colorText: 'text-slate-900 dark:text-slate-100', label: 'GitHub' };
    }
    if (t.includes('YOUTUBE') || v.includes('youtube.com') || v.includes('youtu.be')) {
      return { icon: Youtube, colorBg: 'bg-red-50 dark:bg-red-900/20', colorText: 'text-red-600 dark:text-red-400', label: 'YouTube' };
    }
    if (t.includes('TIKTOK') || v.includes('tiktok.com')) {
      return { icon: Video, colorBg: 'bg-slate-100 dark:bg-slate-800', colorText: 'text-slate-900 dark:text-slate-100', label: 'TikTok' };
    }
    if (t.includes('PODCAST') || v.includes('podcast')) {
      return { icon: Mic, colorBg: 'bg-purple-50 dark:bg-purple-900/20', colorText: 'text-purple-600 dark:text-purple-400', label: 'Podcast' };
    }
    if (t.includes('MUSIC') || v.includes('music.apple') || v.includes('spotify')) {
      return { icon: Music, colorBg: 'bg-rose-50 dark:bg-rose-900/20', colorText: 'text-rose-600 dark:text-rose-400', label: 'Music' };
    }

    return { icon: Globe, colorBg: 'bg-purple-50 dark:bg-purple-900/20', colorText: 'text-purple-600 dark:text-purple-400', label: type };
  };

  if (!parsed.isValid) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 transition-colors duration-200">
        <User size={48} className="mb-4 opacity-20" />
        <p className="text-lg font-medium">{t.noCard}</p>
        <p className="text-sm mt-2">{t.noCardHint}</p>
      </div>
    );
  }

  const primaryEmail = localData.email?.find(e => e.value && e.value.trim().length > 0)?.value;
  const primaryPhone = localData.tel?.find(t => t.value && t.value.trim().length > 0)?.value;
  const existingUrlTypes = localData.url?.map(u => u.type.toUpperCase()) || [];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col transition-colors duration-200 relative">
      <div className="h-14 bg-gradient-to-r from-blue-600 to-indigo-600 relative shrink-0 flex justify-end items-center px-4 gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={onShowQR}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={t.showQR}
          >
            <QrCode size={18} />
          </button>
          <button
            onClick={onSave}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={t.saveHistory}
          >
            <Save size={18} />
          </button>
          <button
            onClick={onDownload}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={t.export}
          >
            <Download size={18} />
          </button>
        </div>

        <div className="absolute -bottom-8 left-6">
          <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 p-1 shadow-md">
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="w-full h-full rounded-full object-cover bg-slate-200 dark:bg-slate-700" />
            ) : (
              <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500">
                <User size={28} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-10 px-6 pb-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="mb-6">
          <div className="flex flex-col gap-1">
            <input
              value={localData.fn || ''}
              onChange={(e) => updateField('fn', e.target.value)}
              className="text-xl font-bold text-slate-900 dark:text-white leading-tight bg-transparent border-none p-0 focus:ring-0 placeholder-slate-300 dark:placeholder-slate-600 w-full"
              placeholder={t.fullName}
            />

            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mt-1 font-medium text-sm">
              <Award size={14} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
              <input
                value={localData.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                className="bg-transparent border-none p-0 focus:ring-0 w-full placeholder-slate-300 dark:placeholder-slate-600"
                placeholder={t.title}
              />
            </div>

            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-1 text-sm">
              <Building2 size={14} className="shrink-0" />
              <input
                value={localData.org || ''}
                onChange={(e) => updateField('org', e.target.value)}
                className="bg-transparent border-none p-0 focus:ring-0 w-full placeholder-slate-300 dark:placeholder-slate-600"
                placeholder={t.company}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            {primaryPhone && (
              <a
                href={`tel:${primaryPhone}`}
                className="flex-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-green-200 dark:border-green-800"
              >
                <Phone size={14} /> {t.call}
              </a>
            )}
            {primaryEmail && (
              <a
                href={`mailto:${primaryEmail}`}
                className="flex-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-blue-200 dark:border-blue-800"
              >
                <Send size={14} /> {t.email}
              </a>
            )}
          </div>
        </div>

        <div className="space-y-4 pb-8">
          <div className="grid gap-3">
            {localData.email?.map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group">
                <a href={`mailto:${e.value}`} className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer" title={t.email}>
                  <Mail size={16} />
                </a>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider font-semibold">{e.type}</p>
                  <input
                    value={e.value}
                    onChange={(ev) => updateArrayField('email', i, 'value', ev.target.value)}
                    className="text-sm text-slate-800 dark:text-slate-200 w-full bg-transparent border-none p-0 focus:ring-0"
                  />
                </div>
              </div>
            ))}

            {localData.tel?.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group">
                <a href={`tel:${t.value}`} className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors cursor-pointer" title={t.call}>
                  <Phone size={16} />
                </a>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider font-semibold">{t.type}</p>
                  <input
                    value={t.value}
                    onChange={(ev) => updateArrayField('tel', i, 'value', ev.target.value)}
                    className="text-sm text-slate-800 dark:text-slate-200 font-mono w-full bg-transparent border-none p-0 focus:ring-0"
                  />
                </div>
              </div>
            ))}

            <div className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group">
              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Cake size={16} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider font-semibold">{t.birthday}</p>
                <input
                  value={localData.bday || ''}
                  onChange={(ev) => updateField('bday', ev.target.value)}
                  className="text-sm text-slate-800 dark:text-slate-200 w-full bg-transparent border-none p-0 focus:ring-0"
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </div>

            {localData.url?.map((u, i) => {
              const style = getUrlStyle(u.type, u.value);
              const Icon = style.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group relative">
                  <a href={u.value} target="_blank" rel="noopener noreferrer" className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${style.colorBg} ${style.colorText} hover:opacity-80 cursor-pointer`}>
                    <Icon size={16} />
                  </a>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider font-semibold">{style.label}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onSocialSearch(u.type)} className="text-slate-400 hover:text-blue-500">
                          <Search size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        value={u.value}
                        onChange={(ev) => updateArrayField('url', i, 'value', ev.target.value)}
                        className="text-sm text-blue-600 dark:text-blue-400 w-full bg-transparent border-none p-0 focus:ring-0 hover:underline"
                      />
                      <a href={u.value} target="_blank" rel="noopener noreferrer" className="ml-1 text-slate-400 hover:text-blue-500">
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}

            {IMPORTANT_SOCIALS.map(platform => {
              if (existingUrlTypes.includes(platform)) return null;
              const style = getUrlStyle(platform, '');
              const Icon = style.icon;

              return (
                <div key={platform} className="flex items-center gap-3 p-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg transition-colors group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 ${style.colorBg} ${style.colorText}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">{style.label}</span>
                    <button
                      onClick={() => onSocialSearch(platform)}
                      className="text-xs flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded-md transition-colors"
                    >
                      <Search size={12} /> {t.search}
                    </button>
                  </div>
                </div>
              );
            })}

            {localData.adr?.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.value.street}, ${a.value.zip} ${a.value.city}, ${a.value.country}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 mt-1 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors cursor-pointer"
                  title="Google Maps"
                >
                  <MapPin size={16} />
                </a>
                <div className="flex-1 overflow-hidden space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider font-semibold">{a.type}</p>

                  <input
                    value={a.value.street}
                    onChange={(ev) => updateAddressField(i, 'street', ev.target.value)}
                    className="text-sm text-slate-800 dark:text-slate-200 w-full bg-transparent border-none p-0 focus:ring-0 placeholder-slate-400"
                    placeholder={t.street}
                  />
                  <div className="flex gap-2">
                    <input
                      value={a.value.zip}
                      onChange={(ev) => updateAddressField(i, 'zip', ev.target.value)}
                      className="text-sm text-slate-800 dark:text-slate-200 w-20 bg-transparent border-none p-0 focus:ring-0 placeholder-slate-400"
                      placeholder={t.zip}
                    />
                    <input
                      value={a.value.city}
                      onChange={(ev) => updateAddressField(i, 'city', ev.target.value)}
                      className="text-sm text-slate-800 dark:text-slate-200 w-full bg-transparent border-none p-0 focus:ring-0 placeholder-slate-400"
                      placeholder={t.city}
                    />
                  </div>
                  <input
                    value={a.value.country}
                    onChange={(ev) => updateAddressField(i, 'country', ev.target.value)}
                    className="text-sm text-slate-800 dark:text-slate-200 w-full bg-transparent border-none p-0 focus:ring-0 placeholder-slate-400"
                    placeholder={t.country}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-500 mb-1">{t.noteLabel}</p>
            <textarea
              value={localData.note || ''}
              onChange={(e) => updateField('note', e.target.value)}
              className="text-sm text-yellow-900 dark:text-yellow-200 italic w-full bg-transparent border-none p-0 focus:ring-0 resize-none"
              placeholder={t.notes}
              rows={3}
            />
          </div>

          {/* Images Section */}
          {images && images.length > 0 && (
            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 flex items-center gap-2">
                <ImageIcon size={14} /> {t.scans}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 group bg-slate-100 dark:bg-slate-800/50">
                    <img
                      src={img}
                      alt={`Scan ${idx + 1}`}
                      className="w-full h-auto object-contain hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};