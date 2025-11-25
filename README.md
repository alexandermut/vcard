# vCards - Intelligent Business Card Scanner & Editor

**vCards** is a modern Web Application (PWA) that instantly converts physical business cards and digital signatures into perfectly formatted contacts. It combines the speed of local regex algorithms with the intelligence of Google Gemini AI (GPT-4 Level) to ensure maximum data quality.

The app operates on a **"Privacy First"** principle: Data is stored only in the browser by default. AI features are optional and require active consent.

---

## 🚀 Key Features

*   **Hybrid Parser:**
    *   *Offline:* Lightning-fast signature detection via complex regex patterns (optimized for DACH addresses).
    *   *Online (AI):* Google Gemini 3 Pro for "forensic" data extraction, correction, and enrichment.
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
*   **UI/UX:** Dark Mode (Default), Responsive Design, Standalone pages for Imprint & Privacy.

---

## 🛠️ Tech Stack

*   **Frontend:** React 18, TypeScript, Vite
*   **Styling:** Tailwind CSS
*   **AI Engine:** Google Gemini API (`gemini-3-pro-preview`) via `@google/genai` SDK
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

---

## 👏 Credits / Open Source Licenses

This project stands on the shoulders of giants. We use and love the following open-source libraries:

*   **[React](https://react.dev/)** (MIT) - UI Library
*   **[Vite](https://vitejs.dev/)** (MIT) - Build Tool
*   **[Tailwind CSS](https://tailwindcss.com/)** (MIT) - Utility-first CSS framework
*   **[Google GenAI SDK](https://www.npmjs.com/package/@google/genai)** (Apache 2.0) - AI Integration
*   **[idb](https://github.com/jakearchibald/idb)** (ISC) - IndexedDB Promise Wrapper
*   **[jsQR](https://github.com/cozmo/jsQR)** (Apache 2.0) - QR Code Scanning
*   **[qrcode](https://github.com/soldair/node-qrcode)** (MIT) - QR Code Generation
*   **[JSZip](https://stuk.github.io/jszip/)** (MIT) - ZIP File Creation
*   **[Lucide React](https://lucide.dev/)** (ISC) - Beautiful Icons
*   **[Vite Plugin PWA](https://vite-pwa-org.netlify.app/)** (MIT) - PWA Capabilities

### Data Sources
*   **Street Directory:** The offline street database is derived from **[OpenPLZ API](https://www.openplzapi.org/)**.
    *   Source: [GitHub Repository](https://github.com/openpotato/openplzapi)
    *   License: [Open Data Commons Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/)

A big thank you to all maintainers and contributors of these projects!

---

## 📝 License

MIT License - Alexander Mut

> **Note:** While not strictly required by the license, I kindly ask you to keep the link to the original project in the footer or credits if you use this code publicly. It helps the project grow! ❤️
