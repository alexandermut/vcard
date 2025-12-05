import React, { useEffect, useState } from 'react';
import { ParsedVCard, VCardData, Language, VCardAddress, HistoryItem } from '../types';
import { User, Building2, Phone, Mail, Globe, MapPin, Award, Send, ExternalLink, Search, Linkedin, Facebook, Instagram, Twitter, Github, Youtube, Music, Mic, Video, Cake, Image as ImageIcon, Save, Download, QrCode, Share2, StickyNote, Tag, Plus, X, Archive } from 'lucide-react';
import { generateVCardFromData, generateContactFilename } from '../utils/vcardUtils';
import { createGoogleContact } from '../services/googleContactsService';
import { mapVCardToGooglePerson } from '../utils/googleMapper';
import { generateContactZip, downloadZip } from '../utils/zipUtils';
import { toast } from 'sonner';
import { translations } from '../utils/translations';

interface PreviewCardProps {
  parsed: ParsedVCard;
  onShowQR: () => void;
  onSocialSearch: (platform: string) => void;
  onUpdate: (vcard: string) => void;
  onSave: () => void;
  onDownload: () => void;
  onViewNotes?: () => void;
  onAIEnhance?: () => void; // AI enhancement for offline scans
  lang: Language;
  images?: string[];
  token?: string; // Added token prop
}

export const PreviewCard: React.FC<PreviewCardProps> = ({
  parsed, onShowQR, onSocialSearch, onUpdate, onSave, onDownload, onViewNotes, onAIEnhance, lang, images, token
}) => {
  const t = translations[lang];
  const [localData, setLocalData] = useState<VCardData>(parsed.data);
  const [isZipping, setIsZipping] = useState(false);

  useEffect(() => {
    setLocalData(parsed.data);
  }, [parsed]);

  const updateField = (field: keyof VCardData, value: string) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    onUpdate(generateVCardFromData(newData));
  };

  const updateArrayField = (field: 'email' | 'tel' | 'url', index: number, key: string, value: string) => {
    const newArray = [...(localData[field] || [])];
    newArray[index] = { ...newArray[index], [key]: value };
    const newData = { ...localData, [field]: newArray };
    setLocalData(newData);
    onUpdate(generateVCardFromData(newData));
  };

  const updateAddressField = (index: number, key: keyof VCardAddress, value: string) => {
    const newAdr = [...(localData.adr || [])];
    newAdr[index] = { ...newAdr[index], value: { ...newAdr[index].value, [key]: value } };
    const newData = { ...localData, adr: newAdr };
    setLocalData(newData);
    onUpdate(generateVCardFromData(newData));
  };

  const getUrlStyle = (type: string, value: string) => {
    const t = type.toUpperCase();
    if (t.includes('LINKEDIN')) return { icon: Linkedin, colorBg: 'bg-[#0077b5]/10', colorText: 'text-[#0077b5]', label: 'LinkedIn' };
    if (t.includes('XING')) return { icon: User, colorBg: 'bg-[#006567]/10', colorText: 'text-[#006567]', label: 'Xing' };
    if (t.includes('TWITTER') || t.includes('X')) return { icon: Twitter, colorBg: 'bg-slate-900/10 dark:bg-slate-100/10', colorText: 'text-slate-900 dark:text-slate-100', label: 'X / Twitter' };
    if (t.includes('FACEBOOK')) return { icon: Facebook, colorBg: 'bg-[#1877F2]/10', colorText: 'text-[#1877F2]', label: 'Facebook' };
    if (t.includes('INSTAGRAM')) return { icon: Instagram, colorBg: 'bg-[#E4405F]/10', colorText: 'text-[#E4405F]', label: 'Instagram' };
    if (t.includes('GITHUB')) return { icon: Github, colorBg: 'bg-slate-900/10 dark:bg-slate-100/10', colorText: 'text-slate-900 dark:text-slate-100', label: 'GitHub' };
    if (t.includes('YOUTUBE')) return { icon: Youtube, colorBg: 'bg-[#FF0000]/10', colorText: 'text-[#FF0000]', label: 'YouTube' };
    if (t.includes('TIKTOK')) return { icon: Music, colorBg: 'bg-[#000000]/10 dark:bg-white/10', colorText: 'text-black dark:text-white', label: 'TikTok' };
    return { icon: Globe, colorBg: 'bg-slate-100 dark:bg-slate-800', colorText: 'text-slate-600 dark:text-slate-400', label: 'Website' };
  };

  const IMPORTANT_SOCIALS = ['LINKEDIN', 'XING'];
  const existingUrlTypes = localData.url?.map(u => u.type.toUpperCase()) || [];
  const primaryPhone = localData.tel?.[0]?.value;
  const primaryEmail = localData.email?.[0]?.value;
  const photoUrl = images && images.length > 0 ? images[0] : null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const file = new File([generateVCardFromData(localData)], `${generateContactFilename({ fn: localData.fn, org: localData.org })}.vcf`, { type: 'text/vcard' });
        await navigator.share({
          title: localData.fn || 'vCard',
          text: `vCard: ${localData.fn} `,
          files: [file]
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(generateVCardFromData(localData));
        toast.error(t.shareError + " (Copied to Clipboard)");
      } catch (e) {
        toast.error(t.shareError);
      }
    }
  };

  const handleZipExport = async () => {
    setIsZipping(true);
    try {
      // Construct temp item
      const tempItem: HistoryItem = {
        id: 'export_' + Date.now(),
        timestamp: Date.now(),
        name: localData.fn || 'Contact',
        org: localData.org,
        vcard: generateVCardFromData(localData),
        images: images || []
      };

      const filename = generateContactFilename({ fn: localData.fn, org: localData.org });
      const blob = await generateContactZip(tempItem, filename);
      downloadZip(blob, `${filename}.zip`);
      toast.success(t.exportSuccess || "Export erfolgreich!");
    } catch (e) {
      console.error("Zip Export failed", e);
      toast.error("ZIP Export fehlgeschlagen");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col transition-colors duration-200 relative">
      <div className="h-14 bg-gradient-to-r from-blue-600 to-indigo-600 relative shrink-0 flex justify-end items-center px-4 gap-2">
        <div className="flex items-center gap-1">
          {onViewNotes && (
            <button
              onClick={onViewNotes}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title={t.notes || "Notes"}
            >
              <StickyNote size={18} />
            </button>
          )}
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
          {onAIEnhance && images && images.length > 0 && (
            <button
              onClick={onAIEnhance}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors relative group"
              title="Mit AI verbessern"
            >
              <span className="text-lg">✨</span>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Mit AI verbessern
              </span>
            </button>
          )}
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={t.share}
          >
            <Share2 size={18} />
          </button>
          <button
            onClick={handleZipExport}
            disabled={isZipping}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
            title="Alles exportieren (ZIP)"
          >
            <Archive size={18} />
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
                href={`tel:${primaryPhone} `}
                className="flex-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-green-200 dark:border-green-800"
              >
                <Phone size={14} /> {t.call}
              </a>
            )}
            {primaryEmail && (
              <a
                href={`mailto:${primaryEmail} `}
                className="flex-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-blue-200 dark:border-blue-800"
              >
                <Send size={14} /> {t.email}
              </a>
            )}
          </div>

          {/* Categories / Tags - MOVED TO BACKLOG
          <div className="mt-4 flex flex-wrap gap-2">
            {localData.categories?.map((tag, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
                <Tag size={12} />
                {tag}
                <button
                  onClick={() => {
                    const newCats = localData.categories?.filter((_, idx) => idx !== i);
                    // Assuming handleUpdate is a function that updates localData and calls onUpdate
                    // If not, this needs to be adapted to the existing updateField/setLocalData pattern
                    const newData = { ...localData, categories: newCats };
                    setLocalData(newData);
                    onUpdate(generateVCardFromData(newData));
                  }}
                  className="hover:text-red-500"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder={t.addTag || "Tag..."}
                className="w-20 px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      const newTags = [...(localData.categories || []), val];
                      // We need to update state.
                      const newData = { ...localData, categories: newTags };
                      setLocalData(newData);
                      onUpdate(generateVCardFromData(newData));
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
            </div>
          </div>
          */}
        </div>

        <div className="space-y-4 pb-8">
          <div className="grid gap-3">
            {localData.email?.map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group">
                <a href={`mailto:${e.value} `} className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer" title={t.email}>
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

            {localData.tel?.map((telItem, i) => (
              <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group">
                <a href={`tel:${telItem.value} `} className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors cursor-pointer" title={t.call}>
                  <Phone size={16} />
                </a>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider font-semibold">{telItem.type}</p>
                  <input
                    value={telItem.value}
                    onChange={(ev) => updateArrayField('tel', i, 'value', ev.target.value)}
                    className="text-sm text-slate-800 dark:text-slate-200 font-mono w-full bg-transparent border-none p-0 focus:ring-0"
                  />
                </div>
              </div>
            ))}



            {localData.url?.map((u, i) => {
              const style = getUrlStyle(u.type, u.value);
              const Icon = style.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group relative">
                  <a href={u.value} target="_blank" rel="noopener noreferrer" className={`w - 8 h - 8 rounded - full flex items - center justify - center transition - colors shrink - 0 ${style.colorBg} ${style.colorText} hover: opacity - 80 cursor - pointer`}>
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
                  <div className={`w - 8 h - 8 rounded - full flex items - center justify - center transition - colors shrink - 0 opacity - 50 grayscale group - hover: grayscale - 0 group - hover: opacity - 100 ${style.colorBg} ${style.colorText} `}>
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
                </a >
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
              </div >
            ))}
          </div >

          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-500 mb-1">{t.noteLabel}</p>
            <textarea
              value={localData.note || ''}
              onChange={(e) => updateField('note', e.target.value)}
              className="text-sm text-yellow-900 dark:text-yellow-200 w-full bg-transparent border-none p-0 focus:ring-0 resize-none"
              placeholder={t.notes}
              rows={3}
            />
          </div>

          {/* Images Section */}
          {
            images && images.length > 0 && (
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
            )
          }

        </div >
      </div >
    </div >
  );
};