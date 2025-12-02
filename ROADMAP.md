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

### Phase 1: False Positive Elimination
- [ ] ⚡ **Phone Number False Positives:** Distinguish phone numbers from VAT/UST/IBAN/HR numbers
  - **Problem:** Parser currently misidentifies non-phone numbers (USt-ID, IBAN, Handelsregister, etc.) as phone numbers
  - **Solution:** Implement negative lookahead with prefix blacklist
  - **Prefix Catalog (Numbers to EXCLUDE):**
    - **Tax/Registration:** `USt-ID`, `USt.ID`, `Umsatzsteuer-ID`, `VAT`, `VAT-ID`, `VAT No`, `UID`, `Steuernummer`, `St.-Nr.`, `Steuer-Nr.`
    - **Trade Registry:** `Handelsregister`, `HRB`, `HRA`, `HR`, `Registernummer`, `Reg.-Nr.`, `Firmenbuchnummer`, `FN`
    - **Banking:** `IBAN`, `BIC`, `SWIFT`, `Kontonummer`, `Konto-Nr.`, `Bankleitzahl`, `BLZ`
    - **Business IDs:** `Artikelnummer`, `Art.-Nr.`, `Bestellnummer`, `Best.-Nr.`, `Kundennummer`, `Kd.-Nr.`, `Rechnungsnummer`, `Rechn.-Nr.`
    - **Personal IDs:** `Personalausweis`, `Ausweis-Nr.`, `Pass-Nr.`, `Lizenznummer`, `Zertifikatsnummer`, `Mitgliedsnummer`
    - **Dates:** `geb.`, `geboren`, `Geburtsdatum` (to avoid date patterns like `01.01.1990`)
  - **Implementation:** Add to `safeParser.ts` with case-insensitive regex

### Phase 2: Anchor-Based Context Detection
- [ ] **Multi-Pass Analysis Framework:** Leverage existing reference data as "anchors" for smarter text analysis
  - **Problem:** Current regex parser works in isolation without using available reference databases
  - **Available Reference Data:**
    - ✅ **Landline Prefixes:** 5000+ German area codes (`landlinePrefixes.js`)
    - ✅ **ZIP Codes:** Full German PLZ database with city mappings
    - ✅ **Street Names:** 53MB database of German streets (`cities.ts`)
    - ✅ **City Names:** Complete list of German cities
    - ✅ **First Names:** German first name directory (potential addition)
  - **New Parsing Concept - Multi-Pass Analysis:**
    1. **Pass 1: Anchor Detection** - Identify known entities (PLZ, city, street, area code)
    2. **Pass 2: Context Inference** - Use anchors to validate nearby fields
       - If PLZ found → validate adjacent city name against database
       - If area code found → validate it's actually a landline, not mobile
       - If street name found → extract house number pattern
       - If first name found → increase confidence for name extraction
    3. **Pass 3: Confidence Scoring** - Assign scores based on anchor proximity
       - High confidence: Field validated by 2+ anchors (e.g., "10115 Berlin" = PLZ + City match)
       - Medium confidence: Field validated by 1 anchor
       - Low confidence: Pure regex match without anchor validation
  - **Benefits:**
    - Reduce false positives (e.g., random numbers mistaken for phone)
    - Improve address accuracy (validate street + PLZ + city consistency)
    - Better name extraction (distinguish "Max Müller" from company names)
    - Enable fuzzy matching (typos in city names can be corrected)

### Phase 3: Hierarchical Weighting System
- [ ] **Implement Priority-Based Field Extraction:**
  - Create `anchorDetection.ts` utility
  - Refactor `safeParser.ts` to use multi-pass approach
  - Add confidence scores to parsed results
  - Log validation mismatches for debugging
  - **Analysis Hierarchy & Weighting System:**
    - **Phase 1: Anchor Discovery (Priority Order)**
      1. **PLZ (Weight: 10)** - Most reliable anchor, always 5 digits, validated against database
      2. **Area Code (Weight: 9)** - 5000+ prefixes, validated against `landlinePrefixes.js`
      3. **City Name (Weight: 8)** - Cross-reference with PLZ, fuzzy match allowed (Levenshtein distance ≤ 2)
      4. **Street Name (Weight: 7)** - 53MB database, validate with city context
      5. **First Name (Weight: 6)** - Lower priority, many false positives (e.g., city names)
      6. **Email Domain (Weight: 5)** - Useful for company validation
    - **Phase 2: Field Extraction with Context Boosting**
      - **Address Field:**
        - Base Score: regex match for address pattern
        - +30% if adjacent PLZ found
        - +20% if city name validated
        - +15% if street name in database
        - +10% if house number pattern matches
        - **Final Decision:** Accept if score ≥ 60%
      - **Phone Field:**
        - Base Score: regex match for phone pattern
        - +40% if area code in landline prefix list
        - -50% if preceded by blacklist prefix (USt-ID, IBAN, etc.)
        - +20% if near address (context: business phone)
        - -30% if looks like IBAN (DE + 20 digits)
        - **Final Decision:** Accept if score ≥ 50%
      - **Name Field:**
        - Base Score: capitalized words pattern
        - +35% if first name in directory
        - +25% if followed by title (Dr., Prof., etc.)
        - +15% if near email/phone (context: contact person)
        - -40% if in all caps (likely company name)
        - -20% if contains "GmbH", "AG", "e.V."
        - **Final Decision:** Accept if score ≥ 55%
      - **Company Field:**
        - Base Score: capitalized phrase
        - +40% if contains legal form (GmbH, AG, KG, etc.)
        - +30% if contains industry keywords (Consulting, Engineering, etc.)
        - +20% if email domain matches extracted company name
        - -30% if looks like person name (First + Last pattern)
        - **Final Decision:** Accept if score ≥ 60%
        - **German Legal Forms (Rechtsformen) - Complete Reference:**
          - **Kapitalgesellschaften (Corporations):**
            - `GmbH` (Gesellschaft mit beschränkter Haftung)
            - `gGmbH` (gemeinnützige GmbH)
            - `UG` (Unternehmergesellschaft haftungsbeschränkt)
            - `AG` (Aktiengesellschaft)
            - `SE` (Societas Europaea / Europäische Gesellschaft)
            - `KGaA` (Kommanditgesellschaft auf Aktien)
          - **Personengesellschaften (Partnerships):**
            - `GbR` (Gesellschaft bürgerlichen Rechts)
            - `OHG` (Offene Handelsgesellschaft)
            - `KG` (Kommanditgesellschaft)
            - `GmbH & Co. KG`
            - `PartG` (Partnerschaftsgesellschaft)
            - `PartG mbB` (mit beschränkter Berufshaftung)
          - **Mischformen (Hybrid Structures):**
            - `GmbH & Co. KG` (häufigste Form)
            - `GmbH & Co. KGaA`
            - `AG & Co. KG`
            - `UG & Co. KG`
            - `SE & Co. KG`
            - `GmbH & Co. OHG`
            - `Ltd. & Co. KG`
            - `Stiftung & Co. KG`
            - **Detection Note:** Match full pattern, not just "KG"
          - **Einzelunternehmen & Sonstige:**
            - `e.K.` (eingetragener Kaufmann)
            - `e.Kfr.` (eingetragene Kauffrau)
            - `Inh.` (Inhaber)
          - **Non-Profit & Vereine:**
            - `e.V.` (eingetragener Verein)
            - `gGmbH` (gemeinnützige GmbH)
            - `Stiftung`
            - `gAG` (gemeinnützige AG)
          - **Öffentliche Einrichtungen:**
            - `AöR` (Anstalt öffentlichen Rechts)
            - `KöR` (Körperschaft öffentlichen Rechts)
          - **Ausländische Formen (häufig in DE):**
            - `Ltd.` (Limited Company - UK)
            - `S.A.` (Société Anonyme - FR/BE)
            - `S.à r.l.` (Société à responsabilité limitée - LU)
            - `B.V.` (Besloten Vennootschap - NL)
            - `Inc.` (Incorporated - US)
            - `LLC` (Limited Liability Company - US)
          - **Variationen & Schreibweisen:**
            - Detect with/without spaces: `GmbH`, `Gm bH`
            - Detect with/without dots: `e.V.`, `eV`, `e V`
            - Case-insensitive matching
            - Detect in company suffix or standalone
    - **Phase 3: Cross-Validation & Conflict Resolution**
      - **Mutual Reinforcement:**
        - PLZ + City match → Boost both by +20%
        - Street + City match → Boost address confidence by +15%
        - Area code + City → Validate phone is local landline
        - First name + Email → Likely contact person, boost name confidence
      - **Conflict Handling:**
        - If multiple addresses found → Choose one with highest score
        - If PLZ contradicts City → Flag for manual review, prefer PLZ
        - If name ambiguous (could be person or company) → Use legal form as tiebreaker
      - **Cascading Effects:**
        - High-confidence address found → Increase threshold for secondary addresses (reduce duplicates)
        - Company identified → Deprioritize person name extraction from same line
        - Multiple phones found → Classify by context (area code = landline, +49 17x = mobile)
    - **Phase 4: Confidence Reporting**
      - Output JSON with per-field confidence scores
      - Flag low-confidence fields for AI enrichment
      - Log anchor matches for debugging
      - Example output:
        ```json
        {
          "name": { "value": "Max Müller", "confidence": 0.85, "anchors": ["firstName"] },
          "address": { "value": "Hauptstr. 1, 10115 Berlin", "confidence": 0.92, "anchors": ["plz", "city", "street"] },
          "phone": { "value": "+49 30 12345678", "confidence": 0.78, "anchors": ["areaCode"] }
        }
        ```



---

##  Phase 4: Scaling & Performance (20k+ Contacts)
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

 
