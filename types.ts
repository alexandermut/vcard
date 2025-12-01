export interface VCardAddress {
  street: string;
  city: string;
  zip: string;
  region: string;
  country: string;
}

export interface VCardData {
  fn?: string; // Full Name
  n?: string; // Name parts
  org?: string;
  title?: string;
  role?: string;
  email?: Array<{ type: string; value: string }>;
  tel?: Array<{ type: string; value: string }>;
  adr?: Array<{ type: string; value: VCardAddress }>;
  url?: Array<{ type: string; value: string }>;
  photo?: string;
  note?: string;
  bday?: string;
  uid?: string;
}

export interface ParsedVCard {
  raw: string;
  data: VCardData;
  isValid: boolean;
}

export type AIProvider = 'google' | 'openai' | 'custom';

export type Language = 'de' | 'en';

export interface HistoryItem {
  id: string;
  timestamp: number;
  name: string;
  org?: string;
  title?: string;
  role?: string;
  note?: string;
  bday?: string;
  vcard: string;
  images?: string[]; // Array of Base64 strings (Front/Back)
  keywords?: string[]; // For search indexing
  googleResourceName?: string; // Linked Google Contact ID
}

export type ScanStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface ScanJob {
  id: string;
  timestamp: number;
  images: (string | File)[]; // Array of images (pages/sides)
  status: ScanStatus;
  error?: string;
  mode?: 'vision' | 'hybrid';
}

export interface Note {
  id: string;
  timestamp: number;
  content: string;
  contactId?: string; // Link to history item
  contactName?: string; // Snapshot of contact name
  company?: string; // Snapshot of company name
  location?: string;
  tags?: string[];
}