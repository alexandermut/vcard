
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

    // Regex explanation:
    // ^(?<street>.+?)      -> Start: Capture everything (non-greedy) into group 'street'
    // [,\s]+               -> Separator: Comma or space (handles "Str., 12")
    // (?<number>\d+.*)$    -> Number: Must start with a digit, may have suffixes.
    // flag 'i'             -> Case-insensitive
    const regex = /^(?<street>.+?)[,\s]+(?<number>\d+(?:[\s\-\/\.]*[a-z0-9]+)*)$/i;

    const match = cleanInput.match(regex);

    if (match && match.groups) {
        result.street = match.groups.street.trim();
        result.houseNumber = match.groups.number.trim();
        result.isValid = true;
    } else {
        // Fallback: If no number is found, it might be an address without a number (e.g., "Am Wasserturm")
        // We mark it as "technically valid" but issue a warning so the caller can decide.
        // For this project, however, we want to be stricter to avoid false positives.
        result.warnings.push("No house number structure recognized (missing digit at the end).");
        return result;
    }


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
