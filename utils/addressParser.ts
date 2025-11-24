
export interface AddressResult {
    street: string;
    houseNumber: string;
    isValid: boolean; // True = Sieht gut aus
    warnings: string[]; // Falls false, steht hier warum
}

export function parseGermanAddress(input: string): AddressResult {
    // 1. Aufräumen: Leerzeichen am Rand weg, doppelte Leerzeichen zu einem
    const cleanInput = input.trim().replace(/\s+/g, " ");

    const result: AddressResult = {
        street: cleanInput,
        houseNumber: "",
        isValid: false,
        warnings: [],
    };

    // Regex Erklärung:
    // ^(?<street>.+?)      -> Start: Nimm alles (non-greedy) in Gruppe 'street'
    // [,\s]+               -> Trenner: Komma oder Leerzeichen (fängt "Str., 12" ab)
    // (?<number>\d+.*)$    -> Zahl: Muss mit Ziffer beginnen, darf Suffixe haben.
    // flag 'i'             -> Groß/Kleinschreibung egal
    const regex = /^(?<street>.+?)[,\s]+(?<number>\d+(?:[\s\-\/\.]*[a-z0-9]+)*)$/i;

    const match = cleanInput.match(regex);

    if (match && match.groups) {
        result.street = match.groups.street.trim();
        result.houseNumber = match.groups.number.trim();
        result.isValid = true;
    } else {
        // Fallback: Wenn keine Nummer gefunden, ist es vielleicht eine Adresse ohne Nummer (z.B. "Am Wasserturm")
        // Wir markieren es als "technisch valide" aber geben eine Warnung, damit der Caller entscheiden kann.
        // Für dieses Projekt wollen wir aber eher strikt sein, um False Positives zu vermeiden.
        result.warnings.push("Keine Hausnummer-Struktur erkannt (Ziffer am Ende fehlt).");
        return result;
    }

    // --- Validierung (Plausibilitäts-Prüfung) ---

    // Warnung 1: Straße extrem kurz (z.B. "A 1") - selten, aber möglich (Quadrate Mannheim), meist Fehler
    if (result.street.length < 2) {
        result.isValid = false;
        result.warnings.push("Straßenname ist verdächtig kurz (< 2 Zeichen).");
    }

    // Warnung 2: Hausnummer extrem lang (wahrscheinlich Parsing-Fehler oder Zusatzinfo im String)
    if (result.houseNumber.length > 10) {
        result.isValid = false;
        result.warnings.push("Hausnummer ist verdächtig lang (> 10 Zeichen).");
    }

    // Warnung 3: Straße enthält Zahlen (außer Standard wie '17. Juni')
    // Das hilft, falsche Trennungen zu finden wie "Musterstraße 12 Hinterhaus" -> Street: "Musterstraße 12", Nr: "Hinterhaus"
    // (würde vom Regex oben aber meist verhindert, da Nr mit digit starten muss)

    return result;
}
