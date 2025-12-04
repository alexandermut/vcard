import { Language } from '../types';

export const translations = {
  de: {
    appTitle: "Kontakte.me",
    settings: "Einstellungen",
    scan: "Scannen",
    history: "Verlauf",
    export: "Export",
    invalid: "Ungültig",
    saveHistory: "In Verlauf speichern",
    showQR: "QR Code anzeigen",
    share: "Teilen",
    shareError: "Teilen nicht unterstützt",
    qrScannerTitle: "QR Code scannen",
    cameraPermissionError: "Kamera-Zugriff verweigert. Bitte erlauben.",
    qrScanSuccess: "vCard erfolgreich gescannt!",
    loadMore: "Mehr laden",
    searchPlaceholder: "Verlauf durchsuchen...",
    restoreBackup: "Backup laden",



    // Editor
    textTab: "Kontaktdaten Text",
    codeTab: "vCard Code",
    reset: "Reset",
    undo: "Rückgängig",
    aiCorrect: "AI",
    working: "Arbeitet...",
    dragDropTitle: "Bild hier ablegen",
    dragDropSubtitle: "um Scan zu starten",
    textPlaceholder: "Fügen Sie hier Kontaktdaten als Text ein, z.B. aus einer E-Mail-Signatur oder einem Impressum. Vermeiden Sie dabei unnötigen Text, der nicht zu den Kontaktdaten gehört. Für eine optimale Erkennung platzieren Sie jede Information in eine eigene Zeile.\n\nBeispiel:\nAlexander Mut\nabcfinance GmbH\nKamekestrasse 2-8\n50672 Köln\n0171 552 81 87\nalexander.mut@abcfinance.de\nwww.abcfinance.de\n\nSo kann das Offline-System (RegEx) die Daten am besten erkennen. Alternativ können Sie die KI-Funktion (Zauberstab) nutzen, wofür jedoch ein API-Key oder ein lokales LLM erforderlich ist.",
    chars: "Zeichen",
    lines: "Zeilen",

    // Preview
    noCard: "Keine gültige vCard erkannt",
    noCardHint: "Beginnen Sie mit 'BEGIN:VCARD' und beenden Sie mit 'END:VCARD'.",
    search: "Suche",
    fullName: "Voller Name",
    title: "Titel / Position",
    company: "Firma",
    call: "Anrufen",
    email: "Email",
    notes: "Notizen...",
    noteLabel: "NOTIZ",
    birthday: "Geburtstag",
    street: "Straße",
    zip: "PLZ",
    city: "Stadt",
    country: "Land",
    scans: "Original Scans",

    // Scan Modal
    scanTitle: "Karte scannen",
    scanDesc: "Fotografieren Sie die Vorder- und (optional) Rückseite. Gemini Vision extrahiert die Daten automatisch.",
    frontSide: "Vorderseite *",
    backSide: "Rückseite (Optional)",
    photoUpload: "Foto / Upload",
    analyze: "Analysiere Bild...",
    convertToVCard: "In vCard umwandeln",
    poweredBy: "Powered by Google Gemini",
    singleMode: "Einzel",
    batchMode: "Stapel",
    addToQueue: "Scan & Weiter",
    batchHint: "Scannen Sie Karten nacheinander. Sie werden im Hintergrund verarbeitet.",
    pasteHint: 'oder Bild einfügen (Strg+V)',
    scanMode: 'Scan-Modus',
    modeStandard: 'Standard (Nur Karte)',
    modeHybrid: 'Hybrid (Karte + Notizen)',
    hybridHint: 'Karte neben Notizen legen. KI erfasst beides.',

    // Notes
    notesTitle: "Notizen",
    searchNotes: "Notizen durchsuchen...",
    noNotes: "Keine Notizen gefunden.",
    deleteConfirm: "Diese Notiz wirklich löschen?",
    viewContact: "Kontakt anzeigen",
    noteSaveFirst: "Bitte speichern Sie den Kontakt zuerst im Verlauf.",
    paste: "Einfügen",

    // Chat
    chatWithData: "Chat mit Daten",
    chatPlaceholder: "Fragen Sie nach Ihren Daten...",
    chatEmpty: "Stellen Sie Fragen zu Ihren Kontakten und Notizen!",
    chatExample1: "Wer arbeitet bei Google?",
    chatExample2: "Was habe ich über das Meeting notiert?",

    // Queue
    batchQueue: "Verarbeitung",
    processing: "Bearbeitung",
    waiting: "Warteschlange",
    errors: "Fehler",

    // Settings Modal
    settingsTitle: "Einstellungen",
    geminiIntegration: "Google Gemini Integration",
    geminiDesc: "Für Korrektur & Bilderkennung",
    recommended: "Empfohlen",
    connectGoogle: "Mit Google verbinden",
    connected: "Google Konto verbunden",
    orManual: "oder manuell",
    apiKeyLabel: "Gemini API Key",
    generateKey: "Key generieren",
    llmProvider: "LLM Anbieter",
    googleDefault: "Google Gemini",
    openai: "OpenAI",
    customLLM: "Custom / Lokales LLM",
    baseUrl: "Base URL",
    modelName: "Modell Name",
    ollamaDefaults: "Ollama Standardwerte",
    batchUpload: "Stapel-Upload",
    uploadMultiple: "Mehrere Bilder hochladen",
    dragDropFiles: "Dateien hierher ziehen oder klicken",
    batchProcessing: "Verarbeitung läuft...",
    queueEmpty: "Keine Bilder in der Warteschlange",
    removeFromQueue: "Entfernen",
    retryFailed: "Fehlgeschlagene wiederholen",
    clearCompleted: "Abgeschlossene löschen",
    startProcessing: "Verarbeitung starten",
    imagesSelected: "Bilder ausgewählt",
    close: "Schließen",
    cancel: "Abbrechen",
    saveSettings: "Einstellungen speichern",

    // History
    historyTitle: "Verlauf",
    noHistory: "Keine gespeicherten Karten.",
    noHistoryHint: "Erstellte oder gescannte Karten erscheinen hier.",
    load: "Laden",
    vcfBackup: "VCF Backup",
    csvExport: "CSV Export",
    jsonExport: "JSON Export",
    imgExport: "Bilder (ZIP)",
    clearHistory: "Verlauf leeren",
    confirmClear: "Verlauf wirklich leeren?",

    // Social Search
    socialTitle: "Social Media Recherche",
    searchParams: "Suchparameter",
    startSearch: "Recherche starten",
    googleSearch: "Google Suche",
    addLink: "Gefundenen Link hinzufügen",
    addToVCard: "Zur vCard hinzufügen",
    other: "Andere",

    // Footer
    impressum: "Impressum",
    privacy: "Datenschutz",
    support: "Projekt unterstützen",

    // Errors & Prompts
    missingKey: "API Key fehlt. Bitte in den Einstellungen hinterlegen.",
    configError: "Bitte verbinden Sie zuerst die AI in den Einstellungen.",
    resetConfirm: "Möchten Sie wirklich auf die Musterkarte zurücksetzen?",
    installApp: "App installieren",



    // FAQ / Help
    helpTitle: "Hilfe & Handbuch",

    // Section: Scanning
    faqSectionScan: "1. Scannen & Importieren",
    faqScanTitle: "Wie scanne ich Visitenkarten?",
    faqScanDesc: "Nutzen Sie den 'Scannen' Button für einzelne Karten oder 'Stapel-Upload' für mehrere auf einmal. Sie können Fotos direkt aufnehmen oder Dateien (Bilder/PDFs) per Drag & Drop in das Fenster ziehen.",
    faqScanTips: "Tipp: Achten Sie auf gute Beleuchtung und einen dunklen Hintergrund für beste Ergebnisse. Bei glänzenden Karten hilft es, den Blitz auszuschalten, um Reflexionen zu vermeiden.",

    faqQrTitle: "QR-Codes scannen",
    faqQrDesc: "Klicken Sie auf das QR-Icon im Header, um digitale Visitenkarten direkt über die Webcam zu erfassen.",
    faqQrTips: "Hinweis: Der Scanner erkennt automatisch vCards. Halten Sie den Code ruhig und parallel zur Kamera.",

    faqBatchTitle: "Stapel-Verarbeitung",
    faqBatchDesc: "Laden Sie bis zu 50 Bilder gleichzeitig hoch. Die KI verarbeitet diese im Hintergrund, während Sie weiterarbeiten können.",
    faqBatchTips: "Pro-Tipp: Sie können auch mehrseitige PDFs hochladen – jede Seite wird als separate Karte erkannt.",

    // Section: Editing
    faqSectionEdit: "2. Bearbeiten & KI",
    faqEditTitle: "Daten korrigieren & optimieren",
    faqEditDesc: "Tippen Sie direkt in die Vorschau oder nutzen Sie den Text-Editor links. Der 'AI' Button (Zauberstab) nutzt künstliche Intelligenz, um Fehler zu korrigieren und fehlende Daten zu ergänzen.",
    faqEditTips: "Tipp: Wenn die KI Felder falsch zuordnet, korrigieren Sie diese manuell im Text-Editor und drücken Sie erneut auf 'AI', um die Struktur neu zu analysieren.",

    faqSocialTitle: "Social Media Suche",
    faqSocialDesc: "Klicken Sie auf 'Recherche starten' in der Vorschau. Die App sucht automatisch nach LinkedIn, Xing oder Firmenwebseiten passend zum Kontakt.",
    faqSocialTips: "Trick: Nutzen Sie die gefundene LinkedIn-URL, um das Profilbild des Kontakts automatisch zu laden (Zukunftsmusik/Feature-Idee).",

    // Section: Notes
    faqSectionNotes: "3. Notizen & Organisation",
    faqNotesTitle: "Notizen verwalten",
    faqNotesDesc: "Zu jedem Kontakt können Sie Notizen erfassen (Notiz-Icon). Diese sind durchsuchbar und werden mit dem Kontakt gespeichert. Nutzen Sie das Stift-Icon in der Seitenleiste, um Notizen nachträglich zu ändern.",
    faqNotesTips: "Organisation: Nutzen Sie Hashtags in Notizen (z.B. #Messe2024), um Kontakte später über die Suche einfach zu gruppieren.",

    faqHybridTitle: "Hybrid-Modus",
    faqHybridDesc: "Aktivieren Sie im Scan-Fenster den 'Hybrid-Modus', wenn Sie eine Visitenkarte zusammen mit handschriftlichen Notizen fotografieren. Die KI trennt und speichert beides korrekt.",
    faqHybridTips: "Wichtig: Schreiben Sie deutlich. Die KI kann auch krakelige Handschrift lesen, aber je klarer, desto besser.",

    // Section: Data
    faqSectionData: "4. Daten & Export",
    faqHistoryTitle: "Verlauf & Speichern",
    faqHistoryDesc: "Gespeicherte Kontakte landen im 'Verlauf'. Von dort können Sie sie jederzeit wieder aufrufen, durchsuchen oder als CSV/JSON exportieren.",
    faqHistoryTips: "Suche: Die Suche im Verlauf durchsucht Namen, Firmen, Orte und Ihre Notizen gleichzeitig.",

    faqExportTitle: "Export-Formate",
    faqExportDesc: "Laden Sie Kontakte als VCF (für Outlook/Handy), CSV (für Excel) oder JSON herunter. Auch die Originalbilder können als ZIP gesichert werden.",
    faqExportTips: "Backup: Nutzen Sie den JSON-Export als vollständiges Backup Ihrer Datenbank. Sie können diese Datei jederzeit über 'Backup laden' wiederherstellen.",

    // Section: Privacy
    faqSectionPrivacy: "5. Datenschutz & Technik",
    faqPrivacyTitle: "Wo liegen meine Daten?",
    faqPrivacyDesc: "Ihre Daten (Bilder, Texte, Datenbank) liegen ausschließlich lokal in Ihrem Browser (IndexedDB). Nichts wird auf unseren Servern gespeichert.",

    faqAiTitle: "KI-Verarbeitung",
    faqAiDesc: "Für die Texterkennung werden Bilder kurzzeitig an die konfigurierte KI (Google Gemini oder OpenAI) gesendet, analysiert und sofort wieder gelöscht. Bei Nutzung von Ollama (Lokal) verlassen Daten Ihren PC nie.",
    faqAiTips: "Sicherheit: Nutzen Sie für sensible Daten ein lokales LLM (Ollama), um 100% offline zu arbeiten.",

    // Section: Settings
    faqSectionSettings: "6. Einstellungen & KI",
    faqLlmTitle: "KI-Anbieter wählen",
    faqLlmDesc: "Wählen Sie zwischen Google Gemini (schnell & präzise, Cloud), OpenAI (Alternative, Cloud) oder Ollama (Lokal, Datenschutz).",
    faqLlmTips: "Empfehlung: 'Google Gemini Flash' bietet aktuell das beste Verhältnis aus Geschwindigkeit und Genauigkeit für Visitenkarten.",

    faqKeyTitle: "API Keys",
    faqKeyDesc: "Für Cloud-KI benötigen Sie einen API-Key. Dieser wird verschlüsselt nur in Ihrem Browser gespeichert.",
    faqKeyTips: "Kostenlos: Google bietet einen großzügigen kostenlosen Tarif für Gemini an. Klicken Sie auf 'Key generieren', um einen zu erstellen.",

    // Section: Troubleshooting
    faqSectionTrouble: "7. Problemlösung",
    faqCamTitle: "Kamera funktioniert nicht",
    faqCamDesc: "Stellen Sie sicher, dass Sie dem Browser Zugriff auf die Kamera erlaubt haben. Prüfen Sie auch, ob eine andere App die Kamera blockiert.",
    faqOllamaTitle: "Ollama Verbindung",
    faqOllamaDesc: "Damit der Browser auf Ollama zugreifen kann, müssen Sie Ollama mit 'OLLAMA_ORIGINS=\"*\"' starten.",
    faqOllamaTips: "Anleitung: Schauen Sie in die README oder auf GitHub für den genauen Startbefehl.",

    // Section: App / PWA
    faqSectionApp: "8. App & Installation",
    faqPwaTitle: "Als App installieren",
    faqPwaDesc: "Sie können diese Webseite wie eine echte App installieren. Klicken Sie dazu in Chrome/Edge in der Adressleiste auf das Installieren-Icon.",
    faqPwaTips: "Vorteil: Die App funktioniert dann auch offline (mit lokalem LLM) und startet schneller.",

    faqShortcutsTitle: "Tastenkürzel",
    faqShortcutsDesc: "Strg+V: Bild einfügen | Esc: Fenster schließen | Drag & Drop: Dateien überall ablegen.",
  },
  en: {
    appTitle: "Kontakte.me",
    settings: "Settings",
    scan: "Scan",
    history: "History",
    export: "Export",
    invalid: "Invalid",
    saveHistory: "Save to History",
    showQR: "Show QR Code",
    share: "Share",
    shareError: "Sharing not supported",
    qrScannerTitle: "Scan QR Code",
    cameraPermissionError: "Camera access denied. Please allow.",
    qrScanSuccess: "vCard scanned successfully!",
    loadMore: "Load More",
    searchPlaceholder: "Search history...",
    restoreBackup: "Restore Backup",

    // FAQ / Help
    helpTitle: "Help & Manual",

    // Section: Scanning
    faqSectionScan: "1. Scanning & Import",
    faqScanTitle: "How to scan business cards?",
    faqScanDesc: "Use the 'Scan' button for single cards or 'Batch Upload' for multiple. You can take photos directly or drag & drop files (Images/PDFs) into the window.",
    faqScanTips: "Offline Mode: Without internet or AI key, the app uses 'Tesseract OCR' (local text recognition) and 'Regex' (pattern matching). This is fast and private but less accurate than AI.",

    faqQrTitle: "Scanning QR Codes",
    faqQrDesc: "Click the QR icon in the header to capture digital business cards directly via webcam.",
    faqQrTips: "Note: The scanner automatically detects vCards. Hold the code steady and parallel to the camera.",

    faqBatchTitle: "Batch Processing",
    faqBatchDesc: "Upload up to 50 images at once. The AI processes them in the background while you continue working.",
    faqBatchTips: "Pro Tip: You can also upload multi-page PDFs – each page is recognized as a separate card.",

    // Section: Editing
    faqSectionEdit: "2. Editing & AI",
    faqEditTitle: "Correcting & Optimizing Data",
    faqEditDesc: "Type directly into the preview or use the text editor on the left. The 'AI' button (Magic Wand) uses artificial intelligence to fix errors and complete missing data.",
    faqEditTips: "Post-Processing: You can re-analyze individual or all contacts via AI at any time (even later) to improve quality.",

    faqSocialTitle: "Social Media Search",
    faqSocialDesc: "Click 'Start Research' in the preview. The app automatically searches for LinkedIn, Xing, or company websites matching the contact.",
    faqSocialTips: "Trick: Use the found LinkedIn URL to automatically load the contact's profile picture (Future feature idea).",

    // Section: Notes
    faqSectionNotes: "3. Notes & Organization",
    faqNotesTitle: "Managing Notes",
    faqNotesDesc: "You can add notes to any contact (Note icon). These are searchable and stored with the contact. Use the pencil icon in the sidebar to edit notes later.",
    faqNotesTips: "Organization: Use hashtags in notes (e.g., #TradeFair2024) to easily group contacts later via search.",

    faqHybridTitle: "Hybrid Mode",
    faqHybridDesc: "Enable 'Hybrid Mode' in the scan window when photographing a business card alongside handwritten notes. The AI separates and saves both correctly.",
    faqHybridTips: "Important: Write clearly. The AI can read messy handwriting, but the clearer, the better.",

    // Section: Data
    faqSectionData: "4. Data & Export",
    faqHistoryTitle: "History & Storage",
    faqHistoryDesc: "Saved contacts go to 'History'. From there, you can recall, search, or export them as CSV/JSON at any time.",
    faqHistoryTips: "Search: The history search scans names, companies, locations, and your notes simultaneously.",

    faqExportTitle: "Export Formats",
    faqExportDesc: "Download contacts as VCF (for Outlook/Mobile), CSV (for Excel), or JSON. Original images can also be saved as ZIP.",
    faqExportTips: "Backup: Use the JSON export as a full backup of your database. You can restore this file anytime via 'Restore Backup'.",

    // Section: Privacy
    faqSectionPrivacy: "5. Privacy & Tech",
    faqPrivacyTitle: "Where is my data?",
    faqPrivacyDesc: "Your data (images, text, database) resides exclusively locally in your browser (IndexedDB). Nothing is stored on our servers.",

    faqAiTitle: "AI Processing",
    faqAiDesc: "For text recognition, images are briefly sent to the configured AI (Google Gemini or OpenAI), analyzed, and immediately deleted. When using Ollama (Local), data never leaves your PC.",
    faqAiTips: "Privacy: Not even the developer of this app has access to your data. Everything happens on your device or directly between you and the AI provider.",

    // Section: Settings
    faqSectionSettings: "6. Settings & AI",
    faqLlmTitle: "Choose AI Provider",
    faqLlmDesc: "Choose between Google Gemini (fast & accurate, Cloud), OpenAI (Alternative, Cloud), or Ollama (Local, Privacy).",
    faqLlmTips: "Recommendation: 'Google Gemini Flash' currently offers the best balance of speed and accuracy for business cards.",

    faqKeyTitle: "API Keys & Costs",
    faqKeyDesc: "Cloud AI requires an API Key. It is stored encrypted only in your browser. Costs are minimal (cents for hundreds of cards).",
    faqKeyTips: "Free: Google offers a generous free tier for Gemini. Click 'Generate Key' to create one.",

    // Section: Troubleshooting
    faqSectionTrouble: "7. Troubleshooting",
    faqCamTitle: "Camera not working",
    faqCamDesc: "Ensure you have granted camera access to the browser. Also check if another app is blocking the camera.",
    faqOllamaTitle: "Ollama Connection",
    faqOllamaDesc: "For the browser to access Ollama, you must start Ollama with 'OLLAMA_ORIGINS=\"*\"'.",
    faqOllamaTips: "Guide: Check the README or GitHub for the exact start command.",

    // Section: App / PWA
    faqSectionApp: "8. App & Installation",
    faqPwaTitle: "Install as App",
    faqPwaDesc: "You can install this website like a real app. Click the install icon in the address bar in Chrome/Edge.",
    faqPwaTips: "Benefit: The app then works offline (with local LLM) and launches faster.",

    faqShortcutsTitle: "Shortcuts",
    faqShortcutsDesc: "Ctrl+V: Paste image | Esc: Close window | Drag & Drop: Drop files anywhere.",



    // Editor
    textTab: "Enter Text",
    codeTab: "vCard Code",
    reset: "Reset",
    undo: "Undo",
    aiCorrect: "AI",
    working: "Working...",
    dragDropTitle: "Drop image here",
    dragDropSubtitle: "to start scan",
    textPlaceholder: "Paste your email signature or impressum here. Or use your keyboard's dictation feature. Data is automatically detected (Offline Regex).",
    chars: "Chars",
    lines: "Lines",

    // Preview
    noCard: "No valid vCard detected",
    noCardHint: "Start with 'BEGIN:VCARD' and end with 'END:VCARD'.",
    search: "Search",
    fullName: "Full Name",
    title: "Title / Position",
    company: "Company",
    call: "Call",
    email: "Email",
    notes: "Notes...",
    noteLabel: "NOTE",
    birthday: "Birthday",
    street: "Street",
    zip: "Zip",
    city: "City",
    country: "Country",
    scans: "Original Scans",

    // Scan Modal
    scanTitle: "Scan Card",
    scanDesc: "Take a photo of the front and (optionally) back. Gemini Vision extracts data automatically.",
    frontSide: "Front Side *",
    backSide: "Back Side (Optional)",
    photoUpload: "Photo / Upload",
    analyze: "Analyzing image...",
    convertToVCard: "Convert to vCard",
    poweredBy: "Powered by Google Gemini",
    singleMode: "Single",
    batchMode: "Batch",
    addToQueue: "Scan & Next",
    batchHint: "Scan cards one by one. They are processed in the background.",
    pasteHint: "or paste image (Ctrl+V)",
    scanMode: 'Scan Mode',
    modeStandard: 'Standard (Card only)',
    modeHybrid: 'Hybrid (Card + Notes)',
    hybridHint: 'Place card next to handwritten notes. AI will extract both.',

    // Notes
    notesTitle: "Notes",
    searchNotes: "Search notes...",
    noNotes: "No notes found.",
    deleteConfirm: "Delete this note?",
    viewContact: "View Contact",
    noteSaveFirst: "Please save the contact to history first.",
    paste: "Paste",

    // Chat
    chatWithData: "Chat with Data",
    chatPlaceholder: "Ask about your data...",
    chatEmpty: "Ask questions about your contacts and notes!",
    chatExample1: "Who works at Google?",
    chatExample2: "What notes do I have about meetings?",

    // Queue
    batchQueue: "Processing",
    processing: "Processing",
    waiting: "Queued",
    errors: "Errors",

    // Settings Modal
    settingsTitle: "Settings",
    geminiIntegration: "Google Gemini Integration",
    geminiDesc: "For correction & image recognition",
    recommended: "Recommended",
    connectGoogle: "Connect with Google",
    connected: "Google Account connected",
    orManual: "or manually",
    apiKeyLabel: "Gemini API Key",
    generateKey: "Generate Key",
    llmProvider: "LLM Provider",
    googleDefault: "Google Gemini",
    openai: "OpenAI",
    customLLM: "Custom / Local LLM",
    baseUrl: "Base URL",
    modelName: "Model Name",
    ollamaDefaults: "Use Ollama Defaults",
    batchUpload: "Batch Upload",
    uploadMultiple: "Upload multiple images",
    dragDropFiles: "Drag files here or click",
    batchProcessing: "Processing...",
    queueEmpty: "No images in queue",
    removeFromQueue: "Remove",
    retryFailed: "Retry failed",
    clearCompleted: "Clear completed",
    startProcessing: "Start Processing",
    imagesSelected: "images selected",
    close: "Close",
    cancel: "Cancel",
    saveSettings: "Save Settings",

    // History
    historyTitle: "History",
    noHistory: "No saved cards.",
    noHistoryHint: "Created or scanned cards appear here.",
    load: "Load",
    vcfBackup: "VCF Backup",
    csvExport: "CSV Export",
    jsonExport: "JSON Export",
    imgExport: "Images (ZIP)",
    clearHistory: "Clear History",
    confirmClear: "Really clear history?",

    // Social Search
    socialTitle: "Social Media Research",
    searchParams: "Search Parameters",
    startSearch: "Start Research",
    googleSearch: "Google Search",
    addLink: "Add found link",
    addToVCard: "Add to vCard",
    other: "Other",

    // Footer
    impressum: "Imprint",
    privacy: "Privacy",
    support: "Support this project",

    // Errors & Prompts
    missingKey: "API Key missing. Please configure in settings.",
    configError: "Please connect to AI in settings first.",
    resetConfirm: "Do you really want to reset to the sample card?",
    installApp: "Install App",
  }
};