use crate::parser::types::Scored;
use crate::parser::layout;

// German and international job title keywords
fn get_title_keywords() -> Vec<&'static str> {
    vec![
        // C-Level
        "ceo", "cfo", "cto", "coo", "cmo", "cio", "ciso",
        "chief executive", "chief financial", "chief technology",
        
        // Führungsebene (German)
        "geschäftsführer", "geschäftsführerin",
        "gesellschafter", "gesellschafterin",
        "inhaber", "inhaberin",
        "vorstand", "vorständin",
        "direktor", "direktorin",
        "geschäftsleitung", "geschäftsleiter",
        
        // Leitung
        "leiter", "leiterin",
        "bereichsleiter", "bereichsleiterin",
        "abteilungsleiter", "abteilungsleiterin",
        "teamleiter", "teamleiterin",
        "projektleiter", "projektleiterin",
        
        // Management
        "manager", "managerin",
        "senior manager", "junior manager",
        "head of", "head",
        
        // Beruf/Spezialist
        "berater", "beraterin", "consultant",
        "architekt", "architektin",
        "entwickler", "entwicklerin", "developer",
        "ingenieur", "ingenieurin", "engineer",
        "verkaufsleiter", "vertriebsleiter",
        
        // Assistenz
        "assistent", "assistentin",
        "sekretär", "sekretärin",
        "assistant", "secretary",
        
        // Akademisch
        "professor", "professorin",
        "doktor", "dr.",
        
        // Sonstige
        "prokurist", "prokuristin",
        "partner", "partnerin",
        "mitarbeiter", "mitarbeiterin",
    ]
}

fn is_likely_title(text: &str) -> bool {
    let keywords = get_title_keywords();
    let lower = text.to_lowercase();
    
    // Check if any keyword is present
    keywords.iter().any(|kw| {
        if kw.len() <= 4 {
            // Short keywords: more strict matching
            let words: Vec<&str> = lower.split_whitespace().collect();
            words.iter().any(|w| w == kw || w.starts_with(kw))
        } else {
            // Longer keywords: contains is OK
            lower.contains(kw)
        }
    })
}

// Filter out obvious non-titles
fn is_noise(text: &str) -> bool {
    let lower = text.to_lowercase();
    
    // Skip if it looks like contact info
    if lower.contains("tel") || lower.contains("fax") || 
       lower.contains("email") || lower.contains('@') ||
       lower.contains("http") || lower.contains("www") {
        return true;
    }
    
    // Skip if it's numbers
    if text.chars().filter(|c| c.is_numeric()).count() > text.len() / 2 {
        return true;
    }
    
    // Skip if too short
    if text.trim().len() < 4 {
        return true;
    }
    
    false
}

fn calculate_title_score(text: &str) -> f32 {
    let keywords = get_title_keywords();
    let lower = text.to_lowercase();
    
    // Count how many keywords match
    let matches: usize = keywords.iter()
        .filter(|kw| lower.contains(*kw))
        .count();
    
    let word_count = text.split_whitespace().count();
    
    // Score based on match quality
    match matches {
        0 => 0.3,
        1 => {
            // Single keyword - check if it's the whole text or part
            if word_count == 1 { 0.9 } else { 0.7 }
        },
        2 => 0.85,  // e.g., "Senior Manager"
        _ => 0.95,  // Multiple keywords - very confident
    }
}

pub fn extract_titles(chunks: &[String]) -> Vec<Scored<String>> {
    let mut results = Vec::new();
    let mut seen = std::collections::HashSet::new();
    
    for chunk in chunks {
        if is_noise(chunk) {
            continue;
        }
        
        // Try the whole chunk
        if is_likely_title(chunk) {
            let cleaned = chunk.trim().to_string();
            if !seen.contains(&cleaned) {
                seen.insert(cleaned.clone());
                results.push(Scored {
                    value: cleaned.clone(),
                    score: calculate_title_score(&cleaned),
                    label: Some("TITLE".to_string()),
                    debug_info: "keyword_match".to_string(),
                });
            }
        }
        
        // Also try columns if multi-column
        if chunk.contains("   ") {
            let columns = layout::split_line_into_columns(chunk);
            for col in columns {
                if is_noise(&col) {
                    continue;
                }
                
                if is_likely_title(&col) {
                    let cleaned = col.trim().to_string();
                    if !seen.contains(&cleaned) {
                        seen.insert(cleaned.clone());
                        results.push(Scored {
                            value: cleaned.clone(),
                            score: calculate_title_score(&cleaned),
                            label: Some("TITLE".to_string()),
                            debug_info: "keyword_column".to_string(),
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
    fn test_title_detection() {
        assert!(is_likely_title("Geschäftsführer"));
        assert!(is_likely_title("CEO"));
        assert!(is_likely_title("Senior Manager"));
        assert!(is_likely_title("Projektleiter"));
        
        // Should NOT match
        assert!(!is_likely_title("Straße 123"));
        assert!(!is_likely_title("Tel: 123456"));
    }
    
    #[test]
    fn test_title_extraction() {
        let chunks = vec![
            "Geschäftsführer".to_string(),
            "CEO".to_string(),
            "Just text".to_string(),
            "Tel: 123".to_string(),
        ];
        
        let titles = extract_titles(&chunks);
        assert!(titles.len() >= 2);
        assert!(titles.iter().any(|t| t.value.contains("Geschäftsführer")));
    }
}
