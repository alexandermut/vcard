import { VCardData, ParsedVCard, VCardAddress } from '../types';

export const DEFAULT_VCARD = `BEGIN:VCARD
VERSION:3.0
REV:2025-11-20T00:00:00Z
N:Mut;Alexander;;;
FN:Alexander Mut
ORG:abcfinance GmbH
TITLE:Finanzierung, Leasing, Factoring
TEL;WORK:00491715528187
TEL;HOME:004915151002767
EMAIL;INTERNET;WORK:Alexander.Mut@abcfinance.de
EMAIL;INTERNET;HOME:mutalex@gmail.com
URL;HOME:https://alexandermut.de
URL;HOME:https://vcardabc.alexandermut.de
URL;TYPE=YOUTUBE:https://www.youtube.com/@AlexanderMut/videos
URL;TYPE=LINKEDIN:https://www.linkedin.com/in/alexandermut
URL;TYPE=INSTAGRAM:https://instagram.com/alexandermut
URL;TYPE=PODCAST:https://podcast-apple.alexmut.de
URL;TYPE=PODCAST:https://podcast-spotify.alexmut.de
URL;TYPE=MUSIC:https://music.apple.com/de/artist/alexander-mut/1780746079
URL;TYPE=FACEBOOK:https://www.facebook.com/alexmutalex
URL;TYPE=XING:https://www.xing.com/profile/Alexander_Mut
URL;TYPE=TIKTOK:https://tiktok.com/@mutalex
ADR;POSTAL:;;Butzweilerstrasse 35-39;Koeln;;50829;Deutschland
ADR;WORK:;;Kamekestrasse 2-8;Koeln;;50672;Deutschland
ADR;OTHER:;;Bramfelder Strasse 110a;Hamburg;;22305;Deutschland
END:VCARD`;

import { VCardParser } from './vcardParser';

// A simple, robust regex-based parser for display purposes
export const parseVCardString = (vcard: string): ParsedVCard => {
  const result = VCardParser.parse(vcard);
  return {
    ...result,
    raw: vcard
  };
};

export const generateVCardFromData = (data: VCardData): string => {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];

  // Always add a fresh revision timestamp
  lines.push(`REV:${new Date().toISOString()}`);

  // UID Handling: Use existing or generate new
  if (data.uid) {
    lines.push(`UID:${data.uid}`);
  } else {
    lines.push(`UID:urn:uuid:${crypto.randomUUID()}`);
  }

  // Name handling
  if (data.n) {
    // If we have a structured N field, use it
    lines.push(`N;CHARSET=utf-8:${data.n}`);
  } else {
    // Fallback: Construct N from FN (simple split)
    const nameParts = (data.fn || '').split(' ');
    const lastName = nameParts.length > 1 ? nameParts.pop() : '';
    const firstName = nameParts.join(' ');
    lines.push(`N;CHARSET=utf-8:${lastName};${firstName};;;`);
  }

  if (data.fn) lines.push(`FN;CHARSET=utf-8:${data.fn}`);

  if (data.org) lines.push(`ORG;CHARSET=utf-8:${data.org}`);
  if (data.title) lines.push(`TITLE;CHARSET=utf-8:${data.title}`);
  if (data.role) lines.push(`ROLE;CHARSET=utf-8:${data.role}`);
  if (data.bday) lines.push(`BDAY:${data.bday}`);

  // Filter: Only allow URL-based photos in the vCard to keep file size small
  // Scanned images are stored separately in history
  if (data.photo && !data.photo.startsWith('data:')) {
    lines.push(`PHOTO:${data.photo}`);
  }

  if (data.note) lines.push(`NOTE;CHARSET=utf-8:${data.note.replace(/\n/g, '\\n')}`);

  data.tel?.forEach(t => lines.push(`TEL;CHARSET=utf-8;TYPE=${t.type}:${t.value}`));
  data.email?.forEach(e => lines.push(`EMAIL;CHARSET=utf-8;TYPE=${e.type}:${e.value}`));
  data.url?.forEach(u => lines.push(`URL;CHARSET=utf-8;TYPE=${u.type}:${u.value}`));

  data.adr?.forEach(a => {
    // ADR:PO;Ext;Street;City;Region;Zip;Country
    lines.push(`ADR;CHARSET=utf-8;TYPE=${a.type}:;;${a.value.street};${a.value.city};${a.value.region};${a.value.zip};${a.value.country}`);
  });

  lines.push('END:VCARD');
  return lines.join('\n');
};

export const vCardToReadableText = (vcard: string): string => {
  const parsed = parseVCardString(vcard);
  if (!parsed.isValid) return vcard;

  const d = parsed.data;
  let text = '';

  if (d.fn) text += `Name: ${d.fn}\n`;
  if (d.org) text += `Firma: ${d.org}\n`;
  if (d.title) text += `Titel: ${d.title}\n`;

  d.tel?.forEach(t => text += `Tel (${t.type}): ${t.value}\n`);
  d.email?.forEach(e => text += `Email (${e.type}): ${e.value}\n`);
  d.url?.forEach(u => text += `Web (${u.type}): ${u.value}\n`);

  d.adr?.forEach(a => {
    const parts = [a.value.street, `${a.value.zip} ${a.value.city}`, a.value.country].filter(p => p.trim());
    text += `Adresse (${a.type}): ${parts.join(', ')}\n`;
  });

  if (d.note) text += `Notiz: ${d.note}\n`;

  return text;
};

export const getTimestamp = (): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

export const generateContactFilename = (data: VCardData): string => {
  const timestamp = getTimestamp();

  const nameParts = (data.fn || 'Unbekannt').split(' ');
  let vorname = nameParts[0] || '';
  let nachname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  if (!nachname) { nachname = vorname; vorname = ''; }

  const firma = data.org || '';

  const safeStr = (s: string) => s.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_');

  const parts = [timestamp, safeStr(vorname), safeStr(nachname)];
  if (firma) parts.push(safeStr(firma));

  return parts.filter(p => p && p !== '_').join('_');
};

export const downloadVCard = (content: string, filename: string = 'contact.vcf') => {
  const blob = new Blob([content], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const clean_number = (str: string): string => {
  return str.replace(/[^0-9+]/g, '');
};