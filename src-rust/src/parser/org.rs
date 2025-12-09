use crate::parser::types::Scored;
use crate::parser::layout;

// German and international legal forms
fn get_legal_forms() -> Vec<&'static str> {
    vec![
        // Kapitalgesellschaften
        "gmbh", "ag", "ug", "kgaa", "se",
        // Personengesellschaften  
        "ohg", "kg", "partg", "partgmbb",
        // Einzelunternehmen
        "e.k.", "e.kfm.", "e.kfr.",
        // Non-Profit
        "e.v.", "ggmbh", "stiftung",
        // International
        "ltd", "llc", "inc", "corp", "s.a.", "b.v.", "plc",
        // Common variations
        "gmbh & co. kg", "gmbh & co kg",
    ]
}

fn contains_legal_form(text: &str) -> bool {
    let forms = get_legal_forms();
    let lower = text.to_lowercase();
    
    forms.iter().any(|form| {
        // Check for word boundaries to avoid false positives
        // e.g., "Verlag" shouldn't match "ag"
        if form.len() <= 3 {
            // Short forms: require word boundaries
            let pattern = format!(" {} ", form);
            lower.contains(&pattern) || 
            lower.ends_with(form) ||
            lower.starts_with(&format!("{} ", form))
        } else {
            // Longer forms: can match anywhere
            lower.contains(form)
        }
    })
}

// Extract the company name including legal form
fn extract_company_name(text: &str) -> Option<String> {
    if !contains_legal_form(text) {
        return None;
    }
    
    // Clean up common noise
    let cleaned = text
        .trim()
        .trim_matches(',')
        .trim_matches('.')
        .trim();
    
    // Skip if it's ONLY a legal form (too ambiguous)
    if cleaned.len() < 5 {
        return None;
    }
    
    Some(cleaned.to_string())
}

fn calculate_org_score(text: &str) -> f32 {
    let has_legal_form = contains_legal_form(text);
    let word_count = text.split_whitespace().count();
    
    if !has_legal_form {
        return 0.3; // Fallback score
    }
    
    // Higher score for well-formed company names
    match word_count {
        1 => 0.6,  // Just "GmbH" - low confidence
        2 => 0.8,  // "Company GmbH" - good
        3..=5 => 1.0,  // "EKTA Vision GmbH" - excellent
        _ => 0.7,  // Very long - might be noisy
    }
}

pub fn extract_orgs(chunks: &[String]) -> Vec<Scored<String>> {
    let mut results = Vec::new();
    let mut seen = std::collections::HashSet::new();
    
    for chunk in chunks {
        // Try the whole chunk first
        if let Some(org) = extract_company_name(chunk) {
            if !seen.contains(&org) {
                seen.insert(org.clone());
                results.push(Scored {
                    value: org.clone(),
                    score: calculate_org_score(&org),
                    label: Some("ORG".to_string()),
                    debug_info: "legal_form_detected".to_string(),
                });
            }
        }
        
        // Also try individual columns if multi-column
        if chunk.contains("   ") {
            let columns = layout::split_line_into_columns(chunk);
            for col in columns {
                if let Some(org) = extract_company_name(&col) {
                    if !seen.contains(&org) {
                        seen.insert(org.clone());
                        results.push(Scored {
                            value: org.clone(),
                            score: calculate_org_score(&org),
                            label: Some("ORG".to_string()),
                            debug_info: "legal_form_column".to_string(),
                        });
                    }
                }
            }
        }
    }
    
    // Sort by score descending
    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
    results
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_legal_form_detection() {
        assert!(contains_legal_form("EKTA Vision GmbH"));
        assert!(contains_legal_form("Musterfirma AG"));
        assert!(contains_legal_form("Test e.V."));
        assert!(contains_legal_form("Company Ltd"));
        
        // Should NOT match
        assert!(!contains_legal_form("Manager")); // "ag" in Manager
        assert!(!contains_legal_form("Just a text"));
    }
    
    #[test]
    fn test_org_extraction() {
        let chunks = vec![
            "EKTA Vision GmbH".to_string(),
            "Musterfirma AG".to_string(),
            "Just text".to_string(),
        ];
        
        let orgs = extract_orgs(&chunks);
        assert_eq!(orgs.len(), 2);
        assert!(orgs[0].value.contains("EKTA Vision") || orgs[0].value.contains("Musterfirma"));
    }
}
