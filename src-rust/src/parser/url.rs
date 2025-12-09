use crate::parser::types::Scored;
use regex::Regex;

// URL patterns for business cards
fn get_url_regex() -> Regex {
    // Match common URL formats:
    // - http://example.com
    // - https://example.com
    // - www.example.com
    // - example.com (with known TLDs) - expanded list
    Regex::new(
        r"(?i)(https?://[^\s,;]+|www\.[^\s,;]+|(?:[a-z0-9-]+\.)+(?:com|de|org|net|eu|info|io|app|co|biz|ch|at|fr|nl|be|uk|us|it|es|pl|ru|cn|jp|br|in|au|ca)(?:/[^\s,;]*)?)"
    ).unwrap()
}

// Clean up URL (remove trailing punctuation)
fn clean_url(url: &str) -> String {
    let mut cleaned = url.to_string();
    
    // Remove trailing punctuation that's not part of URL
    while cleaned.ends_with('.') || cleaned.ends_with(',') || 
          cleaned.ends_with(';') || cleaned.ends_with(')') {
        cleaned.pop();
    }
    
    cleaned
}

// Normalize URL for comparison (add protocol if missing)
fn normalize_url(url: &str) -> String {
    let lower = url.to_lowercase();
    
    if lower.starts_with("http://") || lower.starts_with("https://") {
        url.to_string()
    } else if lower.starts_with("www.") {
        format!("https://{}", url)
    } else {
        format!("https://{}", url)
    }
}

pub fn extract_urls(chunk: &str) -> Vec<Scored<String>> {
    let mut results = Vec::new();
    
    // Pre-process: Fix common OCR artifacts in URLs
    // "www. domain.de" → "www.domain.de"
    // "http: //domain.de" → "http://domain.de"
    // "https ://domain.de" → "https://domain.de"
    let cleaned = chunk
        .replace("www. ", "www.")
        .replace("http: //", "http://")
        .replace("https: //", "https://")
        .replace("https ://", "https://")
        .replace("http ://", "http://");
    
    let re = get_url_regex();
    
    for cap in re.captures_iter(&cleaned) {
        if let Some(url_match) = cap.get(0) {
            let raw_url = url_match.as_str();
            let cleaned_url = clean_url(raw_url);
            
            // Skip if too short (likely false positive)
            if cleaned_url.len() < 5 {
                continue;
            }
            
            // Skip if it's just a file extension
            if cleaned_url.starts_with('.') {
                continue;
            }
            
            // Calculate score based on URL quality
            let score = if cleaned_url.starts_with("http://") || cleaned_url.starts_with("https://") {
                1.0 // Explicit protocol = high confidence
            } else if cleaned_url.starts_with("www.") {
                0.95 // www. prefix = very likely
            } else if cleaned_url.contains('/') {
                0.85 // Has path = likely URL
            } else {
                0.7 // Just domain = possible
            };
            
            results.push(Scored {
                value: normalize_url(&cleaned_url),
                score,
                label: Some("URL".to_string()),
                debug_info: "url_pattern".to_string(),
            });
        }
    }
    
    results
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_url_extraction() {
        let text = "Visit us at https://example.com or www.test.de";
        let urls = extract_urls(text);
        
        assert_eq!(urls.len(), 2);
        assert!(urls[0].value.contains("example.com"));
        assert!(urls[1].value.contains("test.de"));
    }
    
    #[test]
    fn test_url_without_protocol() {
        let text = "Contact: info@example.com | example.com";
        let urls = extract_urls(text);
        
        assert!(urls.len() >= 1);
        assert!(urls.iter().any(|u| u.value.contains("example.com")));
    }
    
    #[test]
    fn test_url_cleanup() {
        let text = "Visit www.example.com.";
        let urls = extract_urls(text);
        
        assert_eq!(urls.len(), 1);
        assert!(!urls[0].value.ends_with('.'));
    }
    
    #[test]
    fn test_url_ocr_artifacts() {
        // OCR often adds space after "www."
        let text = "www. ektavision.de";
        let urls = extract_urls(text);
        
        assert_eq!(urls.len(), 1);
        assert!(urls[0].value.contains("ektavision.de"));
        assert!(!urls[0].value.contains(" ")); // No space in result
    }
}
