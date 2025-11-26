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
    restoreBackup: "Backup wiederherstellen",



    // Editor
    textTab: "Kontaktdaten Text",
    codeTab: "vCard Code",
    reset: "Reset",
    undo: "Rückgängig",
    aiCorrect: "AI",
    working: "Arbeitet...",
    dragDropTitle: "Bild hier ablegen",
    dragDropSubtitle: "um Scan zu starten",
    textPlaceholder: "Kopieren Sie hier Ihre E-Mail Signatur oder ein Impressum hinein. Oder nutzen Sie die Diktierfunktion Ihrer Tastatur. Die Daten werden automatisch erkannt (Offline-Regex).",
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
    paste: "Einfügen",

    // Chat
    chatWithData: "Chat mit Daten",
    chatPlaceholder: "Fragen Sie nach Ihren Daten...",
    chatEmpty: "Stellen Sie Fragen zu Ihren Kontakten und Notizen!",
    chatExample1: "Wer arbeitet bei Google?",
    chatExample2: "Was habe ich über das Meeting notiert?",

    // Queue
    batchQueue: "Verarbeitung",
    processing: "Verarbeite...",
    waiting: "Wartend",
    errors: "Fehler",

    // Settings Modal
    settingsTitle: "KI-Einstellungen",
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

    installApp: "App installieren",

    // FAQ / Help
    helpTitle: "Hilfe & Handbuch",

    // Section: Scanning
    faqSectionScan: "1. Scannen & Importieren",
    faqScanTitle: "Wie scanne ich Visitenkarten?",
    faqScanDesc: "Nutzen Sie den 'Scannen' Button für einzelne Karten oder 'Stapel-Upload' für mehrere auf einmal. Sie können Fotos direkt aufnehmen oder Dateien (Bilder/PDFs) per Drag & Drop in das Fenster ziehen.",
    faqQrTitle: "QR-Codes scannen",
    faqQrDesc: "Klicken Sie auf das QR-Icon im Header, um digitale Visitenkarten direkt über die Webcam zu erfassen.",

    // Section: Editing
    faqSectionEdit: "2. Bearbeiten & KI",
    faqEditTitle: "Daten korrigieren & optimieren",
    faqEditDesc: "Tippen Sie direkt in die Vorschau oder nutzen Sie den Text-Editor links. Der 'AI' Button (Zauberstab) nutzt künstliche Intelligenz, um Fehler zu korrigieren und fehlende Daten zu ergänzen.",
    faqSocialTitle: "Social Media Suche",
    faqSocialDesc: "Klicken Sie auf 'Recherche starten' in der Vorschau. Die App sucht automatisch nach LinkedIn, Xing oder Firmenwebseiten passend zum Kontakt.",

    // Section: Notes
    faqSectionNotes: "3. Notizen & Organisation",
    faqNotesTitle: "Notizen verwalten",
    faqNotesDesc: "Zu jedem Kontakt können Sie Notizen erfassen (Notiz-Icon). Diese sind durchsuchbar und werden mit dem Kontakt gespeichert. Nutzen Sie das Stift-Icon in der Seitenleiste, um Notizen nachträglich zu ändern.",
    faqHybridTitle: "Hybrid-Modus",
    faqHybridDesc: "Aktivieren Sie im Scan-Fenster den 'Hybrid-Modus', wenn Sie eine Visitenkarte zusammen mit handschriftlichen Notizen fotografieren. Die KI trennt und speichert beides korrekt.",

    // Section: Data
    faqSectionData: "4. Daten & Export",
    faqHistoryTitle: "Verlauf & Speichern",
    faqHistoryDesc: "Gespeicherte Kontakte landen im 'Verlauf'. Von dort können Sie sie jederzeit wieder aufrufen, durchsuchen oder als CSV/JSON exportieren.",
    faqExportTitle: "Export-Formate",
    faqExportDesc: "Laden Sie Kontakte als VCF (für Outlook/Handy), CSV (für Excel) oder JSON herunter. Auch die Originalbilder können als ZIP gesichert werden.",

    // Section: Privacy
    faqSectionPrivacy: "5. Datenschutz & Technik",
    faqPrivacyTitle: "Wo liegen meine Daten?",
    faqPrivacyDesc: "Ihre Daten (Bilder, Texte, Datenbank) liegen ausschließlich lokal in Ihrem Browser (IndexedDB). Nichts wird auf unseren Servern gespeichert.",
    faqAiTitle: "KI-Verarbeitung",
    faqAiDesc: "Für die Texterkennung werden Bilder kurzzeitig an die konfigurierte KI (Google Gemini oder OpenAI) gesendet, analysiert und sofort wieder gelöscht. Bei Nutzung von Ollama (Lokal) verlassen Daten Ihren PC nie.",
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
    faqQrTitle: "Scanning QR Codes",
    faqQrDesc: "Click the QR icon in the header to capture digital business cards directly via webcam.",

    // Section: Editing
    faqSectionEdit: "2. Editing & AI",
    faqEditTitle: "Correcting & Optimizing Data",
    faqEditDesc: "Type directly into the preview or use the text editor on the left. The 'AI' button (Magic Wand) uses artificial intelligence to fix errors and complete missing data.",
    faqSocialTitle: "Social Media Search",
    faqSocialDesc: "Click 'Start Research' in the preview. The app automatically searches for LinkedIn, Xing, or company websites matching the contact.",

    // Section: Notes
    faqSectionNotes: "3. Notes & Organization",
    faqNotesTitle: "Managing Notes",
    faqNotesDesc: "You can add notes to any contact (Note icon). These are searchable and stored with the contact. Use the pencil icon in the sidebar to edit notes later.",
    faqHybridTitle: "Hybrid Mode",
    faqHybridDesc: "Enable 'Hybrid Mode' in the scan window when photographing a business card alongside handwritten notes. The AI separates and saves both correctly.",

    // Section: Data
    faqSectionData: "4. Data & Export",
    faqHistoryTitle: "History & Storage",
    faqHistoryDesc: "Saved contacts go to 'History'. From there, you can recall, search, or export them as CSV/JSON at any time.",
    faqExportTitle: "Export Formats",
    faqExportDesc: "Download contacts as VCF (for Outlook/Mobile), CSV (for Excel), or JSON. Original images can also be saved as ZIP.",

    // Section: Privacy
    faqSectionPrivacy: "5. Privacy & Tech",
    faqPrivacyTitle: "Where is my data?",
    faqPrivacyDesc: "Your data (images, text, database) resides exclusively locally in your browser (IndexedDB). Nothing is stored on our servers.",
    faqAiTitle: "AI Processing",
    faqAiDesc: "For text recognition, images are briefly sent to the configured AI (Google Gemini or OpenAI), analyzed, and immediately deleted. When using Ollama (Local), data never leaves your PC.",



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
    paste: "Paste",

    // Chat
    chatWithData: "Chat with Data",
    chatPlaceholder: "Ask about your data...",
    chatEmpty: "Ask questions about your contacts and notes!",
    chatExample1: "Who works at Google?",
    chatExample2: "What notes do I have about meetings?",

    // Queue
    batchQueue: "Processing",
    processing: "Processing...",
    waiting: "Waiting",
    errors: "Errors",

    // Settings Modal
    settingsTitle: "AI Settings",
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