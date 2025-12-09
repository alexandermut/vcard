use crate::parser::types::{Scored, ParsedAddress};
use regex::Regex;
use std::sync::OnceLock;
use std::collections::HashSet;

static ADDRESS_ANCHOR_RE: OnceLock<Regex> = OnceLock::new();
static KNOWN_CITIES: OnceLock<HashSet<&'static str>> = OnceLock::new();

fn get_known_cities() -> &'static HashSet<&'static str> {
    KNOWN_CITIES.get_or_init(|| {
        let raw = "Aachen|Augsburg|Bergisch Gladbach|Berlin|Bielefeld|Bochum|Bonn|Bottrop|Braunschweig|Bremen|Bremerhaven|Chemnitz|Cottbus|Darmstadt|Dortmund|Dresden|Duisburg|Düren|Düsseldorf|Erfurt|Erlangen|Essen|Esslingen am Neckar|Flensburg|Frankfurt am Main|Freiburg im Breisgau|Fürth|Gelsenkirchen|Gera|Gießen|Göttingen|Gütersloh|Hagen|Halle|Hamburg|Hamm|Hanau|Hannover|Heidelberg|Heilbronn|Herne|Hildesheim|Ingolstadt|Iserlohn|Jena|Kaiserslautern|Karlsruhe|Kassel|Kiel|Koblenz|Köln|Konstanz|Krefeld|Leipzig|Leverkusen|Lübeck|Ludwigsburg|Ludwigshafen am Rhein|Lüneburg|Magdeburg|Mainz|Mannheim|Marl|Moers|Mönchengladbach|Mülheim an der Ruhr|München|Münster|Neuss|Nürnberg|Oberhausen|Offenbach am Main|Oldenburg|Osnabrück|Paderborn|Pforzheim|Potsdam|Ratingen|Recklinghausen|Regensburg|Remscheid|Reutlingen|Rostock|Saarbrücken|Salzgitter|Schwerin|Siegen|Solingen|Stuttgart|Trier|Tübingen|Ulm|Villingen-Schwenningen|Wiesbaden|Witten|Wolfsburg|Wuppertal|Würzburg|Zwickau";
        raw.split('|').collect()
    })
}

fn get_address_anchor() -> &'static Regex {
    ADDRESS_ANCHOR_RE.get_or_init(|| {
        // Look for: (Start or Space) (Optional D- or CH-) (5 Digits) (Space) (City Name)
        // City Name: Refined to allow "Frankfurt am Main", "Rothenburg ob der Tauber"
        Regex::new(r"(?x)
            (?:^|\s)
            (?:D-|CH-)?     # Optional Country Prefix
            (\d{5})         # ZIP (Group 1)
            \s+
            ([A-ZÄÖÜ][a-zäöüß]+(?:[\s-](?:am|im|an|der|den|dem|auf|ob)?[\s-]?[A-ZÄÖÜa-zäöüß]+)*) # City (Group 2)
        ").unwrap()
    })
}

// Helper: Extract street from a potentially multi-column line
// E.g. "Geschäftsführer                Lilienthalstr. 5" -> "Lilienthalstr. 5"
fn extract_street_from_line(line: &str) -> Option<String> {
    // Clean trailing OCR garbage (single char at end like "L" or "-")
    let mut cleaned = line.trim();
    
    // Remove trailing single characters that are likely OCR errors
    // Pattern: "...text     X" where X is single char
    if cleaned.len() > 5 {
        let parts: Vec<&str> = cleaned.rsplitn(2, "   ").collect();
        if parts.len() == 2 && parts[0].trim().len() == 1 {
            // Last part is single char, remove it
            cleaned = parts[1].trim();
        }
    }
    
    // If the line has many consecutive spaces (3+), it's likely multi-column
    if cleaned.contains("   ") {
        // Split by 3+ spaces to get columns
        let columns: Vec<&str> = cleaned
            .split("   ")
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .collect();
        
        // Look for the column that looks like a street
        // Heuristics:
        // 1. Contains digits (house number)
        // 2. Contains street suffix (str., straße, weg, etc.)
        // 3. Is not too long (< 50 chars)
        
        for col in columns.iter().rev() { // Check from right to left
            let lower = col.to_lowercase();
            
            // Skip obvious non-streets
            if lower.contains("tel") 
               || lower.contains("fax")
               || lower.contains("email")
               || lower.contains('@') {
                continue;
            }
            
            // Check if it looks like a street
            let has_digit = col.chars().any(|c| c.is_numeric());
            let has_street_suffix = lower.contains("str.") 
                || lower.contains("straße") 
                || lower.contains("strasse")
                || lower.contains("weg")
                || lower.contains("platz")
                || lower.contains("allee")
                || lower.contains("gasse");
            
            if (has_digit || has_street_suffix) && col.len() < 50 {
                return Some(col.to_string());
            }
        }
    }
    
    //Fallback: return whole line if not multi-column
    // But filter out obvious non-streets
    let lower = line.to_lowercase();
    if lower.contains("tel") 
       || lower.contains("fax")
       || lower.contains("email")
       || lower.contains("handy")
       || lower.contains("mobil")
       || lower.contains('@') {
        return None;
    }
    
    if line.len() > 3 {
        Some(line.to_string())
    } else {
        None
    }
}

pub fn extract_addresses(lines: &Vec<String>) -> Vec<Scored<ParsedAddress>> {
    let mut results = Vec::new();
    let re = get_address_anchor();
    let known_cities = get_known_cities();
    
    // Track seen addresses to avoid duplicates
    use std::collections::HashSet;
    let mut seen_addresses: HashSet<String> = HashSet::new();

    // STRATEGY 1: Token-based street finding (NEW! More robust!)
    // Scan all lines for streets using FST, then look for ZIP nearby
    for (i, line) in lines.iter().enumerate() {
        // Try to find street via token scanning
        if let Some((street_name, _house)) = crate::parser::street_tokens::find_street_in_text(line) {
            // Found a street! Now look for ZIP in current or next lines
            let mut zip_candidate: Option<String> = None;
            let mut city_candidate: Option<String> = None;
            
            // Search next few lines for ZIP pattern
            for j in i..=(i+3).min(lines.len()-1) {
                if let Some(caps) = re.captures(&lines[j]) {
                    zip_candidate = caps.get(1).map(|m| m.as_str().to_string());
                    city_candidate = caps.get(2).map(|m| m.as_str().to_string());
                    break;
                }
            }
            
            // If we found a ZIP, create address
            if let Some(zip) = zip_candidate {
                // Deduplication: Check if we've seen this ZIP+street combo
                let dedup_key = format!("{}:{}", zip, street_name);
                if seen_addresses.contains(&dedup_key) {
                    continue; // Skip duplicate
                }
                seen_addresses.insert(dedup_key);
                
                let score = if let Some(ref c) = city_candidate {
                    if known_cities.contains(c.as_str()) { 1.0 } else { 0.9 }
                } else { 0.8 };
                
                results.push(Scored {
                    value: ParsedAddress {
                        street: Some(street_name),
                        zip: Some(zip),
                        city: city_candidate,
                        country: Some("Germany".to_string()),
                    },
                    score,
                    label: Some("WORK".to_string()),
                    debug_info: "token_fst_street".to_string(),
                });
                
                // Found address, skip to next iteration
                continue;
            }
        }
    }
    
    // STRATEGY 2: Regex anchor (ZIP+City) then backtrack for street (FALLBACK)
    // Only run if no addresses found yet via token method
    if results.is_empty() {
        for (i, line) in lines.iter().enumerate() {
            if let Some(caps) = re.captures(line) {
                let zip = caps.get(1).map(|m| m.as_str().to_string());
                let city = caps.get(2).map(|m| m.as_str().to_string());
                
                // Logic: Street is what comes BEFORE the match in this line, 
                // OR the line before this one?
                
                let full_match = caps.get(0).unwrap();
                let start_idx = full_match.start();
                
                let mut street = None;
                
                // 1. Check same line before ZIP
            let prefix = &line[0..start_idx].trim();
            if let Some(extracted) = extract_street_from_line(prefix) {
                street = Some(extracted);
            } else {
                // 2. Check previous lines (Backwards search)
                for j in (0..i).rev() {
                    let prev = &lines[j];
                    
                    // Try to extract street from this line
                    if let Some(extracted) = extract_street_from_line(prev) {
                        street = Some(extracted);
                        break;
                    }
                }
            }
            
            // Calculate Score based on City + Street Validation
            let mut score = if let Some(c) = &city {
                if known_cities.contains(c.as_str()) { 1.0 } else { 0.8 }
            } else { 0.5 };
            
            // Boost score if street is validated against FST
            // Note: FST validation currently only works in non-WASM builds
            // For WASM, we'd need to implement dynamic loading
            if let Some(ref street_name) = street {
                #[cfg(not(target_arch = "wasm32"))]
                {
                    if crate::parser::streets::is_valid_street(street_name) {
                        score = 1.0;
                    }
                }
            }

            results.push(Scored {
                value: ParsedAddress {
                    street,
                    zip,
                    city,
                    country: Some("Germany".to_string()), // Default from regex implication
                },
                score, 
                label: Some("WORK".to_string()),
                debug_info: "regex_anchor_zip_city".to_string(),
            });
            }
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_address_same_line() {
        // "Musterstraße 123 12345 Musterstadt"
        let lines = vec!["Musterstraße 123 12345 Musterstadt".to_string()];
        let adrs = extract_addresses(&lines);
        
        assert_eq!(adrs.len(), 1);
        assert_eq!(adrs[0].value.zip.as_deref(), Some("12345"));
        assert_eq!(adrs[0].value.city.as_deref(), Some("Musterstadt"));
        assert_eq!(adrs[0].value.street.as_deref(), Some("Musterstraße 123"));
    }

    #[test]
    fn test_address_multi_line() {
        // "Musterweg 7"
        // "12345 Berlin"
        let lines = vec!["Musterweg 7".to_string(), "12345 Berlin".to_string()];
        let adrs = extract_addresses(&lines);
        
        assert_eq!(adrs.len(), 1);
        assert_eq!(adrs[0].value.zip.as_deref(), Some("12345"));
        assert_eq!(adrs[0].value.city.as_deref(), Some("Berlin"));
        assert_eq!(adrs[0].value.street.as_deref(), Some("Musterweg 7"));
    }
    
    #[test]
    fn test_address_multi_column() {
        // Multi-column layout:
        // "Geschäftsführer                Lilienthalstr. 5"
        // "D - 34123 Kassel"
        let lines = vec![
            "Geschäftsführer                Lilienthalstr. 5".to_string(),
            "D - 34123 Kassel".to_string()
        ];
        let adrs = extract_addresses(&lines);
        
        assert_eq!(adrs.len(), 1);
        assert_eq!(adrs[0].value.zip.as_deref(), Some("34123"));
        assert_eq!(adrs[0].value.city.as_deref(), Some("Kassel"));
        assert_eq!(adrs[0].value.street.as_deref(), Some("Lilienthalstr. 5"));
    }
}
