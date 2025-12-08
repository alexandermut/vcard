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
  categories?: string[];
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
  images?: (string | Blob)[]; // Array of Base64 strings or Blobs (Front/Back)
  keywords?: string[]; // For search indexing
  googleResourceName?: string; // Linked Google Contact ID
  debugAnalysis?: string; // JSON string of regex analysis for training
  ocrRawText?: string; // ✅ NEW: Original OCR text from Tesseract for re-parsing
}

export type ScanStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface ScanJob {
  id: string;
  timestamp: number;
  images: (string | File)[]; // Array of images (pages/sides)
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: string;
  error?: string;
  mode?: 'vision' | 'hybrid';
  retryCount?: number;
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

export interface Settings {
  ocrMethod?: 'auto' | 'tesseract' | 'gemini' | 'hybrid' | 'regex-training';
}