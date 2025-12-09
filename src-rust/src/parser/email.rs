use crate::parser::types::Scored;
use regex::Regex;
use std::sync::OnceLock;

// Optimization: Compile regex once
static EMAIL_RE: OnceLock<Regex> = OnceLock::new();

fn get_email_regex() -> &'static Regex {
    EMAIL_RE.get_or_init(|| {
        // Simple but robust email regex
        Regex::new(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b").unwrap()
    })
}

pub fn extract_emails(input: &str) -> Vec<Scored<String>> {
    let re = get_email_regex();
    let mut results = Vec::new();

    // In 'nom' spirit, we could traverse manually, but for Email, Regex is essentially a State Machine matching.
    // Combining it: We iterate over matches.
    for mat in re.find_iter(input) {
        let value = mat.as_str().to_string();
        let score = calculate_confidence(&value);
        
        results.push(Scored {
            value,
            score,
            label: Some("EMAIL".to_string()),
            debug_info: "regex_standard".to_string(),
        });
    }

    results
}

fn calculate_confidence(email: &str) -> f32 {
    let lower = email.to_lowercase();
    // Known providers boost confidence
    if lower.ends_with("gmail.com") || lower.ends_with("outlook.com") || lower.contains("firmenname.de") {
        return 1.0;
    }
    // Generic
    0.9
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_extraction() {
        let input = "Kontaktieren Sie mich unter max.mustermann@example.com oder info@firma.de";
        let emails = extract_emails(input);
        
        assert_eq!(emails.len(), 2);
        assert_eq!(emails[0].value, "max.mustermann@example.com");
        assert_eq!(emails[0].score, 0.9);
        
        assert_eq!(emails[1].value, "info@firma.de");
        // Our heuristic doesn't know "firma.de" is special unless hardcoded, so 0.9
        // Wait, I put "firmenname.de" in the code.
    }
}
