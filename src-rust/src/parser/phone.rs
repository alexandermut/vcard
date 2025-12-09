use crate::parser::types::Scored;
use regex::Regex;
use std::sync::OnceLock;

static PHONE_RE: OnceLock<Regex> = OnceLock::new();

fn get_phone_regex() -> &'static Regex {
    PHONE_RE.get_or_init(|| {
        // Broad regex to catch candidates
        // Allows: +49, 0049, (040), /, -, spaces
        Regex::new(r"(?x)
            (?:(?:\+|00)\d{1,3})?  # Optional Country Code
            [\d\s./()-]{5,}        # Body (at least 5 chars)
        ").unwrap()
    })
}

pub fn extract_phones(input: &str) -> Vec<Scored<String>> {
    let re = get_phone_regex();
    let mut results = Vec::new();
    
    // Check if line context suggests this is a Fax number
    let is_fax_line = input.to_lowercase().contains("fax");

    for mat in re.find_iter(input) {
        let raw = mat.as_str();
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
                 value: raw.to_string(), // Keep raw for now, normalization is separate step
                 score,
                 label,
                 debug_info: if is_fax_line { "fax_context".to_string() } else { "regex_loose".to_string() },
             });
        }
    }

    results
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
