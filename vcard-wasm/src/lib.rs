mod data;
mod names;
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use strsim::normalized_levenshtein;
use regex::Regex;
use lazy_static::lazy_static;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AnchorMatch {
// ... (skip structs)

// ...



    pub anchor_type: String, // "PLZ", "CITY", "vCARD_BEGIN", etc.
    pub value: String,
    pub start_index: usize,
    pub end_index: usize,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Line {
    pub text: String, 
    pub bbox: Option<serde_json::Value>, 
    #[serde(default)]
    pub clean: String,
    #[serde(default)]
    pub is_consumed: bool,
    #[serde(default)]
    pub anchors: Vec<AnchorMatch>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct VCardData {
    pub fn_field: String,
    pub title: String, 
    pub org: String, 
    pub emails: Vec<String>,
    pub urls: Vec<String>,
    pub phones: Vec<(String, String)>, 
    pub adr: Vec<String>,
}

// Helper to clean string (simple version)
fn simple_clean(s: &str) -> String {
    s.trim().to_string()
}

#[wasm_bindgen]
pub fn rust_clean_string(input: &str) -> String {
    input.chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect()
}

lazy_static! {
    static ref RE_EMAIL: Regex = Regex::new(r"(?i)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap();
    // Broad "Net" to catch messy numbers (including / and spaces)
    // Matches: Optional + or 00, then sequence of digits/spaces/dots/dashes/slashes, min length 6
    static ref RE_PHONE_CANDIDATE: Regex = Regex::new(r"(?i)(?:(?:\+|00)\d+)?[\d\s./-]{6,}").unwrap();
    static ref RE_PLZ: Regex = Regex::new(r"\b\d{5}\b").unwrap();
    static ref RE_ADDRESS_ANCHOR: Regex = Regex::new(r"(?i)\b(\d{5})\s+([a-zäöüßA-ZÄÖÜ\.\s\-]+)").unwrap();
    static ref RE_URL: Regex = Regex::new(r"(?i)\b(?:https?://|www\.)\S+\b").unwrap();
    
    // Dynamic Legal Forms Regex from data.rs
    static ref RE_LEGAL_FORM: Regex = {
        // Escape special chars in legal forms just in case (though mostly clean)
        let pattern = data::LEGAL_FORMS.join("|").replace(".", "\\.");
        // \b(GmbH|AG|...)\b
        Regex::new(&format!(r"(?i)\b({})\b", pattern)).unwrap()
    };

    static ref RE_NAME_CONTEXT: Regex = {
         let pattern = data::JOB_TITLES.join("|").replace(".", "\\.");
         Regex::new(&format!(r"(?i)\b({})\b", pattern)).unwrap()
    };
}

fn detect_anchors(lines: &mut Vec<Line>) {
    for line in lines.iter_mut() {
        let text = &line.clean;
        
        // Detect PLZ
        for caps in RE_PLZ.captures_iter(text) {
             if let Some(m) = caps.get(0) {
                 line.anchors.push(AnchorMatch {
                     anchor_type: "PLZ".to_string(),
                     value: m.as_str().to_string(),
                     start_index: m.start(),
                     end_index: m.end(),
                 });
             }
        }
        
        // Detect "Tel", etc.
        if text.to_lowercase().contains("tel") {
             line.anchors.push(AnchorMatch{ anchor_type: "TEL_KEYWORD".to_string(), value: "tel".to_string(), start_index: 0, end_index: 0 });
        }
    }
}

fn consume_company(lines: &mut Vec<Line>, data: &mut VCardData) {
    if !data.org.is_empty() { return; } 

    for line in lines.iter_mut() {
        if line.is_consumed { continue; }
        
        // 1. Check Legal Forms
        if RE_LEGAL_FORM.is_match(&line.clean) {
             data.org = line.clean.trim().to_string();
             if let Some(last_char) = data.org.chars().last() {
                 if last_char.is_numeric() {
                     data.org = data.org.trim_end_matches(char::is_numeric).trim().to_string();
                 }
             }
             line.is_consumed = true;
             return; 
        }

        // 2. Check Industry Keywords (Suffix check)
        // e.g. "Zahnarztpraxis" ends with "Praxis"
        for keyword in data::INDUSTRY_KEYWORDS {
            // Check if line ends with keyword (case insensitive-ish or exact)
            // For simplicity, simple contains check if it's a significant word
            if line.clean.contains(keyword) {
                 // Strong signal if it's the last word?
                 if line.clean.ends_with(keyword) || line.clean.contains(&format!("{} ", keyword)) {
                     data.org = line.clean.trim().to_string();
                     line.is_consumed = true;
                     return;
                 }
            }
        }
    }
}

// Helper to deduce phone type from number using data.rs
fn classify_phone_number(number: &str) -> String {
    // 1. Clean to digits only (keep + for country code logic if needed, but for prefix match we usually want clean digits)
    // Actually, prefixes in data.ts are "017...", "030..."
    // So we need to handle "+49 17..." -> "017..." mapping effectively or just check "17..." if country code is present.
    // Simplifying: Strip non-digits. If starts with 49, replace with 0. 
    
    let mut digits: String = number.chars().filter(|c| c.is_numeric()).collect();
    
    // Normalize Country Code +49 -> 0
    if digits.starts_with("49") {
        digits = format!("0{}", &digits[2..]);
    }
    
    // Check Mobile
    // MOBILE_PREFIXES in data.rs are like "017", "0151"...
    for prefix in data::MOBILE_PREFIXES {
        if digits.starts_with(prefix) {
            return "CELL".to_string();
        }
    }
    
    // Check Landline
    // LANDLINE_PREFIXES "030", "089"...
    for prefix in data::LANDLINE_PREFIXES {
        if digits.starts_with(prefix) {
            return "WORK".to_string();
        }
    }
    
    // Default
    "VOICE".to_string() 
}

fn consume_phones(lines: &mut Vec<Line>, data: &mut VCardData) {
     for line in lines.iter_mut() {
        if line.is_consumed { continue; }
        let text = &line.clean;

        // Skip if line has PLZ Check (only skip if NO strong phone signal?)
        let has_plz = line.anchors.iter().any(|a| a.anchor_type == "PLZ");
        let has_tel_key = line.anchors.iter().any(|a| a.anchor_type == "TEL_KEYWORD");
        
        // Strategy: "Broad Capture + Strict Validation"
        let mut found = false;
        
        for caps in RE_PHONE_CANDIDATE.find_iter(text) {
            let raw_val = caps.as_str();
            
            // 1. Clean: strip everything except digits and maybe +
            // But for validation against prefixes (which are 0176...), we want pure digits usually.
            // If +49, replace with 0.
            
            let mut digits: String = raw_val.chars().filter(|c| c.is_numeric()).collect();
            
            // Handle +49 or 0049 start
            if raw_val.contains("+49") || raw_val.contains("0049") {
                 // Remove 49 from start of digits?
                 // Simple hack: if digits start with 49... verify if original had + or 00
                 // Better: just check digits start with 49
                 if digits.starts_with("49") {
                     digits = format!("0{}", &digits[2..]);
                 }
                 else if digits.starts_with("0049") {
                     digits = format!("0{}", &digits[4..]);
                 }
            }

            if digits.len() < 7 { continue; } // Too short for valid phone
            
            // 2. Validate against Lists
            let mut is_valid = false;
            let mut p_type = "VOICE".to_string();

            // Mobile?
            for prefix in data::MOBILE_PREFIXES {
                if digits.starts_with(prefix) {
                    is_valid = true;
                    p_type = "CELL".to_string();
                    break;
                }
            }
            
            // Landline?
            if !is_valid {
                for prefix in data::LANDLINE_PREFIXES {
                    if digits.starts_with(prefix) {
                        is_valid = true;
                        p_type = "WORK".to_string();
                        break;
                    }
                }
            }

            // 3. Fallback: If it has "Tel" label, accept even if prefix unknown?
            if !is_valid && has_tel_key {
                 is_valid = true; 
            }

            if is_valid {
                // Store cleaned or raw? 
                // raw is messy "0 17 6 / ...". User wants clean?
                // VCard standard prefers clean.
                data.phones.push((digits, p_type));
                found = true;
            }
        }

        // If we found a valid phone number, consume the line
        // But only if we didn't just find a false positive inside an address?
        // Our Prefix check is strong. So false positives (Postcodes) shouldn't match.
        // Postcodes are 5 digits. We check len > 6 (so 7+). Safely avoids PLZ.
        if found {
             line.is_consumed = true;
        }
     }
}

fn consume_address(lines: &mut Vec<Line>, data: &mut VCardData) {
    // Strategy 1: Find ZIP CITY anchor (Existing Regex)
    for i in 0..lines.len() {
        if lines[i].is_consumed { continue; }
        
        // Match standard "12345 Berlin" pattern
        // Or check if the line *ends* with a known city from our list (Phase 5)
        let mut city_match = String::new();
        let mut zip_match = String::new();
        let mut used_city_list = false;

        // Try Regex First
        if let Some(caps) = RE_ADDRESS_ANCHOR.captures(&lines[i].clean) {
             zip_match = caps.get(1).map_or("", |m| m.as_str()).to_string();
             city_match = caps.get(2).map_or("", |m| m.as_str()).trim().to_string();
        } 
        // Try City List Fallback (if regex failed or to confirm)
        else {
             for city in data::CITIES {
                 // Check if line ends with this city (ignoring case or strict?)
                 // Strict for now to avoid false positives
                 if lines[i].clean.ends_with(city) {
                     city_match = city.to_string();
                     used_city_list = true;
                     // Try to find a ZIP before it
                     // logic: "Musterstr. 1, 12345 City"
                     if let Some(zip_caps) = RE_PLZ.find(&lines[i].clean) {
                         zip_match = zip_caps.as_str().to_string();
                     }
                     break; 
                 }
             }
        }

        if !city_match.is_empty() {
             // Found a city/address line!
             let line_text = &lines[i].clean;
             
             // Extract Street: simple split or assume everything before ZIP/City is street
             // If we have a ZIP match, split on it
             let street = if !zip_match.is_empty() {
                 let parts: Vec<&str> = line_text.split(&zip_match).collect();
                 parts[0].trim().trim_end_matches(',').trim().to_string()
             } else {
                 // No zip, just city match (City List strategy)
                 // "Musterstr. 1, Berlin" -> remove "Berlin"
                 line_text.trim_end_matches(&city_match).trim().trim_end_matches(',').trim().to_string()
             };

             // Construct Adr
             let country = "Deutschland"; 
             let adr_string = format!(";;{};{};;{};{}", street, city_match, zip_match, country);
             data.adr.push(adr_string);
             
             lines[i].is_consumed = true;
             
             // If street string is excessively long, it might contain the street on the previous line?
             // "Musterfirma GmbH\nMusterstr. 1\n12345 Berlin" -> This loop only catches the last line.
             // We need to look back 1 line for street if the current line is JUST "12345 Berlin"
             if street.is_empty() || street.len() < 3 {
                 if i > 0 && !lines[i-1].is_consumed {
                      // Assume previous line is street
                      let prev_line = &mut lines[i-1];
                      // Replace the empty/short street in adr with this line
                      // Actually, easier to just push another ADR or update the last one?
                      // Modifying the last pushed ADR is messy with strings.
                      // Let's just consume the previous line and consider it part of the address context.
                      // For a robust implementation, we'd need to rebuild the adr string.
                      
                      // Quick fix: Remove the last pushed ADR and rebuild it with previous line as street
                      data.adr.pop();
                      let full_street = prev_line.clean.clone();
                      let new_adr = format!(";;{};{};;{};{}", full_street, city_match, zip_match, country);
                      data.adr.push(new_adr);
                      prev_line.is_consumed = true;
                 }
             }
             
             break; // Stop after first address
        }
    }
}

pub fn consume_name(lines: &mut Vec<Line>, data: &mut VCardData) {
    if !data.fn_field.is_empty() { return; }

    // 1. Contextual (Existing)
    for i in 0..lines.len() {
        if lines[i].is_consumed { continue; }
        if RE_NAME_CONTEXT.is_match(&lines[i].clean) {
             // ... existing logic ...
             // Simplified to assume this block is preserved if I don't touch it?
             // No, I'm replacing the function. I need to copy the logic.
             // Actually, I'll rewrite it to be cleaner.
             
             let clean = &lines[i].clean;
             // Case "Geschäftsführer: Max Mustermann"
             if let Some((_, name_part)) = clean.split_once(':') {
                if name_part.trim().split_whitespace().count() >= 2 {
                    data.fn_field = name_part.trim().to_string();
                    lines[i].is_consumed = true;
                    return;
                }
             }
             // Case "Geschäftsführer\nMax Mustermann"
             if i + 1 < lines.len() && !lines[i+1].is_consumed {
                  let next_clean = &lines[i+1].clean;
                  if next_clean.split_whitespace().count() >= 2 {
                       data.fn_field = next_clean.trim().to_string();
                       
                       // Also save the Title!
                       data.title = lines[i].clean.trim().to_string();
                       
                       lines[i].is_consumed = true;
                       lines[i+1].is_consumed = true;
                       return;
                  }
             }
        }
    }
    
    // 2. First Name List Scan (New Phase 5)
    // 2. First Name List Scan (New Phase 5 & 6)
    for i in 0..lines.len() {
        if lines[i].is_consumed { continue; }
        
        let words: Vec<&str> = lines[i].clean.split_whitespace().collect();
        if words.is_empty() { continue; }

        let first_word = words[0];
        
        // Check if first word is a known first name
        let is_known = names::FIRST_NAMES.contains(&first_word) || names::FIRST_NAMES.contains(&first_word.replace(",", "").as_str());
        
        if is_known {
             // Case A: Single Line "Zoe Müller" (2-4 words)
             if words.len() >= 2 && words.len() <= 4 {
                  let last_word = words.last().unwrap();
                  // Verify Last Name is capitalized
                  if last_word.chars().next().map_or(false, char::is_uppercase) {
                       data.fn_field = lines[i].clean.clone();
                       lines[i].is_consumed = true;
                       return;
                  }
             }
             // Case B: Multi-Line "Zoe \n Müller" (1 word here, next line is Last Name)
             else if words.len() == 1 {
                 if i + 1 < lines.len() && !lines[i+1].is_consumed {
                      let next_words: Vec<&str> = lines[i+1].clean.split_whitespace().collect();
                      if next_words.len() == 1 {
                          let last_name_candidate = next_words[0];
                          // Verify Last Name (Capitalized, No Numbers, >1 char)
                          if last_name_candidate.len() > 1 &&
                             last_name_candidate.chars().next().map_or(false, char::is_uppercase) &&
                             !last_name_candidate.chars().any(|c| c.is_numeric()) {
                                 
                                 data.fn_field = format!("{} {}", first_word, last_name_candidate);
                                 lines[i].is_consumed = true;
                                 lines[i+1].is_consumed = true;
                                 return;
                             }
                      }
                 }
             }
        }
    }

    // 3. Last Resort Heuristic (Existing)
    for line in lines.iter_mut() {
        if line.is_consumed { continue; }
        let words: Vec<&str> = line.clean.split_whitespace().collect();
        if words.len() == 2 {
             let first = words[0];
             let last = words[1];
             if first.chars().next().map_or(false, char::is_uppercase) && 
                last.chars().next().map_or(false, char::is_uppercase) &&
                !first.contains(|c: char| c.is_numeric()) &&
                !last.contains(|c: char| c.is_numeric()) {
                    
                    data.fn_field = line.clean.clone();
                    line.is_consumed = true;
                    return;
             }
        }
    }
}

fn consume_emails(lines: &mut Vec<Line>, data: &mut VCardData) {
    for line in lines.iter_mut() {
        if line.is_consumed { continue; }
        
        let mut found = false;
        for caps in RE_EMAIL.find_iter(&line.clean) {
            data.emails.push(caps.as_str().to_string());
            found = true;
        }

        if found {
            line.is_consumed = true;
        }
    }
}

fn consume_urls(lines: &mut Vec<Line>, data: &mut VCardData) {
    for line in lines.iter_mut() {
        if line.is_consumed { continue; }
        let mut found = false;
        for caps in RE_URL.find_iter(&line.clean) {
            data.urls.push(caps.as_str().to_string());
            found = true;
        }
        if found {
            line.is_consumed = true;
        }
    }
}

fn consume_title(lines: &mut Vec<Line>, data: &mut VCardData) {
    if !data.title.is_empty() { return; }
    
    for line in lines.iter_mut() {
        if line.is_consumed { continue; }
        
        // Use the massive JOB_TITLES regex
        if RE_NAME_CONTEXT.is_match(&line.clean) {
             data.title = line.clean.trim().to_string();
             line.is_consumed = true;
             return; 
        }
    }
}

#[wasm_bindgen]
pub fn rust_parse_vcard(ocr_json: &str) -> String {
    // 1. Parse Input
    let mut raw_lines: Vec<Line> = match serde_json::from_str(ocr_json) {
        Ok(v) => v,
        Err(e) => return format!("ERROR: JSON Parse Failed {:?}", e),
    };

    // 2. Pre-process (cleaning)
    for line in raw_lines.iter_mut() {
        line.clean = line.text.trim().to_string();
        line.is_consumed = false;
        line.anchors = Vec::new(); 
    }

    // 3. Init Data
    let mut data = VCardData::default();

    // 4. Run Anchors
    detect_anchors(&mut raw_lines);

    // 5. Run Consumers (Order matters!)
    consume_emails(&mut raw_lines, &mut data);
    consume_urls(&mut raw_lines, &mut data); // URLs early
    consume_phones(&mut raw_lines, &mut data); 
    consume_address(&mut raw_lines, &mut data);
    consume_company(&mut raw_lines, &mut data); 
    consume_name(&mut raw_lines, &mut data);    
    consume_title(&mut raw_lines, &mut data); // Title LAST (to preserve name context)

    // 6. Build vCard String
    let mut vcard = String::from("BEGIN:VCARD\nVERSION:3.0\n");
    
    if !data.fn_field.is_empty() {
         let parts: Vec<&str> = data.fn_field.split_whitespace().collect();
         let last = parts.last().unwrap_or(&"");
         let first = if parts.len() > 1 { parts[0] } else { "" };
         vcard.push_str(&format!("N:{};{};;;\n", last, first));
         vcard.push_str(&format!("FN:{}\n", data.fn_field));
    }
    
    if !data.title.is_empty() {
        vcard.push_str(&format!("TITLE:{}\n", data.title));
    }

    if !data.org.is_empty() {
        vcard.push_str(&format!("ORG:{}\n", data.org));
    }

    for email in data.emails { vcard.push_str(&format!("EMAIL:{}\n", email)); }
    for url in data.urls { vcard.push_str(&format!("URL:{}\n", url)); }
    
    for (phone, p_type) in data.phones { 
        vcard.push_str(&format!("TEL;TYPE={}:{}\n", p_type, phone)); 
    }
    
    for adr in data.adr { vcard.push_str(&format!("ADR;TYPE=WORK:{}\n", adr)); }

    vcard.push_str("END:VCARD");
    vcard
}






#[wasm_bindgen]
pub fn rust_fuzzy_search(items_json: &str, query: &str) -> String {
    let items: Vec<Value> = match serde_json::from_str(items_json) {
        Ok(v) => v,
        Err(_) => return "[]".to_string(),
    };

    let query_lower = query.to_lowercase();
    let query_tokens: Vec<&str> = query_lower.split_whitespace().collect();
    let threshold = 0.45; // Slightly stricter but smarter

    let mut results: Vec<(f64, Value)> = items.into_iter()
        .filter_map(|item| {
            let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            let org = item.get("org").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            
            // 1. Exact substring check (Fast path)
            if name.contains(&query_lower) || org.contains(&query_lower) {
                return Some((1.0, item));
            }

            // 2. Token-based Fuzzy Check
            // We want to see if ANY query token matches ANY name/org token well.
            // Or if the WHOLE query matches ANY name/org token well.
            
            let name_tokens: Vec<&str> = name.split_whitespace().collect();
            let org_tokens: Vec<&str> = org.split_whitespace().collect();
            let all_tokens = [name_tokens, org_tokens].concat();

            let mut max_score = 0.0;

            // Strategy: 
            // If query is "Spunge", compare "Spunge" vs "Sponge", "Bob".
            // If query is "Spunge Bob", compare "Spunge" vs "Sponge"...
            
            // Check full query against tokens (e.g. query "Sponge" vs token "Sponge")
            for token in &all_tokens {
                let score = normalized_levenshtein(token, &query_lower);
                if score > max_score { max_score = score; }
            }

            // Also check individual query tokens against item tokens (Word-by-word match)
            if query_tokens.len() > 0 {
                let mut token_match_score = 0.0;
                 for q_token in &query_tokens {
                    let mut best_token_score = 0.0;
                    for i_token in &all_tokens {
                        let score = normalized_levenshtein(i_token, q_token);
                        if score > best_token_score { best_token_score = score; }
                    }
                    // Average the best scores for each query token? Or just take the best single match?
                    // Taking the best single match favors "guessing" one word right.
                    if best_token_score > token_match_score { token_match_score = best_token_score; }
                }
                if token_match_score > max_score { max_score = token_match_score; }
            }

            // Fallback: Full string comparison (for cases where tokens are merged or short)
             let full_score_name = normalized_levenshtein(&name, &query_lower);
             if full_score_name > max_score { max_score = full_score_name; }
             
             let full_score_org = normalized_levenshtein(&org, &query_lower);
             if full_score_org > max_score { max_score = full_score_org; }


            if max_score > threshold {
                Some((max_score, item))
            } else {
                None
            }
        })
        .collect();

    // Sort by score descending
    results.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    // Extract items
    let final_items: Vec<Value> = results.into_iter().map(|(_, item)| item).collect();

    serde_json::to_string(&final_items).unwrap_or("[]".to_string())
}
