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

- [x] **AI Meeting & Hybrid Scan:** Photo of Business Card + Handwritten Notes -> AI extracts contact AND structured context/notes.
- [x] **Advanced Notes System:**
    - Separate storage for notes (not just in vCard `NOTE` field).
    - Notes History: Searchable and exportable text files.
    - Header Button for quick access to Notes.
    - Structured Note Format: Location, Date, Contact Data, Content.
- [x] **Batch Hybrid Scan:** Support for "Card + Notes" mode in batch processing.
- [x] **PDF Support:** Upload and process PDF files (scans) in all modes.
- [x] **Note Navigation:** Jump from Note to Contact Preview.
- [x] **Logo:** Simple SVG logo with text "k◎ntakte.me". 

---

## 🚧 In Progress / Improvements




## 🔮 Future Vision (Backlog)
- [ ] **Dubletten** Management
- [ ] **Import** Möglichkeiten
    - [ ] vcf files
- [ ] **Performance:** Optimization of `cities.ts` (Lazy Loading) to reduce bundle size.
- [ ] **Offline-OCR:** Integration of Tesseract.js as fallback when no Internet/API Key is available.
- [ ] **WebDAV Sync:** Direct synchronization with CardDAV servers (Nextcloud, iCloud).
- [ ] **CRM Integration:** Direct export to HubSpot / Salesforce via API.
- [ ] **Team Mode:** Sharing scanned contacts within a team (encrypted).
- [ ] **AI Research:** Real web search ("Grounding") to automatically complete missing data.
- [ ] **Digital Wallet:** Export as `.pkpass` for Apple Wallet & Google Wallet.
- [ ] **NFC Writer:** Write vCards to NFC tags (via WebNFC API).
- [ ] **NFC Card Ordering:** Order physical NFC business cards for individual contacts directly from the app.
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
- [ ] **Google Contacts Ecosystem 🌐**
    *Leverage the Google People API to build a powerful contact management suite.*
    - [ ] **Phase 1: Foundation (Auth & Basic I/O)**
        - [x] OAuth 2.0 Integration (Implicit Flow).
        - [x] Import Contacts (Read) with Pagination.
        - [x] Export Contacts (Write) - Create new contacts.
        - [ ] *Refinement:* Handle "Next Page" for large address books (>1000 contacts).
    - [ ] **Phase 2: Advanced Sync & Management**
        - [ ] **Two-Way Sync:** Track changes (ETags) to prevent overwriting. "Sync Now" button.
        - [ ] **Group Management (Labels):** Import/Manage Google Contact Groups as Tags.
        - [ ] **Photo Sync:** High-res photo upload & sync.
        - [ ] **Trash/Restore:** View and restore deleted Google Contacts.
    - [ ] **Phase 3: AI Enrichment ("Clean Up My Contacts")**
        - [ ] **Health Check:** AI scans for missing country codes, formatting errors, mixed case.
        - [ ] **Smart Merge:** AI-driven duplicate detection (Name + Email/Phone fuzzy match).
        - [ ] **Enrichment:** "Update from Signature" (Paste text -> Update Contact).
    - [ ] **Phase 4: Integrations**
        - [ ] **Maps:** Visualize contacts on Google Maps.
        - [ ] **Calendar:** Birthday & Anniversary sync.
        - [ ] **Gmail:** Contextual "Draft Email" actions.
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
