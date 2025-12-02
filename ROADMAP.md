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
- [x] **Failed Scans Gallery:** View and retry failed scans.

---

## 🚧 In Progress / Next Up

### 1. Google Integration Phase 2 (Sync & Management)
- [x] Add "Sync Status" Indicator in Google Modal (Visual feedback for existing contacts)
- [x] **Debug Logger:** Capture clicks/errors/logs for analysis (Settings -> Debug).
- [ ] **Two-Way Sync:** Track changes (ETags) to prevent overwriting.
- [ ] **Group Management:** Import/Manage Google Contact Groups as Tags.
- [ ] **Photo Sync:** High-res photo upload & sync.

### 2. Performance & Stability
- [x] **Virtualization:** Implement `react-virtuoso` for History and Notes lists (>1000 contacts).
- [x] **Error Handling:** Replace `alert()` with Toast notifications (Sonner/Hot-Toast).
- [ ] **Lazy Loading:** Optimize `cities.ts` and large dependencies.

### 3. AI Enrichment (Phase 3)
- [ ] **Health Check:** AI scans for missing country codes, formatting errors.
- [ ] **Enrichment:** "Update from Signature" (Paste text -> Update Contact).

---

## � Phase 4: Scaling & Performance (20k+ Contacts)
**Goal:** Ensure smooth operation with large datasets (>20,000 contacts).

- [x] **Virtualization (React Virtuoso)**
    - [x] Implement for `HistorySidebar` (replace simple map)
    - [x] Implement for `NotesSidebar`
    - [ ] Implement for `DuplicateFinderModal`
- [x] **Web Workers (Off-Main-Thread)**
    - [x] **Search Worker:** Move fuzzy search logic to a dedicated worker.
    - [x] **Deduplication Worker:** Run O(n²) duplicate detection in background.
    - [ ] **Import/Export Worker:** Parse vCards and generate ZIPs without freezing UI.
- [x] **Database Optimization**
    - [x] **Blob Storage:** Enforce `Blob` storage for images (migrate from Base64).
    - [ ] **Direct DB Access:** Refactor Duplicate Finder to query IDB directly (avoid passing full history prop).
    - [x] **Pagination:** Ensure `App.tsx` only loads visible subset of history.
    - [x] **Persistence:** Keep manual edits in Duplicate Finder when switching Master side.
    - [x] **List Merging:** Interactive add/remove for emails, phones, etc.
    - [x] **Streaming:** Process contacts in chunks to support 20k+ items.
    - [x] **Fuzzy Search:** Find typos and phonetic matches (Cologne Phonetics).
    - [x] **Import/Export Worker:** Prevent UI freeze during large file operations.
    - [x] **Robust vCard Parsing:**
        - [x] Implement proper line unfolding (RFC 6350).
        - [x] Handle complex parameters (quoted-printable, charset).
        - [x] Support multi-line values (e.g. notes).
        - [x] Add validation for mandatory fields.
- [ ] **Google Sync Optimization**
    - [ ] Implement Batch API for Create/Update/Delete.
    - [ ] Implement Incremental Sync (Sync Tokens).
- [ ] **Advanced vCard Parsing (Backlog):**
    - [ ] Support `X-` Properties (Preserve unknown fields).
    - [ ] RFC-Compliant Generator (Escaping, Folding).
    - [ ] Robust PHOTO Handling (Base64).

---

## 🖥️ Project: Self-Hosted AI Infrastructure (Ollama)
**Goal:** Run a dedicated, privacy-focused LLM server to replace/augment Google Gemini.

### Phase 1: Hardware & OS Setup
- [ ] **Hardware Selection:** Evaluate Mac Studio (M2/M3 Ultra) vs. NVIDIA Server (RTX 3090/4090 cluster).
- [ ] **OS Configuration:** Setup Linux (Ubuntu Server) or macOS for headless operation.
- [ ] **Network Configuration:** Static IP, Port Forwarding, and Firewall rules.

### Phase 2: Ollama Installation & Configuration
- [ ] **Installation:** Deploy Ollama service (Docker or Bare Metal).
- [ ] **Model Selection:** Benchmark Llama 3, Mixtral 8x7b, and Qwen for vCard extraction performance.
- [ ] **Performance Tuning:** Optimize context window size and GPU layer offloading.

### Phase 3: API & Security
- [ ] **Reverse Proxy:** Setup Nginx or Traefik for secure API exposure.
- [ ] **Authentication:** Implement Basic Auth or API Key middleware to protect the endpoint.
- [ ] **SSL/TLS:** Configure Let's Encrypt for encrypted communication (HTTPS).
- [ ] **Tunneling (Optional):** Setup Cloudflare Tunnel for secure remote access without open ports.

### Phase 4: Integration
- [ ] **App Connection:** Connect vCard App to the custom Ollama endpoint.
- [ ] **Latency Testing:** Measure and optimize round-trip time.
- [ ] **Fallback Logic:** Implement automatic failover to Gemini if the local server is unreachable.

## 🔮 Future / Ideas

### Integrations
- [ ] **WebDAV Sync:** Direct synchronization with CardDAV servers (Nextcloud, iCloud).
- [ ] **Offline-OCR:** Tesseract.js fallback when offline.
- [ ] **AI Grounding:** Real web search to complete missing data.
- [ ] **Voice-to-Contact:** Dictate business cards.
- [x] **Better Phone Parsing:** Use `libphonenumber-js` for robust international number handling.
- [ ] **CRM Integration:** HubSpot / Salesforce via API.
- [ ] **Outlook Add-in:** Direct integration into Microsoft 365.
- [ ] **Browser Extension:** Chrome/Firefox Add-on to "grab" contact data.

### 🧠 AI & Intelligence
- [ ] **Follow-up Assistant:** AI drafts personalized follow-up emails based on scan context & notes.
- [ ] **Relationship Graph:** Visualize connections between contacts (Who knows who?).
- [ ] **Smart Grouping:** Auto-categorize contacts by industry, location, or role.
- [ ] **Voice Memos:** Record audio notes for contacts, auto-transcribed by AI.
- [ ] **NLP Integration:** Use `compromise.js` (or similar) for smarter offline parsing of natural text (e.g. email signatures).

### 🤝 Networking & Events
- [x] **Event Mode:** Auto-tag all scans with a specific event name (e.g., "DMEXCO 2025").
- [ ] **Digital Business Card:** Public profile page (QR/NFC) for the user to share their own info.
- [ ] **Team Sharing:** Share specific contact lists or folders with colleagues (E2E Encrypted).

### 🔒 Security & Privacy
- [ ] **Local Encryption:** Encrypt IndexedDB at rest with a user password/key.
- [ ] **Biometric Lock:** Require FaceID/TouchID to open the app.
- [ ] **Audit Log:** Track who accessed/exported which contacts.

### 🛠️ Integrations & Automation
- [ ] **Zapier / Make Webhooks:** Trigger workflows when a contact is added.
- [ ] **Email Signature Parser:** Paste an email signature to create a contact instantly.
- [ ] **Calendar Integration:** Show "Last Met" date and upcoming birthdays in dashboard.

### unsortiert
- [ ] 
- [ ] 
