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

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum FieldType {
    FN,
    ORG,
    TITLE,
    EMAIL,
    URL,
    TEL, // Can be subtype CELL/WORK later or stored in value
    ADR,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Candidate {
    pub field: FieldType,
    pub score: f32,
    pub value: String,
    pub metadata: Option<String>, // e.g. "CELL", "WORK" for phones
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Line {
    pub text: String,
    pub index: usize,
    pub bbox: Option<serde_json::Value>,
    
    // Internal fields for processing:
    #[serde(default)]
    pub clean: String, 
    #[serde(default)]
    pub is_consumed: bool,
    #[serde(default)]
    pub anchors: Vec<AnchorMatch>,
    #[serde(default)]
    pub candidates: Vec<Candidate>,
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


// --- DETECTORS (Phase 10) ---

fn detect_emails(lines: &mut Vec<Line>) {
    for line in lines.iter_mut() {
        // No consumption check! All candidates run.
        for caps in RE_EMAIL.find_iter(&line.clean) {
             line.candidates.push(Candidate {
                 field: FieldType::EMAIL,
                 score: 1.0, // Regex match is high confidence
                 value: caps.as_str().to_string(),
                 metadata: None,
             });
        }
    }
}

fn detect_urls(lines: &mut Vec<Line>) {
     for line in lines.iter_mut() {
        for caps in RE_URL.find_iter(&line.clean) {
             line.candidates.push(Candidate {
                 field: FieldType::URL,
                 score: 1.0,
                 value: caps.as_str().to_string(),
                 metadata: None,
             });
        }
    }
}

fn detect_phones(lines: &mut Vec<Line>) { // Needs data for prefixes
     for line in lines.iter_mut() {
        let text = &line.clean;
        let has_tel_key = line.anchors.iter().any(|a| a.anchor_type == "TEL_KEYWORD");
        
        for caps in RE_PHONE_CANDIDATE.find_iter(text) {
            let raw_val = caps.as_str();
            let mut digits: String = raw_val.chars().filter(|c| c.is_numeric()).collect();
            
            // +49 handling
            if raw_val.contains("+49") || raw_val.contains("0049") {
                 if digits.starts_with("49") { digits = format!("0{}", &digits[2..]); }
                 else if digits.starts_with("0049") { digits = format!("0{}", &digits[4..]); }
            }

            if digits.len() < 7 { continue; } 
            
            let mut score = 0.0;
            let mut p_type = "VOICE".to_string();

            // Mobile Prefix
            if data::MOBILE_PREFIXES.iter().any(|&p| digits.starts_with(p)) {
                score = 0.95;
                p_type = "CELL".to_string();
            }
            // Landline Prefix
            else if data::LANDLINE_PREFIXES.iter().any(|&p| digits.starts_with(p)) {
                score = 0.95;
                p_type = "WORK".to_string();
            }
            // Label Fallback
            else if has_tel_key {
                score = 0.6; // Lower confidence if only label matches but no prefix
                p_type = "WORK".to_string();
            }

            if score > 0.0 {
                 line.candidates.push(Candidate {
                     field: FieldType::TEL,
                     score,
                     value: digits, // Store ID formatted? or raw? Let's store clean digits.
                     metadata: Some(p_type),
                 });
            }
        }
     }
}

fn detect_org(lines: &mut Vec<Line>) {
    for line in lines.iter_mut() {
        if RE_LEGAL_FORM.is_match(&line.clean) {
             line.candidates.push(Candidate {
                 field: FieldType::ORG,
                 score: 0.9,
                 value: line.clean.trim().to_string(),
                 metadata: None,
             });
        }
    }
}

fn detect_title(lines: &mut Vec<Line>) {
    for line in lines.iter_mut() {
        if RE_NAME_CONTEXT.is_match(&line.clean) {
             line.candidates.push(Candidate {
                 field: FieldType::TITLE,
                 score: 0.9,
                 value: line.clean.trim().to_string(),
                 metadata: None,
             });
        }
    }
}

fn detect_adr(lines: &mut Vec<Line>) {
    // We iterate by index to look back if needed
    // However, we can't easily iterate logic that needs to read i-1 while writing to i with mutable borrow.
    // So we collect updates first.
    let mut candidates_to_add: Vec<(usize, Candidate)> = Vec::new();

    for i in 0..lines.len() {
        let clean = lines[i].clean.clone();
        
        // 1. Regex
        let mut zip_city_match = None;
        if let Some(caps) = RE_ADDRESS_ANCHOR.captures(&clean) {
             let zip = caps.get(1).map_or("", |m| m.as_str());
             let city = caps.get(2).map_or("", |m| m.as_str()).trim();
             zip_city_match = Some((zip.to_string(), city.to_string()));
        } 
        // 2. Fallback City List
        else {
             for city in data::CITIES {
                 if clean.ends_with(city) {
                      // Check for ZIP before city
                      let mut best_zip = "".to_string();
                      if let Some(zip_caps) = RE_PLZ.find(&clean) {
                           best_zip = zip_caps.as_str().to_string();
                      }
                      zip_city_match = Some((best_zip, city.to_string()));
                      break; 
                 }
             }
        }
        
        if let Some((zip, city)) = zip_city_match {
             let mut street = if !zip.is_empty() {
                  clean.split(&zip).next().unwrap_or("").trim().trim_end_matches(',').trim().to_string()
             } else {
                  clean.trim_end_matches(&city).trim().trim_end_matches(',').trim().to_string()
             };
             
             // Look back check (using cloned line text from earlier? No, lines is mutable here, but we can access lines[i-1] if we don't hold lines[i])
             // Actually, we are just collecting candidates, so we don't hold references.
             // But we need to read lines[i-1].
             if (street.is_empty() || street.len() < 3) && i > 0 {
                  // Accessing lines[i-1] safely requires not borrowing iterator. 
                  // We are iterating with index, so lines[i-1] is safe if we don't have lines[i] borrow active.
                  // We cloned `clean` at start. So lines is free? No, lines is borrowed as mutable for the loop context?
                  // No, "for i in 0..lines.len()" does NOT borrow lines.
                  // BUT "lines[i]" borrows.
                  // So we can read lines[i-1].
                  street = lines[i-1].clean.clone();
             }

             let adr_string = format!(";;{};{};;{};Deutschland", street, city, zip);
             
             candidates_to_add.push((i, Candidate {
                 field: FieldType::ADR,
                 score: 0.95,
                 value: adr_string,
                 metadata: None,
             }));
        }
    }
    
    for (idx, cand) in candidates_to_add {
         lines[idx].candidates.push(cand);
    }
}

fn detect_name(lines: &mut Vec<Line>) {
    let mut candidates_to_add: Vec<(usize, Candidate)> = Vec::new();

    for i in 0..lines.len() {
        let clean = lines[i].clean.clone();
        let words: Vec<&str> = clean.split_whitespace().collect();
        
        // 1. Context Anchor
        if RE_NAME_CONTEXT.is_match(&clean) {
             if let Some((_, name_part)) = clean.split_once(':') {
                  if name_part.trim().split_whitespace().count() >= 2 {
                       candidates_to_add.push((i, Candidate {
                           field: FieldType::FN,
                           score: 0.85, 
                           value: name_part.trim().to_string(),
                           metadata: Some("context_inline".to_string())
                       }));
                  }
             }
             if i + 1 < lines.len() {
                  let next_clean = &lines[i+1].clean;
                  let next_words: Vec<&str> = next_clean.split_whitespace().collect();
                  if next_words.len() >= 2 && !next_clean.chars().any(char::is_numeric) {
                       candidates_to_add.push((i+1, Candidate {
                           field: FieldType::FN,
                           score: 0.8, 
                           value: next_clean.trim().to_string(),
                           metadata: Some("context_next".to_string())
                       }));
                  }
             }
        }
        
        // 2. Known First Name
        if !words.is_empty() {
             let first = words[0];
             let is_known = names::FIRST_NAMES.contains(&first) || names::FIRST_NAMES.contains(&first.replace(",", "").as_str());
             
             if is_known {
                  if words.len() >= 2 && words.len() <= 4 {
                       let last = words.last().unwrap();
                       if last.chars().next().map_or(false, char::is_uppercase) {
                           candidates_to_add.push((i, Candidate {
                               field: FieldType::FN,
                               score: 0.9, 
                               value: clean.clone(),
                               metadata: Some("list_match".to_string())
                           }));
                       }
                  }
                  else if words.len() == 1 && i + 1 < lines.len() {
                       let next_clean = &lines[i+1].clean;
                       let next_words: Vec<&str> = next_clean.split_whitespace().collect();
                        if next_words.len() == 1 {
                             let last = next_words[0];
                             if last.len() > 1 && last.chars().next().map_or(false, char::is_uppercase) && !last.chars().any(char::is_numeric) {
                                  let full_name = format!("{} {}", first, last);
                                  candidates_to_add.push((i, Candidate {
                                      field: FieldType::FN,
                                      score: 0.95, 
                                      value: full_name,
                                      metadata: Some("list_match_merged".to_string()) 
                                  }));
                             }
                        }
                  }
             }
        }
        
        // 3. Heuristic 
        if words.len() == 2 {
             let first = words[0];
             let last = words[1];
             if first.chars().next().map_or(false, char::is_uppercase) 
                && last.chars().next().map_or(false, char::is_uppercase) 
                && !clean.chars().any(char::is_numeric) {
                    candidates_to_add.push((i, Candidate {
                        field: FieldType::FN,
                        score: 0.4, 
                        value: clean.clone(),
                        metadata: Some("heuristic".to_string())
                    }));
             }
        }
    }
    
    for (idx, cand) in candidates_to_add {
         if idx < lines.len() {
             lines[idx].candidates.push(cand);
         }
    }
}

fn resolve_best_matches(lines: &Vec<Line>, data: &mut VCardData) {
    let mut best_fn: Option<Candidate> = None;
    let mut best_org: Option<Candidate> = None;
    let mut best_title: Option<Candidate> = None;

    // First Pass: Collect Candidates
    for line in lines {
        for cand in &line.candidates {
            if cand.score < 0.3 { continue; } // Noise filter

            match cand.field {
                FieldType::FN => {
                    // Update if better score, or if same score but longer value? (Heuristic)
                    if best_fn.is_none() || cand.score > best_fn.as_ref().unwrap().score {
                        best_fn = Some(cand.clone());
                    }
                },
                FieldType::ORG => {
                    if best_org.is_none() || cand.score > best_org.as_ref().unwrap().score {
                        best_org = Some(cand.clone());
                    }
                },
                FieldType::TITLE => {
                    if best_title.is_none() || cand.score > best_title.as_ref().unwrap().score {
                        best_title = Some(cand.clone());
                    }
                },
                // Multi-Values: Collect directly (with dedup logic)
                FieldType::EMAIL => {
                     if !data.emails.contains(&cand.value) { data.emails.push(cand.value.clone()); }
                },
                FieldType::URL => {
                     if !data.urls.contains(&cand.value) { data.urls.push(cand.value.clone()); }
                },
                FieldType::ADR => {
                     if !data.adr.contains(&cand.value) { data.adr.push(cand.value.clone()); }
                },
                FieldType::TEL => { 
                     let p_type = cand.metadata.clone().unwrap_or("VOICE".to_string());
                     if !data.phones.iter().any(|(n,_)| n == &cand.value) {
                         data.phones.push((cand.value.clone(), p_type));
                     }
                },
            }
        }
    }

    // Apply Winners (Singletons)
    if let Some(c) = best_fn { data.fn_field = c.value; }
    if let Some(c) = best_org { data.org = c.value; }
    if let Some(c) = best_title { data.title = c.value; }
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
        line.candidates = Vec::new(); 
    }

    // 3. Init Data
    let mut data = VCardData::default();

    // 4. Run Anchors
    detect_anchors(&mut raw_lines);

    // 5. Run Detectors (Phase 10: Confidence Scoring)
    detect_emails(&mut raw_lines);
    detect_urls(&mut raw_lines);
    detect_phones(&mut raw_lines); // Data unused but passed
    detect_adr(&mut raw_lines);
    detect_org(&mut raw_lines);
    detect_title(&mut raw_lines);
    detect_name(&mut raw_lines); // Run last or first? Order doesn't matter now!

    // 6. Resolve Best Matches
    resolve_best_matches(&raw_lines, &mut data);

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
// ... (existing code)

#[derive(Serialize, Deserialize, Clone, Debug)]
struct IndexedItem {
    id: String,
    text: String, // Normalized text for searching
}

#[wasm_bindgen]
pub struct SearchIndex {
    items: Vec<IndexedItem>,
}

#[wasm_bindgen]
impl SearchIndex {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SearchIndex {
        SearchIndex { items: Vec::new() }
    }

    pub fn add(&mut self, id: &str, name: &str, org: &str, keywords: &str) {
        let full_text = format!("{} {} {}", name, org, keywords).to_lowercase();
        self.items.push(IndexedItem {
            id: id.to_string(),
            text: full_text,
        });
    }

    pub fn search(&self, query: &str) -> String {
        let query_lower = query.to_lowercase();
        let query_tokens: Vec<&str> = query_lower.split_whitespace().collect();
        
        let mut matches: Vec<(f64, String)> = Vec::new(); // (score, id)

        for item in &self.items {
            let mut score = 0.0;
            
            // 1. Exact Substring (Fast) - Score 1.0
            if item.text.contains(&query_lower) {
                score = 1.0;
            } else {
                // 2. Fuzzy Token Match
                // Check if all query tokens are present loosely
                let mut tokens_found = 0;
                let mut total_token_score = 0.0;

                for q_token in &query_tokens {
                    // Find best match for this token in the item text
                    // Optimization: We don't tokenize item text every time.
                    // Just check if q_token is "close enough" to be a substring? 
                    // No, strsim works on whole strings usually.
                    // For perf, we actaully just check contains first.
                    if item.text.contains(q_token) {
                        tokens_found += 1;
                        total_token_score += 1.0;
                    } else {
                        // Scan words in item text? 
                        // This is slow O(N*M). For 1000 items it's OK locally.
                        let mut best_word_score = 0.0;
                         for word in item.text.split_whitespace() {
                            let s = normalized_levenshtein(word, q_token);
                             if s > best_word_score { best_word_score = s; }
                         }
                         if best_word_score > 0.7 {
                             tokens_found += 1;
                             total_token_score += best_word_score;
                         }
                    }
                }

                if tokens_found > 0 {
                    let coverage = tokens_found as f64 / query_tokens.len() as f64;
                    // Boost full coverage
                    if coverage == 1.0 {
                        score = 0.8 + (total_token_score / query_tokens.len() as f64 * 0.2);
                    } else {
                         score = coverage * 0.8; 
                    }
                }
            }

            if score > 0.4 {
                matches.push((score, item.id.clone()));
            }
        }

        // Sort by score
        matches.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
        
        // Return IDs
        let ids: Vec<String> = matches.into_iter().take(50).map(|(_, id)| id).collect();
        serde_json::to_string(&ids).unwrap_or("[]".to_string())
    }
    
    pub fn clear(&mut self) {
        self.items.clear();
    }
}
