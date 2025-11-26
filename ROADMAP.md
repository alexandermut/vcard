# 🗺️ vCardAI Roadmap

This file tracks the current development status and planned features.

## ✅ Completed (Done)

### Core
- [x] Project Setup (React, Vite, TS, Tailwind)
- [x] Offline-First Architecture
- [x] PWA Support (Manifest, Icons, Service Worker)
- [x] IndexedDB Storage (Unlimited history)
- [x] Web Worker for Heavy Tasks (CSV Parsing, DB Ingestion)

### Editor & Parser
- [x] Regex Parser for Text Input (Imprint, Signatures)
- [x] DACH Address Format Support & City Database
- [x] vCard 3.0 Generator & Parser
- [x] Editor Tabs: Text, Code, Enrich
- [x] Drag & Drop for Images

### AI Integration
- [x] Google Gemini Integration (`gemini-1.5-flash`)
- [x] Intelligent Prompting (Context-Aware, Noise Removal)
- [x] Vision Support (Business Card Scan)
- [x] Update Mode ("Add LinkedIn to...")

### Workflow & UX
- [x] Scan Modal with "Scan & Next" Workflow
- [x] Background Scan Queue
- [x] Visual Queue Indicator
- [x] Smart Merge (Duplicate Detection via Name & Phone)
- [x] History with Original Images
- [x] Dark Mode / Light Mode
- [x] Multi-language Support (DE / EN)
- [x] Responsive Layout (Fixed Header, Sticky Footer)

### Export
- [x] vCard Download (.vcf)
- [x] CSV Export (Excel-optimized, Streaming)
- [x] Image Export (ZIP)
- [x] QR Code Generation

### Legal
- [x] Imprint (DDG compliant)
- [x] Privacy (Google Cloud & AI specific)

---

## 🚧 In Progress / Improvements

- [ ] **Performance:** Optimization of `cities.ts` (Lazy Loading) to reduce bundle size.
- [ ] **Offline-OCR:** Integration of Tesseract.js as fallback when no Internet/API Key is available.

## 🔮 Future Vision (Backlog)

- [ ] **WebDAV Sync:** Direct synchronization with CardDAV servers (Nextcloud, iCloud).
- [ ] **CRM Integration:** Direct export to HubSpot / Salesforce via API.
- [ ] **Team Mode:** Sharing scanned contacts within a team (encrypted).
- [ ] **AI Research:** Real web search ("Grounding") to automatically complete missing data.
- [ ] **Digital Wallet:** Export as `.pkpass` for Apple Wallet & Google Wallet.
- [ ] **NFC Writer:** Write vCards to NFC tags (via WebNFC API).
- [ ] **Voice-to-Contact:** Dictate business cards ("Create contact for Max Mustermann...").
- [ ] **LinkedIn PDF Import:** Extract data from LinkedIn Profile PDFs.
- [ ] **Custom Branding:** Custom logo and colors for QR Code and Web View.
- [ ] **Self-Hosting:** Docker container for easy intranet deployment.
- [ ] **HTML Signature Generator:** Create copy-pasteable email signatures from vCard data.
- [ ] **Kiosk / Event Mode:** Simplified interface for trade shows for quick lead capture.
- [ ] **Multi-Identity:** Manage multiple personal profiles (Private, Work, Club).
- [ ] **Map View:** Visualize all contacts on an interactive map.
- [ ] **Label Printing:** PDF export for address labels (e.g., Avery).
- [ ] **Calendar Export:** Export birthdays as `.ics` calendar subscription.
- [ ] **Outlook Add-in:** Direct integration into Microsoft 365 / Exchange.
- [ ] **Google Contacts Sync:** Bidirectional synchronization with Google Contacts (People API).
- [ ] **Browser Extension:** Chrome/Firefox Add-on to "grab" contact data.
    - *Context Menu:* "Add to vCard" on selected text.
    - *LinkedIn Integration:* Button in profile for direct vCard export.
    - *Imprint Parser:* Automatically detect address data on contact pages.
    - *Sync:* Send data directly to the running vCard-Editor Web App.
- [ ] **Design Editor:** Visual Drag & Drop Editor for printable business card layouts (PDF).
- [ ] **Analytics:** (Optional) Track scans when using shortlinks.
- [ ] **LDAP / Active Directory:** Enterprise address book connection.
- [ ] **Webhooks:** API endpoint to automatically create cards from other apps (e.g., Typeform).
- [ ] **Accessibility:** Automatic generation of phonetic fields for screen readers.
- [- ] **Social Photo Link:** Link profile picture directly from LinkedIn/Xing/Gravatar (without upload).
- [x] **AI Meeting & Hybrid Scan:** Photo of Business Card + Handwritten Notes -> AI extracts contact AND structured context/notes.
- [x] **Advanced Notes System:**
    - Separate storage for notes (not just in vCard `NOTE` field).
    - Notes History: Searchable and exportable text files.
    - Header Button for quick access to Notes.
    - Structured Note Format: Location, Date, Contact Data, Content.
- [x] **Batch Hybrid Scan:** Support for "Card + Notes" mode in batch processing.
- [x] **PDF Support:** Upload and process PDF files (scans) in all modes.
- [x] **Note Navigation:** Jump from Note to Contact Preview.