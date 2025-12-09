use crate::parser::types::Scored;
use regex::Regex;
use std::sync::OnceLock;

static PHONE_RE: OnceLock<Regex> = OnceLock::new();

fn get_phone_regex() -> &'static Regex {
    PHONE_RE.get_or_init(|| {
        // Strict start regex to avoid capturing leading spaces (which messes up boundary checks)
        // Must start with: + (CC), 00 (CC), ( (Area), or Digit
        Regex::new(r"(?x)
            (?:
                (?:\+|00)\d{1,3}    # CC start (+49)
                |
                [\d(]               # OR Start with Digit or (
            )
            [\d\s./()-]{3,}         # Body (at least 3 more chars)
        ").unwrap()
    })
}

pub fn extract_phones(input: &str) -> Vec<Scored<String>> {
    let re = get_phone_regex();
    let mut results = Vec::new();
    
    // Check if line context suggests this is a Fax number
    let is_fax_line = input.to_lowercase().contains("fax");

    for mat in re.find_iter(input) {
        let start = mat.start();
        
        // Anti-Pattern Check:
        // Ensure the match isn't part of an alphanumeric ID (e.g. VAT-ID "DE12345")
        // If the character immediately preceding the match is a letter, ignore it.
        if start > 0 {
            let prev_char_byte_idx = input[..start].char_indices().last().map(|(i, _)| i).unwrap_or(0);
            let prev_char = input[prev_char_byte_idx..start].chars().next().unwrap_or(' ');
            
            if prev_char.is_alphabetic() {
                continue;
            }
        }
        
        let raw = mat.as_str();
        
        // Multi-Phone Split Strategy
        // If Tesseract merges "040 123 / 0176 456", regex captures it all.
        // We detect this by length (>15 digits) and explicit separators.
        let digit_count = raw.chars().filter(|c| c.is_ascii_digit()).count();
        if digit_count > 15 {
            let separators = [" // ", " / ", " | "];
            let mut detected_split = false;
            
            for &sep in &separators {
                if raw.contains(sep) {
                   let parts: Vec<&str> = raw.split(sep).collect();
                   // If splitting yields valid phones, use them!
                   if parts.iter().all(|p| is_valid_phone(p.trim())) {
                       for part in parts {
                           let trimmed = part.trim();
                           let (mut score, mut label) = score_phone(trimmed);
                           if is_fax_line {
                               label = Some("FAX".to_string());
                               score = score.max(0.95);
                           }
                           
                           results.push(Scored {
                               value: normalize_phone(trimmed),
                               score,
                               label,
                               debug_info: "split_multi_phone".to_string(),
                           });
                       }
                       detected_split = true;
                       break; // Handled by this separator
                   }
                }
            }
            if detected_split {
                continue;
            }
        }

        // Post-Validation
        if is_valid_phone(raw) {
             let (mut score, mut label) = score_phone(raw);
             
             // Context-aware label override
             if is_fax_line {
                 label = Some("FAX".to_string());
                 // Boost score slightly if Fax keyword present
                 score = score.max(0.95);
             }
             
             results.push(Scored {
                 value: normalize_phone(raw),
                 score,
                 label,
                 debug_info: if is_fax_line { "fax_context".to_string() } else { "regex_loose".to_string() },
             });
        }
    }

    results
}

fn normalize_phone(raw: &str) -> String {
    // 1. Remove specific patterns like (0)
    let cleaned = raw.replace("(0)", "");
    
    // 2. Keep only digits and '+'
    let mut normalized = String::with_capacity(cleaned.len());
    for c in cleaned.chars() {
        if c.is_ascii_digit() || c == '+' {
            normalized.push(c);
        }
    }
    
    normalized
}

fn is_valid_phone(raw: &str) -> bool {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    // Too short?
    if digits.len() < 5 { return false; }
    // Date check (simple) roughly DD.MM.YYYY
    if raw.matches('.').count() == 2 && digits.len() == 8 {
        // Could be date. 
        // Real parser would check anchors "Geboren am". 
        // For now, if it looks EXACTLY like date format...
        if Regex::new(r"\d{2}\.\d{2}\.\d{4}").unwrap().is_match(raw) {
            return false;
        }
    }
    true
}

fn score_phone(raw: &str) -> (f32, Option<String>) {
    // Clean parenthesis, spaces, dashes for prefix check
    let raw_clean: String = raw.chars().filter(|c| c.is_ascii_digit() || *c == '+').collect();
    
    // Normalize +49/0049 to 0 for German checks
    let normalized = if raw_clean.starts_with("+49") {
        format!("0{}", &raw_clean[3..])
    } else if raw_clean.starts_with("0049") {
        format!("0{}", &raw_clean[4..])
    } else {
        raw_clean.clone()
    };
    
    // Mobile Check (German)
    if normalized.starts_with("017") || normalized.starts_with("016") || normalized.starts_with("015") {
        return (0.95, Some("CELL".to_string()));
    }
    
    // Valid Landline Check (Using List)
    if crate::parser::landline::find_prefix(&normalized).is_some() {
        return (1.0, Some("WORK".to_string())); // Confirmed Landline
    }
    
    // General Assumptions
    if raw_clean.starts_with("0") || raw_clean.starts_with("+") {
        return (0.85, Some("WORK".to_string())); // Plausible but unverified (e.g. 0800, or foreign)
    }
    
    (0.5, None) // Low confidence if no prefix
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_phone_extraction() {
        let input = "Tel: 040 123 456 oder Handy 0172-999888";
        let phones = extract_phones(input);
        
        assert_eq!(phones.len(), 2);
        
        // 040 ...
        assert!(phones[0].value.contains("040"));
        assert_eq!(phones[0].score, 1.0); // Now Verified Landline!
        assert_eq!(phones[0].label.as_deref(), Some("WORK"));
        
        // 0172 ...
        assert!(phones[1].value.contains("0172"));
        assert_eq!(phones[1].score, 0.95);
        assert_eq!(phones[1].label.as_deref(), Some("CELL"));
    }
}
