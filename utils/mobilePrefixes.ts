// Liste aller deutschen Mobilfunk-Vorwahlen (Stand: Bundesnetzagentur Liste)
// Automatisch generiert aus deiner Vorlage.
export const germanMobilePrefixes = [
    "015019", "015020", "01511", "01512", "01514", "01515", "01516", "01517",
    "015180", "015181", "015182", "015183", "015184", "015185", "015186",
    "01520", "01521", "01522", "01523", "01525", "01526", "01529",
    "015310", "015333",
    "015510", "015511",
    "015550", "015551", "015552", "015553", "015554", "015555", "015556", "015557", "015558", "015559",
    "015560", "015561", "015562", "015563", "015564", "015565", "015566", "015567", "015568", "015569",
    "015630", "015636", "015678", "015679",
    "015700", "015701", "015702", "015703", "015704", "015706",
    "01573", "01575", "01577", "01578", "01579",
    "015888", "01590",
    "0160", "0162", "0163",
    "0170", "0171", "0172", "0173", "0174", "0175", "0176", "0177", "0178", "0179"
];

// Hilfsfunktion: Baut daraus eine optimierte Regex-Gruppe
// Ergebnis z.B.: (01511|01512|...|0179)
export const getMobileRegexPattern = () => {
    // Sortieren nach Länge (längste zuerst), damit z.B. 01511 vor 015 matcht
    const sorted = [...germanMobilePrefixes].sort((a, b) => b.length - a.length);
    return `(${sorted.join('|')})`;
};