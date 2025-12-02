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
- [x] Security Hardening (CSP, ReDoS Protection)

### Editor & Parser
- [x] vCard 3.0 Generator & Parser
- [x] Regex Parser for Text Input (Imprint, Signatures)
- [x] DACH Address Format Support & City Database
- [x] Editor Tabs: Text, Code, Enrich
- [x] Advanced Phone Classification (Mobile vs Landline)
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
- [x] Settings Sidebar Refactor
- [x] FAQ / Help Page
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
- [ ] **Enrichment:** "Update from Signature" (Paste text → Update Contact).

---

## 🧠 Project: Intelligent Regex Parser (Context-Aware Parsing)
**Goal:** Transform the regex parser from pattern-matching to intelligent, database-backed analysis.

**Success Metrics:**
- Reduce false positive rate by 80% (current: ~15% → target: <3%)
- Increase field extraction accuracy to 95%+ (current: ~75%)
- Achieve 90%+ confidence scores on standard business cards
- Parse time under 50ms per contact (including anchor lookups)

### Phase 1: Foundation & False Positive Elimination (Week 1-2)

#### 1.1 Create Infrastructure
- [ ] **Create `utils/parserAnchors.ts`** - Centralized anchor management
  - [ ] Export blacklist prefixes as const arrays
  - [ ] Export legal forms as categorized objects
  - [ ] Export industry keywords
  - [ ] Provide utility functions: `isBlacklisted()`, `hasLegalForm()`, `fuzzyMatch()`

- [ ] **Create `utils/anchorDetection.ts`** - Anchor detection engine
  - [ ] `detectPLZ(text: string): AnchorMatch[]` - Find all PLZ with positions
  - [ ] `detectAreaCodes(text: string): AnchorMatch[]` - Find area codes
  - [ ] `detectStreets(text: string): AnchorMatch[]` - Fuzzy street matching
  - [ ] `detectCities(text: string): AnchorMatch[]` - City name matching
  - [ ] Return format: `{ value: string, position: [start, end], weight: number }`

#### 1.2 Blacklist Implementation ⚡
- [ ] **Phone Number False Positives**
  - [ ] Create regex negative lookahead for 40+ blacklist prefixes
  - **Prefix Catalog (Numbers to EXCLUDE):**
    - **Tax/Registration (9):** `USt-ID`, `USt.ID`, `Umsatzsteuer-ID`, `VAT`, `VAT-ID`, `VAT No`, `UID`, `Steuernummer`, `St.-Nr.`, `Steuer-Nr.`
    - **Trade Registry (8):** `Handelsregister`, `HRB`, `HRA`, `HR`, `Registernummer`, `Reg.-Nr.`, `Firmenbuchnummer`, `FN`
    - **Banking (6):** `IBAN`, `BIC`, `SWIFT`, `Kontonummer`, `Konto-Nr.`, `Bankleitzahl`, `BLZ`
    - **Business IDs (8):** `Artikelnummer`, `Art.-Nr.`, `Bestellnummer`, `Best.-Nr.`, `Kundennummer`, `Kd.-Nr.`, `Rechnungsnummer`, `Rechn.-Nr.`
    - **Personal IDs (6):** `Personalausweis`, `Ausweis-Nr.`, `Pass-Nr.`, `Lizenznummer`, `Zertifikatsnummer`, `Mitgliedsnummer`
    - **Dates (3):** `geb.`, `geboren`, `Geburtsdatum`
  - [ ] Pattern: `(?<!(?:USt-ID|IBAN|...):\s*)\d+` (negative lookbehind)
  - [ ] Test with edge cases: "IBAN: DE12 3456..." vs "Tel: 030 123456"

#### 1.3 Legal Forms Database
- [ ] **Implement Company Detection**
  - **48+ German Legal Forms:**
    - **Kapitalgesellschaften (6):** GmbH, gGmbH, UG, AG, SE, KGaA
    - **Personengesellschaften (6):** GbR, OHG, KG, GmbH & Co. KG, PartG, PartG mbB
    - **Mischformen (8):** GmbH & Co. KG, GmbH & Co. KGaA, AG & Co. KG, UG & Co. KG, SE & Co. KG, GmbH & Co. OHG, Ltd. & Co. KG, Stiftung & Co. KG
    - **Einzelunternehmen (3):** e.K., e.Kfr., Inh.
    - **Non-Profit (4):** e.V., gGmbH, Stiftung, gAG
    - **Öffentlich (2):** AöR, KöR
    - **Ausländisch (6):** Ltd., S.A., S.à r.l., B.V., Inc., LLC
  - [ ] Handle variations: `e.V.` = `eV` = `e V` (normalize before matching)
  - [ ] Regex: `(?:GmbH\s*&\s*Co\.\s*KG|GmbH|AG|...)` (order by length, longest first)

### Phase 2: Anchor-Based Context Detection (Week 3-4)

#### 2.1 Multi-Pass Analysis Implementation
- [ ] **Pass 1: Anchor Discovery** - Scan text for all anchors
  ```typescript
  interface AnchorMap {
    plz: AnchorMatch[];        // Weight: 10
    areaCode: AnchorMatch[];   // Weight: 9
    city: AnchorMatch[];       // Weight: 8
    street: AnchorMatch[];     // Weight: 7
    firstName: AnchorMatch[];  // Weight: 6
    emailDomain: AnchorMatch[]; // Weight: 5
  }
  ```
  - [ ] Run detection in parallel (Promise.all for performance)
  - [ ] Index anchors by text position for proximity lookup

- [ ] **Pass 2: Context Inference** - Validate fields with anchors
  - [ ] For each regex match, calculate anchor proximity score
  - [ ] Proximity bonus: Within 50 chars = full bonus, 51-100 chars = 50% bonus
  - [ ] Cross-validate:
    - [ ] PLZ found → Check if adjacent text matches city in database
    - [ ] Area code found → Validate against landline prefix list (5000+)
    - [ ] Street found → Check if same line contains house number pattern
    - [ ] First name found → Boost person name confidence

- [ ] **Pass 3: Confidence Scoring** - Aggregate scores per field
  - [ ] Base score: Regex match quality (0-40 points)
  - [ ] Anchor bonuses: Up to +60 points based on proximity and weight
  - [ ] Penalties: Blacklist hit = -50 points, all-caps = -40 points
  - [ ] Final score: Normalize to 0.0-1.0 range
  - [ ] Thresholds: Address ≥0.6, Phone ≥0.5, Name ≥0.55, Company ≥0.6

#### 2.2 Fuzzy Matching for Typos
- [ ] **Implement Levenshtein Distance** for city names
  - [ ] Allow max distance of 2 for cities (e.g., "Berln" → "Berlin")
  - [ ] Cache frequent corrections for performance
  - [ ] Only apply to cities with PLZ anchor present (reduce false positives)

### Phase 3: Hierarchical Weighting System (Week 5-6)

#### 3.1 Field Extraction Rules
- [ ] **Weighted Scoring per Field Type:**
  - [ ] **Address Field:**
    - Base: 40%, +30% PLZ, +20% city, +15% street, +10% house number
    - Threshold: ≥60%
  - [ ] **Phone Field:**
    - Base: 40%, +40% area code, +20% near address
    - Penalties: -50% blacklist, -30% IBAN pattern
    - Threshold: ≥50%
  - [ ] **Name Field:**
    - Base: 40%, +35% first name, +25% title, +15% near email
    - Penalties: -40% all-caps, -20% legal form present
    - Threshold: ≥55%
  - [ ] **Company Field:**
    - Base: 40%, +40% legal form, +30% industry keyword, +20% domain match
    - Penalties: -30% person name pattern
    - Threshold: ≥60%

#### 3.2 Cross-Validation & Conflict Resolution
- [ ] **Mutual Reinforcement Logic:**
  - [ ] PLZ + City match → Boost both by +20%
  - [ ] Street + City match → Boost address by +15%
  - [ ] Area code + City → Confirm local landline
  - [ ] First name + Email → Boost name confidence by +15%

- [ ] **Conflict Handling:**
  - [ ] Multiple candidates → Choose highest score
  - [ ] PLZ contradicts City → Prefer PLZ (weight 10 > 8)
  - [ ] Name ambiguous → Check for legal form as tiebreaker
  - [ ] Log conflicts to `debug.log` for review

- [ ] **Cascading Effects:**
  - [ ] High-confidence address → Increase threshold for 2nd address to 0.75
  - [ ] Company detected → Suppress person name from same line
  - [ ] Multiple phones → Classify by prefix (`030` = landline, `0176` = mobile)

### Phase 4: Testing & Validation (Week 7)

#### 4.1 Test Suite
- [ ] **Unit Tests:**
  - [ ] Test each anchor detection function independently
  - [ ] Test blacklist regex with 100+ known false positives
  - [ ] Test legal form matching with variations (dots, spaces, case)
  - [ ] Test proximity calculations

- [ ] **Integration Tests:**
  - [ ] Run against 100 real-world business card scans
  - [ ] Compare old parser vs new parser results
  - [ ] Measure false positive reduction
  - [ ] Measure confidence score distribution

#### 4.2 Benchmarking
- [ ] **Performance Metrics:**
  - [ ] Target: <50ms per contact (including DB lookups)
  - [ ] Profile anchor detection (likely bottleneck: street matching)
  - [ ] Optimize: Use Set for O(1) lookups instead of Array.includes()
  - [ ] Consider: Cache frequently matched cities/streets in memory

#### 4.3 Confidence Reporting
- [ ] Implement JSON output with confidence scores:
  ```json
  {
    "fields": {
      "name": { "value": "Max Müller", "confidence": 0.85, "anchors": ["firstName"] },
      "company": { "value": "ABC GmbH", "confidence": 0.92, "anchors": ["legalForm"] },
      "address": { "value": "Hauptstr. 1, 10115 Berlin", "confidence": 0.94, "anchors": ["plz", "city", "street"] },
      "phone": { "value": "+49 30 12345678", "confidence": 0.78, "anchors": ["areaCode"] }
    },
    "meta": {
      "totalAnchors": 5,
      "processingTime": "42ms",
      "flaggedForReview": []
    }
  }
  ```

### Phase 5: AI Fallback Integration (Week 8)
- [ ] **Low-Confidence Escalation:**
  - [ ] If any field <0.5 confidence → Flag for AI enrichment
  - [ ] Pass anchor data to AI for context-aware correction
  - [ ] AI can override low-confidence fields or fill gaps

- [ ] **Hybrid Mode:**
  - [ ] Regex parser runs first (fast, offline)
  - [ ] High-confidence fields: Accept immediately
  - [ ] Low-confidence fields: Send to AI for validation
  - [ ] Best of both worlds: Speed + Accuracy

---

## Phase 4: Scaling & Performance (20k+ Contacts)
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

---

## 🔮 Future / Ideas

**Legend:** ⚡ = Quick Win (1-5h implementation)

### 🤖 AI & Intelligence
- [ ] **Follow-up Assistant:** AI drafts personalized follow-up emails based on scan context & notes
- [ ] **Auto-Tagging:** AI categorizes contacts (client, vendor, friend, etc.)
- [ ] **Profile Enrichment:** Auto-lookup of LinkedIn/company data via AI
- [ ] **Meeting Prep:** AI generates briefing notes before meetings
- [ ] **Contact Scoring:** Rank contacts by importance/interaction frequency
- [ ] **Smart Reminders:** "You haven't contacted [Name] in 6 months"
- [ ] **Salutation Generator:** AI suggests proper greeting based on culture/title
- [ ] **Language Detection:** Auto-detect and translate foreign business cards
- [ ] **AI Grounding:** Real web search to complete missing data
- [ ] **Health Check:** AI scans for missing country codes, formatting errors
- [ ] **Enrichment:** "Update from Signature" (Paste text → Update Contact)
- [ ] **Relationship Graph:** Visualize connections between contacts (who knows who?)
- [ ] **Smart Grouping:** Auto-categorize contacts by industry, location, or role
- [ ] **Voice Memos:** Record audio notes for contacts, auto-transcribed by AI
- [ ] **NLP Integration:** Use `compromise.js` for smarter offline parsing of natural text


### 🔗 Integrations & Sync
- [ ] **WebDAV Sync:** Direct synchronization with CardDAV servers (Nextcloud, iCloud)
- [ ] **LinkedIn Import:** Direct import from LinkedIn connections
- [ ] **Email Extraction:** Scan inbox for signatures and auto-import
- [ ] **CRM Integration:** HubSpot / Salesforce via API
- [ ] **Outlook Add-in:** Direct integration into Microsoft 365
- [ ] **Zapier / Make Webhooks:** Trigger workflows when a contact is added
- [ ] **Calendar Integration:** Show "Last Met" date and upcoming birthdays in dashboard
- [ ] **Browser Extension:** Chrome/Firefox Add-on to "grab" contact data
- [ ] **Email Signature Parser:** Paste an email signature to create a contact instantly
- [ ] **Recent Interactions:** Sort by "Last Contacted" (if integrated with email/calendar)

### 🔄 Import & Export
- [ ] **Offline-OCR:** Tesseract.js fallback when offline
- [ ] **vCard 4.0 Support:** Full RFC 6350 compatibility
- [x] **Better Phone Parsing:** Use `libphonenumber-js` for robust international number handling
- [ ] ⚡ **Markdown Export:** Generate `.md` table from contacts
- [ ] ⚡ **JSON Export:** Machine-readable format with JSON.stringify
- [ ] ⚡ **Batch QR Generation:** Generate QR codes for all contacts at once
- [ ] **Template System:** Custom export templates (letterhead, labels, etc.)
- [ ] **Business Card API:** Public API for third-party integrations
- [ ] ⚡ **Copy vCard to Clipboard:** Quick copy button with Clipboard API

### 📱 Mobile & Device Features
- [ ] **NFC Beam:** Share contacts via NFC tap (iOS/Android)
- [ ] **Apple Wallet Integration:** Save contacts as passes for quick access
- [ ] **Widget Support:** Dashboard widget with recent contacts and quick scan
- [ ] **Apple Watch App:** Quick view of VIP contacts and scan reminders
- [ ] **Shake to Scan:** Shake phone to instantly open camera for business card scan
- [ ] **Voice-to-Contact:** Dictate business cards

### 🎨 UX & Visualization
- [ ] **Contact Timeline:** Visual timeline of when/where contacts were added
- [ ] **Heat Map:** Geographic visualization of contact locations
- [ ] **Company Clusters:** Group contacts by organization with visual org charts
- [ ] ⚡ **Compact Mode:** Ultra-dense list view toggle
- [ ] **Custom Themes:** Let users create/share color schemes
- [ ] **Contact Cards 3D:** Swipeable 3D card stack UI for browsing
- [ ] ⚡ **Quick Preview:** Hover cards for instant contact preview
- [ ] ⚡ **Confetti Animation:** Celebrate 100/500/1000 contacts milestone
- [ ] ⚡ **Contact Count Badge:** Show total contacts in header
- [ ] ⚡ **Print Stylesheet:** Optimize contact list for printing

### 🔍 Search & Discovery
- [ ] **Fuzzy Date Search:** "contacts from last conference", "added this month"
- [ ] **Visual Search:** Find contacts by uploaded photo (face recognition)
- [ ] **Contextual Search:** "people I met at [location]" using note metadata
- [ ] **Tag Autocomplete:** Smart tag suggestions based on job title/industry
- [ ] **Duplicate Suggestions:** Proactive "Is this the same person?" prompts

### 📊 Analytics & Insights
- [ ] **Dashboard:** Stats on total contacts, growth over time, top companies
- [ ] **Industry Breakdown:** Pie chart of contact industries
- [ ] **Network Value:** Estimate professional network size/value
- [ ] ⚡ **Contact Quality Score:** Show completeness % per contact
- [ ] **Scan Statistics:** Best scan times, OCR accuracy trends
- [ ] ⚡ **Missing Field Indicator:** Highlight empty required fields
- [ ] ⚡ **Duplicate Count Badge:** Show duplicate count in header

### 🎯 Productivity & Workflow
- [ ] **Quick Actions:** Swipe gestures for common tasks (call, email, delete)
- [ ] ⚡ **Favorites/VIP:** Star important contacts for quick access
- [ ] **Contact Merging Queue:** Review queue for potential duplicates
- [ ] **Scheduled Exports:** Auto-backup every week/month
- [ ] ⚡ **Print Layouts:** Generate printable contact directories
- [ ] **Name Pronunciation:** Audio clips for difficult names (TTS or recorded)
- [ ] **Birthday Reminders:** Push notifications for contact birthdays
- [ ] ⚡ **Smart Clipboard:** Auto-detect vCard text on paste
- [ ] ⚡ **Keyboard Shortcuts:** `Cmd+S` (Save), `Cmd+N` (New Scan), `Cmd+F` (Search)
- [ ] ⚡ **Recent Contacts Widget:** Show last 5 scans in header
- [ ] ⚡ **Last Exported Timestamp:** Show when last backup was made

### 🤝 Networking & Events
- [ ] **Event Mode:** Auto-tag all scans with a specific event name (e.g., "DMEXCO 2025")
- [ ] **Digital Business Card:** Public profile page (QR/NFC) for the user to share their own info
- [ ] **Team Sharing:** Share specific contact lists or folders with colleagues (E2E Encrypted)
- [ ] **Shared Collections:** Create shared contact folders for teams
- [ ] **Contact Requests:** Request missing info from contacts via email/SMS
- [ ] **Team Leaderboard:** Gamify contact collection at events
- [ ] **Permission System:** Granular sharing (view-only, edit, admin)
- [ ] **Change History:** Track who edited what and when
- [ ] **Comments:** Team members can comment on contacts

### 🛡️ Security & Privacy
- [ ] **Local Encryption:** Encrypt IndexedDB at rest with a user password/key
- [ ] **Biometric Lock:** Require FaceID/TouchID to open the app
- [ ] **Audit Log:** Track who accessed/exported which contacts
- [ ] **Self-Destructing Shares:** Time-limited contact sharing
- [ ] **Watermarking:** Embed metadata in shared vCards to track leaks
- [ ] **GDPR Compliance Tools:** Auto-delete after X months, consent tracking
- [ ] **Anonymization Mode:** Remove PII for demo/testing purposes
- [ ] **Secure Vault:** Encrypted section for sensitive contacts

### 🌐 Platform & Infrastructure
- [ ] **Desktop App:** Electron wrapper for native desktop experience
- [ ] **CLI Tool:** Command-line interface for automation
- [ ] **API Documentation:** OpenAPI spec for developers
- [ ] **Plugin System:** Allow community extensions
- [ ] **Themes Marketplace:** Download/share custom themes
- [ ] **Local LLM Auto-Discovery:** Automatically find running Ollama instances

### ⚙️ Technical Improvements
- [ ] ⚡ **Image WebP Conversion:** Auto-convert uploads to WebP
- [ ] ⚡ **Search Debouncing:** Reduce search lag with 300ms debounce
- [ ] ⚡ **Lazy Load Images:** Defer offscreen image loading
- [ ] ⚡ **ARIA Labels:** Add missing accessibility labels
- [ ] ⚡ **Focus Indicators:** Improve keyboard navigation
- [ ] ⚡ **High Contrast Mode:** Support for visually impaired
- [ ] ⚡ **Dark Mode Auto-Switch:** Follow system preference

 
