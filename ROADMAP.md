# 🗺️ vCardAI Roadmap

This file tracks the current development status and planned features.

## ✅ Completed (Done)

### Core & Architecture
- [x] Project Setup (React, Vite, TS, Tailwind)
- [x] Offline-First Architecture (PWA, Service Worker)
- [x] IndexedDB Storage (Unlimited history)
- [x] Web Worker for Heavy Tasks (CSV Parsing, DB Ingestion)
- [x] Multi-language Support (DE / EN)
- [x] Dark Mode / Light Mode
- [x] Responsive Layout (Mobile & Desktop)

### Editor & Parser
- [x] vCard 3.0 Generator & Parser
- [x] Regex Parser for Text Input (Imprint, Signatures)
- [x] DACH Address Format Support & City Database
- [x] Editor Tabs: Text, Code, Enrich
- [x] Drag & Drop for Images

### AI Integration
- [x] Google Gemini Integration (`gemini-1.5-flash`)
- [x] Intelligent Prompting (Context-Aware, Noise Removal)
- [x] Vision Support (Business Card Scan)
- [x] **AI Meeting & Hybrid Scan:** Photo + Handwritten Notes -> Structured Data
- [x] **Advanced Notes System:** Structured notes, searchable, linked to contacts.

### Google Contacts Ecosystem 🌐
- [x] **Phase 1: Foundation**
    - [x] OAuth 2.0 Integration (Implicit Flow)
    - [x] Import Contacts (Read) with Search & Pagination
    - [x] Export Contacts (Write) - "Save to Google"
    - [x] Google Contacts Manager UI (Modal with Tabs)

### Duplicate Cleanup (Dubletten) 🧹
- [x] **Phase 1: Detection** (Exact Match: Email/Phone, Fuzzy Match: Name/Phonetic)
- [x] **Phase 2: Smart Merge** (Combine unique fields, merge notes)
- [x] **Phase 3: UI Workflow** (Duplicate Finder Modal)
- [x] **Phase 4: Master Editor** (Full editing of master contact before merge)
- [x] **Mobile Optimization** (Responsive comparison view)

### Workflow & UX
- [x] Scan Modal with "Scan & Next" Workflow
- [x] Background Scan Queue with Visual Indicator
- [x] History with Original Images
- [x] **Batch Upload:** Process multiple images/PDFs at once.
- [x] **PDF Support:** Import and process PDF files.
- [x] **One-Click Backup:** ZIP export with all vCards and Images.

### Export
- [x] vCard Download (.vcf)
- [x] CSV Export (Excel-optimized)
- [x] Image Export (ZIP)
- [x] QR Code Generation

### Legal
- [x] Imprint (DDG compliant)
- [x] Privacy Policy (Google Cloud & AI specific)

---

## 🚧 In Progress / Next Up

### 1. Google Integration Phase 2 (Sync & Management)
- [ ] **Sync Status:** Visual indicator for contacts already in Google.
- [ ] **Two-Way Sync:** Track changes (ETags) to prevent overwriting.
- [ ] **Group Management:** Import/Manage Google Contact Groups as Tags.
- [ ] **Photo Sync:** High-res photo upload & sync.

### 2. Performance & Stability
- [ ] **Virtualization:** Implement `react-window` for History and Duplicate lists (>1000 contacts).
- [ ] **Error Handling:** Replace `alert()` with Toast notifications (Sonner/Hot-Toast).
- [ ] **Lazy Loading:** Optimize `cities.ts` and large dependencies.

### 3. AI Enrichment (Phase 3)
- [ ] **Health Check:** AI scans for missing country codes, formatting errors.
- [ ] **Enrichment:** "Update from Signature" (Paste text -> Update Contact).

---

## 🔮 Future Vision (Backlog)

### Integrations
- [ ] **WebDAV Sync:** Direct synchronization with CardDAV servers (Nextcloud, iCloud).
- [ ] **CRM Integration:** HubSpot / Salesforce via API.
- [ ] **Outlook Add-in:** Direct integration into Microsoft 365.
- [ ] **Browser Extension:** Chrome/Firefox Add-on to "grab" contact data.

### Features
- [ ] **Team Mode:** Sharing scanned contacts within a team (encrypted).
- [ ] **Digital Wallet:** Export as `.pkpass` for Apple Wallet & Google Wallet.
- [ ] **NFC Writer:** Write vCards to NFC tags (via WebNFC API).
- [ ] **Map View:** Visualize all contacts on an interactive map.
- [ ] **Calendar Export:** Export birthdays as `.ics` calendar subscription.
- [ ] **Label Printing:** PDF export for address labels.

### Research
- [ ] **Offline-OCR:** Tesseract.js fallback when offline.
- [ ] **AI Grounding:** Real web search to complete missing data.
- [ ] **Voice-to-Contact:** Dictate business cards.
