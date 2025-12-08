# Kontakte.me - Intelligent Business Card Scanner & Editor

**Kontakte.me** is a modern Web Application (PWA) that instantly converts physical business cards and digital signatures into perfectly formatted contacts. It combines the speed of local regex algorithms with the intelligence of Google Gemini AI (GPT-4 Level) to ensure maximum data quality.

The app operates on a **"Privacy First"** principle: Data is stored only in the browser by default. AI features are optional and require active consent.

---

## 🚀 Key Features

*   **Hybrid Parser:**
    *   *Offline:* Lightning-fast signature detection via complex regex patterns (optimized for DACH addresses).
    *   *Online (AI):* Google Gemini 3 Pro for "forensic" data extraction, correction, and enrichment.
    *   *Transparent Editor:* Dedicated tabs for "Regex Parser" (Input), "vCard Code" (Output), and "OCR / Tesseract" (Raw Debug View).
*   **Smart Scan:** Simply photograph business cards (front & back). The AI extracts all data.
*   **QR Code Scanner:** Integrated scanner for vCard QR codes. Supports direct vCard data and download links (CORS-Safe).
*   **Batch Queue:** Scan multiple cards in succession – processing runs asynchronously in the background.
*   **Smart Merge:** Detects duplicates (Name or Phone) and merges new data with existing entries (Enrichment).
*   **Intelligent Search:** Database-based full-text search (IndexedDB) across all fields (Name, Company, Email, Phone, Address, Notes) with highlighting.
*   **Offline Street Database:** Includes a 53MB street directory for instant address validation and auto-correction (Fuzzy Matching).
*   **Backup & Restore:** Full history backup including images as JSON file. Easy restoration on any device.
*   **Social Media Intelligence:** Automatic search for LinkedIn/Xing profiles.
*   **Data Enrichment:** "Enrich" mode to update existing contacts via AI command.
*   **Complete History:** All scans are stored locally (IndexedDB with Blob optimization).
*   **Export:** vCard (.vcf), CSV (Excel-compatible), and Image Download (ZIP).
*   **Cross-Platform:** Works as an installable PWA on Desktop, iOS, and Android.
*   **Unified Sidebar UI:** Modern, consistent sidebar interface for all tools (Scan, Settings, History, Help).
*   **Advanced Help & Manual:** Comprehensive offline documentation with tips, tricks, and troubleshooting guides.
*   **Flexible OCR Methods:** Choose between Auto (Offline-First), Tesseract (Offline Only), Gemini (Online Only), Hybrid (Parallel), or Regex-Training (Debug).
*   **Regex Training Mode:** Special debug mode that runs dual scans to generate training data for improving the offline parser.
*   **UI/UX:** Dark Mode (Default), Responsive Design, Standalone pages for Imprint & Privacy.

---

## 🛠️ Tech Stack

*   **Frontend:** React 18, TypeScript, Vite
*   **Styling:** Tailwind CSS
*   **AI Engine:** Google Gemini API (`gemini-3-pro-preview`) via `@google/genai` SDK
*   **OCR Engine:** Tesseract.js (Offline OCR with German language support)
*   **Worker Management:** Comlink (Type-safe Web Worker communication)
*   **Image Processing:** browser-image-compression (Worker-based compression)
*   **Utilities:** `jszip` (Export), `qrcode` (Gen), `jsqr` (Scan), `lucide-react` (Icons)
*   **Hosting:** GitHub Pages (Static Site)

---

## 📦 Installation & Development

### Prerequisites
*   Node.js (v18+)
*   A Google AI Studio API Key (free to obtain)

### Setup
1.  Clone repository:
    ```bash
    git clone https://github.com/YOUR_USER/vcard.git
    cd vcard
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start development server:
    ```bash
    npm run dev
    ```
4.  Open App: `http://localhost:5173`

### 🔧 Regex Debugger
The application includes a built-in Regex Debugger for testing and refining parsing logic. By default, this tool is hidden.
To access it, append `?debug_regex=true` to the URL:
`http://localhost:5173/?debug_regex=true`

### 🧪 Regex Training Mode
Enable **Regex Training Mode** in Settings → OCR Method → "🛠️ Regex Training (Debug)" to:
- Generate **dual test cases** (real + anonymized) for parser improvement
- Compare Tesseract (offline) vs. Gemini (online) results
- Export training data with structure-preserving anonymization

**Test Case Workflow:**
1. Scan a business card in Regex Training mode
2. Click the 🔴 JSON button in the preview
3. Two files download:
   - `real_testcase_*.json` → Save to `tests/real_cases/` (local training only, .gitignore)
   - `anon_testcase_*.json` → Save to `data/test_cases/` (safe for Git commits)

See [`tests/TEST_CASE_WORKFLOW.md`](tests/TEST_CASE_WORKFLOW.md) for details.

### ⚠️ Important Note on Local LLMs (Ollama)
If you want to use **local models (e.g., Ollama)**, you **must** use the app via `http://localhost:5173` (the dev server).
*   The server includes a **Proxy** that forwards requests to `/ollama` automatically to `http://127.0.0.1:11434`.
*   This bypasses CORS issues and "Mixed Content" warnings.
*   Directly opening `index.html` or hosting on GitHub Pages will not work with local LLMs by default (due to browser security policies).

### Production Build
```bash
npm run build
```
The output lands in the `dist/` folder and can be hosted on any static web server.

---

## 🔒 Privacy & Security

*   **No Backend:** The app has no server of its own. All logic runs in the user's browser.
*   **Bring Your Own Key (BYOK):** Users use their own Google API Key. There is no middleman.
*   **Local Storage:** Contact data and images reside in the browser's `localStorage` / `IndexedDB`.
*   **Transparency:** Data leaves the browser only when actively using AI features (Upload to Google Gemini).

## 🙏 Open Source Acknowledgments

This project wouldn't exist without these amazing open source libraries:

### Core Framework & Build Tools
*   **[React](https://react.dev/)** (MIT) - UI Library
*   **[Vite](https://vitejs.dev/)** (MIT) - Build Tool & Dev Server
*   **[TypeScript](https://www.typescriptlang.org/)** (Apache 2.0) - Type Safety
*   **[Tailwind CSS](https://tailwindcss.com/)** (MIT) - Utility-First CSS

### AI & API
*   **[@google/genai](https://github.com/google/generative-ai-js)** (Apache 2.0) - Google Gemini SDK
*   **[@react-oauth/google](https://github.com/MomenSherif/react-oauth)** (MIT) - Google OAuth Integration

### Image & Document Processing
*   **[jsQR](https://github.com/cozmo/jsQR)** (Apache 2.0) - QR Code Scanning
*   **[qrcode](https://github.com/soldair/node-qrcode)** (MIT) - QR Code Generation
*   **[smartcrop](https://github.com/jwagner/smartcrop.js)** (MIT) - Intelligent Image Cropping
*   **[jscanify](https://github.com/ColonelParrot/jscanify)** (MIT) - Document Detection & Auto-Capture
*   **[PDF.js](https://mozilla.github.io/pdf.js/)** (Apache 2.0) - PDF Rendering & Conversion
*   **[Tesseract.js](https://github.com/naptha/tesseract.js)** (Apache 2.0) - Offline OCR Engine with German support
*   **[browser-image-compression](https://github.com/Donaldcwl/browser-image-compression)** (MIT) - Professional image compression

### Data & Storage
*   **[idb](https://github.com/jakearchibald/idb)** (ISC) - IndexedDB Wrapper
*   **[JSZip](https://stuk.github.io/jszip/)** (MIT) - ZIP File Creation
*   **[libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js)** (MIT) - Phone Number Validation
*   **[ilib-address](https://github.com/iLib-js/ilib-address)** (Apache 2.0) - International Address Parsing
*   **[namefully](https://github.com/ralhuebn/namefully)** (MIT) - Advanced Name Parsing

### UI Components & Workers
*   **[Lucide React](https://lucide.dev/)** (ISC) - Beautiful Icons
*   **[Sonner](https://sonner.emilkowal.ski/)** (MIT) - Toast Notifications
*   **[react-virtuoso](https://virtuoso.dev/)** (MIT) - Virtualized List Rendering
*   **[Comlink](https://github.com/GoogleChromeLabs/comlink)** (Apache 2.0) - Type-safe Web Worker RPC

### PWA & Fonts
*   **[Vite Plugin PWA](https://vite-pwa-org.netlify.app/)** (MIT) - PWA Capabilities
*   **[@fontsource/inter](https://fontsource.org/)** (OFL-1.1) - Inter Font Family

### Data Sources
*   **Street Directory:** The offline street database is derived from **[OpenPLZ API](https://www.openplzapi.org/)**.
    *   Source: [GitHub Repository](https://github.com/openpotato/openplzapi)
    *   License: [Open Data Commons Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/) ([License File](https://github.com/openpotato/openplzapi/blob/develop/LICENSE))

A big thank you to all maintainers and contributors of these projects!

---

## 📝 License

MIT License - Alexander Mut

> **Note:** While not strictly required by the license, I kindly ask you to keep the link to the original project in the footer or credits if you use this code publicly. It helps the project grow! ❤️
