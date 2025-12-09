// New token-based street finder using FST
// Scans all tokens and checks against street database
// Returns (street_name, house_number) if found

use crate::parser::streets;

pub fn find_street_in_text(text: &str) -> Option<(String, Option<String>)> {
    // Tokenize by whitespace
    let tokens: Vec<&str> = text.split_whitespace().collect();
    
    for (i, token) in tokens.iter().enumerate() {
        // Try this token as street name
        if streets::find_street_fuzzy(token) {
            // Found a street! Now look for house number
            let mut street_name = token.to_string();
            let mut house_number: Option<String> = None;
            
            // Check next tokens for house number
            if i + 1 < tokens.len() {
                let next = tokens[i + 1];
                
                // Is it a digit or starts with digit?
                if next.chars().next().map_or(false, |c| c.is_numeric()) {
                    house_number = Some(next.to_string());
                    street_name = format!("{} {}", street_name, next);
                }
            }
            
            return Some((street_name, house_number));
        }
        
        // Try combining with next token (for "Lilienthal str." → "Lilienthalstr.")
        if i + 1 < tokens.len() {
            let combined = format!("{}{}", token, tokens[i + 1]);
            if streets::find_street_fuzzy(&combined) {
                let mut street_name = combined;
                let mut house_number: Option<String> = None;
                
                // Check token after the combined one
                if i + 2 < tokens.len() {
                    let next = tokens[i + 2];
                    if next.chars().next().map_or(false, |c| c.is_numeric()) {
                        house_number = Some(next.to_string());
                        street_name = format!("{} {}", street_name, next);
                    }
                }
                
                return Some((street_name, house_number));
            }
        }
    }
    
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    #[ignore] // Needs FST loaded
    fn test_token_based_street_finding() {
        #[cfg(not(target_arch = "wasm32"))]
        {
            let _ = streets::load_from_file("../public/streets.fst");
        }
        
        // Should find street even with noise
        let text = "Geschäftsführer                Lilienthalstr. 5                     L";
        let result = find_street_in_text(text);
        assert!(result.is_some());
        
        let (street, house) = result.unwrap();
        assert!(street.contains("Lilienthal"));
        assert_eq!(house, Some("5".to_string()));
    }
}
