# vCards - Intelligenter Visitenkarten-Scanner & Editor

**vCards** ist eine moderne Web-Anwendung (PWA), die physische Visitenkarten und digitale Signaturen blitzschnell in perfekt formatierte Kontakte umwandelt. Sie kombiniert die Geschwindigkeit lokaler Regex-Algorithmen mit der Intelligenz von Google Gemini AI (GPT-4 Level), um maximale Datenqualität zu gewährleisten.

Die App arbeitet nach dem **"Privacy First"** Prinzip: Daten werden standardmäßig nur im Browser gespeichert. KI-Funktionen sind optional und erfordern eine aktive Einwilligung.

---

## 🚀 Hauptfeatures

*   **Hybrider Parser:**
    *   *Offline:* Blitzschnelle Erkennung von Signaturen durch komplexe Regex-Muster (optimiert für DACH-Adressen).
    *   *Online (KI):* Google Gemini 3 Pro für "forensische" Datenextraktion, Korrektur und Anreicherung.
*   **Smart Scan:** Visitenkarten einfach fotografieren (Vorder- & Rückseite). Die KI extrahiert alle Daten.
*   **QR Code Scanner:** Integrierter Scanner für vCard QR-Codes. Funktioniert komplett lokal im Browser.
*   **Stapel-Verarbeitung (Batch Queue):** Mehrere Karten nacheinander scannen – die Verarbeitung läuft asynchron im Hintergrund.
*   **Smart Merge:** Erkennt Dubletten (Name oder Telefonnummer) und führt neue Daten mit bestehenden Einträgen zusammen (Enrichment).
*   **Intelligente Suche:** Datenbank-basierte Volltextsuche (IndexedDB) über alle Felder (Name, Firma, E-Mail, Telefon, Adresse, Notizen) mit Highlighting.
*   **Backup & Restore:** Vollständiges Backup der Historie inkl. Bilder als JSON-Datei. Einfache Wiederherstellung auf jedem Gerät.
*   **Social Media Intelligence:** Automatische Suche nach LinkedIn/Xing Profilen.
*   **Daten-Anreicherung:** "Enrich"-Modus, um bestehende Kontakte per KI-Befehl zu aktualisieren.
*   **Vollständiger Verlauf:** Alle Scans werden lokal gespeichert (IndexedDB mit Blob-Optimierung).
*   **Export:** vCard (.vcf), CSV (Excel-kompatibel) und Bilder-Download (ZIP).
*   **Cross-Platform:** Funktioniert als installierbare PWA auf Desktop, iOS und Android.

---

## 🛠️ Technologie-Stack

*   **Frontend:** React 18, TypeScript, Vite
*   **Styling:** Tailwind CSS
*   **AI Engine:** Google Gemini API (`gemini-3-pro-preview`) via `@google/genai` SDK
*   **Utilities:** `jszip` (Export), `qrcode` (Gen), `jsqr` (Scan), `lucide-react` (Icons)
*   **Hosting:** GitHub Pages (Static Site)

---

## 📦 Installation & Entwicklung

### Voraussetzungen
*   Node.js (v18+)
*   Ein Google AI Studio API Key (kostenlos erhältlich)

### Setup
1.  Repository klonen:
    ```bash
    git clone https://github.com/DEIN_USER/vcard.git
    cd vcard
    ```
2.  Abhängigkeiten installieren:
    ```bash
    npm install
    ```
3.  Entwicklungsserver starten:
    ```bash
    npm run dev
    ```
4.  App öffnen: `http://localhost:5173`

### ⚠️ Wichtiger Hinweis zu lokalen LLMs (Ollama)
Wenn Sie **lokale Modelle (z.B. Ollama)** nutzen möchten, **müssen** Sie die App über `http://localhost:5173` (den Entwicklungsserver) nutzen.
*   Der Server enthält einen **Proxy**, der Anfragen an `/ollama` automatisch an `http://127.0.0.1:11434` weiterleitet.
*   Dies umgeht CORS-Probleme und "Mixed Content" Warnungen des Browsers.
*   Ein direkter Aufruf der `index.html` oder Hosting auf GitHub Pages funktioniert mit lokalen LLMs standardmäßig nicht (wegen Browser-Sicherheitsrichtlinien).

### Build für Produktion
```bash
npm run build
```
Der Output landet im `dist/` Ordner und kann auf jedem statischen Webserver gehostet werden.

---

## 🔒 Datenschutz & Sicherheit

*   **Kein Backend:** Die App hat keinen eigenen Server. Alle Logik läuft im Browser des Nutzers.
*   **Bring Your Own Key (BYOK):** Nutzer verwenden ihren eigenen Google API Key. Es gibt keinen Mittelsmann.
*   **Lokaler Speicher:** Kontaktdaten und Bilder liegen im `localStorage` des Browsers.
*   **Transparenz:** Daten verlassen den Browser nur bei aktiver Nutzung der KI-Features (Upload zu Google Gemini).

---

## 👏 Credits / Open Source Licenses

Dieses Projekt steht auf den Schultern von Giganten. Wir nutzen und lieben folgende Open-Source-Bibliotheken:

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

Ein großes Dankeschön an alle Maintainer und Contributor dieser Projekte!

---

## 📝 Lizenz

MIT License - Alexander Mut
