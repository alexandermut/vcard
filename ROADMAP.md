# 🗺️ vCardAI Roadmap

Diese Datei trackt den aktuellen Entwicklungsstand und geplante Features.

## ✅ Fertiggestellt (Done)

### Core
- [x] Projekt-Setup (React, Vite, TS, Tailwind)
- [x] Offline-First Architektur
- [x] PWA Support (Manifest, Icons, Service Worker Vorbereitung)

### Editor & Parser
- [x] Regex-Parser für Text-Input (Immpressum, Signaturen)
- [x] Unterstützung für DACH-Adressformate & Städte-Datenbank
- [x] vCard 3.0 Generator & Parser
- [x] Editor-Tabs: Text, Code, Enrich
- [x] Drag & Drop für Bilder

### AI Integration
- [x] Google Gemini Anbindung (`gemini-3-pro-preview`)
- [x] Intelligentes Prompting (Context-Aware, Noise Removal)
- [x] Vision-Support (Visitenkarten-Scan)
- [x] Update-Modus ("Füge LinkedIn hinzu...")

### Workflow & UX
- [x] Scan-Modal mit "Scan & Next" Workflow
- [x] Hintergrund-Warteschlange (Queue) für Scans
- [x] Visueller Queue-Indikator
- [x] Smart Merge (Dubletten-Erkennung via Name & Telefon)
- [x] Verlauf (History) mit Originalbildern
- [x] Dark Mode / Light Mode
- [x] Mehrsprachigkeit (DE / EN)

### Export
- [x] vCard Download (.vcf)
- [x] CSV Export (Excel-optimiert)
- [x] Bilder-Export (ZIP)
- [x] QR-Code Generierung

### Rechtliches
- [x] Impressum (DDG konform)
- [x] Datenschutz (Google Cloud & AI spezifisch)

---

## 🚧 In Arbeit / Verbesserungswürdig

- [ ] **Performance:** Optimierung der `cities.ts` (Lazy Loading), da sie das Bundle groß macht.
- [ ] **Offline-OCR:** Integration von Tesseract.js als Fallback, wenn kein Internet/API-Key vorhanden ist.

## 🔮 Zukunftsvisionen (Backlog)

- [ ] **WebDAV Sync:** Direkte Synchronisation mit CardDAV Servern (Nextcloud, iCloud).
- [ ] **CRM Integration:** Direkter Export zu HubSpot / Salesforce via API.
- [ ] **Team-Modus:** Teilen von gescannten Kontakten in einem Team (verschlüsselt).
- [ ] **KI-Recherche:** Echte Websuche ("Grounding") zur automatischen Vervollständigung von fehlenden Daten.
- [ ] **Digital Wallet:** Export als `.pkpass` für Apple Wallet & Google Wallet.
- [ ] **NFC Writer:** Schreiben von vCards auf NFC-Tags (via WebNFC API).
- [ ] **Voice-to-Contact:** Diktieren von Visitenkarten ("Erstelle Kontakt für Max Mustermann...").
- [ ] **LinkedIn PDF Import:** Extrahieren von Daten aus LinkedIn Profil-PDFs.
- [ ] **Custom Branding:** Eigenes Logo und Farben für den QR-Code und die Web-Ansicht.
- [ ] **Self-Hosting:** Docker-Container für einfaches Deployment im Intranet.
- [ ] **HTML Signatur Generator:** Erstellung von kopierbaren E-Mail-Signaturen aus den vCard-Daten.
- [ ] **Kiosk / Event Modus:** Vereinfachte Oberfläche für Messen zur schnellen Lead-Erfassung.
- [ ] **Multi-Identität:** Verwaltung mehrerer eigener Profile (Privat, Arbeit, Verein).
- [ ] **Map View:** Visualisierung aller Kontakte auf einer interaktiven Karte.
- [ ] **Label Printing:** PDF-Export für Adress-Etiketten (z.B. Avery Zweckform).
- [ ] **Kalender-Export:** Geburtstage als `.ics` Kalender-Abonnement exportieren.
- [ ] **Outlook Add-in:** Direkte Integration in Microsoft 365 / Exchange.
- [ ] **Google Contacts Sync:** Bidirektionale Synchronisation mit dem Google Adressbuch (People API).
- [ ] **Browser Extension:** Chrome/Firefox Add-on zum "Grabben" von Kontaktdaten.
    - *Context Menu:* "Zu vCard hinzufügen" bei markiertem Text.
    - *LinkedIn Integration:* Button im Profil zum direkten Export als vCard.
    - *Impressum Parser:* Erkennt automatisch Adressdaten auf Kontaktseiten.
    - *Sync:* Sendet Daten direkt an die laufende vCard-Editor Web-App.
- [ ] **Design-Editor:** Visueller Drag & Drop Editor für das Layout von druckbaren Visitenkarten (PDF).
- [ ] **Analytics:** (Optional) Tracking von Scans bei Verwendung von Shortlinks.
- [ ] **LDAP / Active Directory:** Unternehmens-Adressbuch Anbindung.
- [ ] **Webhooks:** API-Endpunkt zum automatischen Erstellen von Karten aus anderen Apps (z.B. Typeform).
- [ ] **Barrierefreiheit:** Automatische Generierung von phonetischen Feldern für Screenreader.
- [ ] **Social Photo Link:** Profilbild direkt von LinkedIn/Xing/Gravatar verknüpfen (ohne Upload).