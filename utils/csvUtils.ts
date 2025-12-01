import { HistoryItem, VCardData } from '../types';
import { parseVCardString } from './vcardUtils';

export const generateCSV = (history: HistoryItem[]): string => {
  // Outlook / Google Contacts compatible headers
  const headers = [
    'ID',
    'First Name',
    'Middle Name',
    'Last Name',
    'Title',
    'Company',
    'Department',
    'Job Title',
    'Business Street',
    'Business City',
    'Business Postal Code',
    'Business State',
    'Business Country',
    'Business Phone',
    'Mobile Phone',
    'Home Phone',
    'Business Fax',
    'Email Address',
    'Email 2',
    'Email 3',
    'Web Page',
    'LinkedIn URL',
    'Xing URL',
    'Notes',
    'Birthday',
    'Image Files'
  ];

  const escapeCsv = (str: string | undefined | null) => {
    if (!str) return '';
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = history.map(item => {
    const parsed = parseVCardString(item.vcard);
    const data = parsed.data;

    // --- Name Parsing ---
    let firstName = '';
    let middleName = '';
    let lastName = '';
    let title = data.title || '';

    if (data.n) {
      // N:Family;Given;Middle;Prefix;Suffix
      const parts = data.n.split(';');
      lastName = parts[0] || '';
      firstName = parts[1] || '';
      middleName = parts[2] || '';
      if (parts[3] && !title) title = parts[3]; // Use prefix as title if title is empty
    } else if (data.fn) {
      // Fallback: Try to split FN
      const parts = data.fn.split(' ');
      if (parts.length > 1) {
        lastName = parts.pop() || '';
        firstName = parts.join(' ');
      } else {
        firstName = parts[0] || ''; // Single name -> First Name
      }
    }

    // --- Address Parsing ---
    // Prefer WORK address, fallback to first available
    const adr = data.adr?.find(a => a.type && (a.type.toUpperCase().includes('WORK') || a.type.toUpperCase().includes('DOM') || a.type.toUpperCase().includes('INTl'))) || data.adr?.[0];

    // --- Phone Parsing ---
    const getPhone = (typeQuery: string) =>
      data.tel?.find(t => t.type.toUpperCase().includes(typeQuery))?.value;

    const workPhone = getPhone('WORK') || getPhone('VOICE'); // Fallback to generic voice
    const mobilePhone = getPhone('CELL') || getPhone('MOBILE');
    const homePhone = getPhone('HOME');
    const fax = getPhone('FAX');

    // --- Email Parsing ---
    const emails = data.email?.map(e => e.value) || [];

    // --- Social Media Parsing ---
    const getUrl = (query: string) =>
      data.url?.find(u => u.value.toLowerCase().includes(query) || (u.type && u.type.toUpperCase().includes(query.toUpperCase())))?.value;

    const linkedIn = getUrl('linkedin');
    const xing = getUrl('xing');
    // Generic website: First URL that is NOT social media
    const website = data.url?.find(u =>
      !u.value.toLowerCase().includes('linkedin') &&
      !u.value.toLowerCase().includes('xing') &&
      !u.value.toLowerCase().includes('twitter') &&
      !u.value.toLowerCase().includes('facebook')
    )?.value;

    // --- Image Filenames ---
    let imageFiles = '';
    if (item.images && item.images.length > 0) {
      imageFiles = item.images.map((_, i) => {
        const suffix = i === 0 ? 'front' : i === 1 ? 'back' : `img${i + 1}`;
        return `${item.id}_${suffix}.jpg`;
      }).join(';');
    }

    return [
      escapeCsv(item.id),
      escapeCsv(firstName),
      escapeCsv(middleName),
      escapeCsv(lastName),
      escapeCsv(title),
      escapeCsv(data.org),
      escapeCsv(data.role), // Mapping Role to Department/Job Title is tricky. Usually Role = Job Title.
      escapeCsv(data.role), // Using Role for Job Title as well
      escapeCsv(adr?.value.street),
      escapeCsv(adr?.value.city),
      escapeCsv(adr?.value.zip),
      escapeCsv(adr?.value.region),
      escapeCsv(adr?.value.country),
      escapeCsv(workPhone),
      escapeCsv(mobilePhone),
      escapeCsv(homePhone),
      escapeCsv(fax),
      escapeCsv(emails[0]),
      escapeCsv(emails[1]),
      escapeCsv(emails[2]),
      escapeCsv(website),
      escapeCsv(linkedIn),
      escapeCsv(xing),
      escapeCsv(data.note),
      escapeCsv(data.bday),
      escapeCsv(imageFiles)
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

export const downloadCSV = (content: string, filename: string = 'kontakte_export.csv') => {
  // Add BOM (\uFEFF) so Excel recognizes UTF-8 encoding correctly
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const parseCSV = (csvContent: string): any[] => {
  const lines = csvContent.split(/\r\n|\n/);
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

  const contacts: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    // Handle quoted values correctly (simple regex approach)
    const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    // Fallback if regex fails or simple split is needed (CSV parsing is hard without a lib)
    // Let's use a simpler split but respect quotes

    const row: string[] = [];
    let inQuote = false;
    let currentCell = '';

    for (let char of lines[i]) {
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        row.push(currentCell);
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell); // Last cell

    // Clean quotes
    const cleanRow = row.map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"').trim());

    if (cleanRow.length < headers.length) continue; // Skip malformed

    const contact: any = {};

    headers.forEach((header, index) => {
      if (cleanRow[index]) {
        contact[header] = cleanRow[index];
      }
    });

    contacts.push(contact);
  }

  return contacts;
};

export const csvToVCard = (csvData: any[]): string[] => {
  return csvData.map(row => {
    // Mapping Logic (Best Effort)
    const fn = row['first name'] || row['given name'] || '';
    const ln = row['last name'] || row['family name'] || '';
    const name = `${fn} ${ln}`.trim() || row['name'] || 'Unbekannt';

    const org = row['company'] || row['organization'] || '';
    const title = row['title'] || row['job title'] || '';

    const email = row['email address'] || row['email'] || row['e-mail 1 - value'] || '';
    const phoneWork = row['business phone'] || row['work phone'] || '';
    const phoneMobile = row['mobile phone'] || row['mobile'] || '';

    const street = row['business street'] || row['street'] || '';
    const city = row['business city'] || row['city'] || '';
    const zip = row['business postal code'] || row['postal code'] || row['zip'] || '';
    const country = row['business country'] || row['country'] || '';

    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    lines.push(`N:;${name};;;`);
    lines.push(`FN:${name}`);
    if (org) lines.push(`ORG:${org}`);
    if (title) lines.push(`TITLE:${title}`);
    if (email) lines.push(`EMAIL;TYPE=WORK:${email}`);
    if (phoneWork) lines.push(`TEL;TYPE=WORK:${phoneWork}`);
    if (phoneMobile) lines.push(`TEL;TYPE=CELL:${phoneMobile}`);

    if (street || city) {
      lines.push(`ADR;TYPE=WORK:;;${street};${city};;${zip};${country}`);
    }

    lines.push('END:VCARD');
    return lines.join('\n');
  });
};