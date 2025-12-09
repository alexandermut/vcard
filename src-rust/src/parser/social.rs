use crate::parser::types::Scored;
use regex::Regex;
use std::sync::OnceLock;

static HANDLE_RE: OnceLock<Regex> = OnceLock::new();

fn get_handle_regex() -> &'static Regex {
    HANDLE_RE.get_or_init(|| {
        // Matches: "Key: @handle" or "Key: handle"
        // Keys: Twitter, X, Instagram, IG, Insta, GitHub, FB, Facebook, YouTube, YT
        Regex::new(r"(?im)(?:Twitter|X|Instagram|Insta|IG|GitHub|Face?book|FB|YouTube|YT)\s*[:]\s*(@?[\w\._-]+)").unwrap()
    })
}

pub fn classify_social_url(url: &str) -> Option<String> {
    let lower = url.to_lowercase();
    if lower.contains("linkedin.com") {
        return Some("LINKEDIN".to_string());
    }
    if lower.contains("xing.com") {
        return Some("XING".to_string());
    }
    if lower.contains("twitter.com") || lower.contains("x.com") {
        return Some("TWITTER".to_string());
    }
    if lower.contains("instagram.com") {
        return Some("INSTAGRAM".to_string());
    }
    if lower.contains("facebook.com") {
        return Some("FACEBOOK".to_string());
    }
    if lower.contains("github.com") {
        return Some("GITHUB".to_string());
    }
    if lower.contains("youtube.com") || lower.contains("youtu.be") {
        return Some("YOUTUBE".to_string());
    }
    None
}

pub fn extract_social_handles(input: &str) -> Vec<Scored<String>> {
    let re = get_handle_regex();
    let mut results = Vec::new();
    
    for cap in re.captures_iter(input) {
        if let Some(handle_match) = cap.get(1) {
            let handle = handle_match.as_str().trim_start_matches('@');
            let full_match = cap.get(0).unwrap().as_str().to_lowercase();
            
            let (base_url, label) = if full_match.contains("twitter") || full_match.contains("x:") || full_match.contains("x ") {
                ("https://twitter.com/", "TWITTER")
            } else if full_match.contains("insta") || full_match.contains("ig") {
                ("https://instagram.com/", "INSTAGRAM")
            } else if full_match.contains("github") {
                ("https://github.com/", "GITHUB")
            } else if full_match.contains("face") || full_match.contains("fb") {
                ("https://facebook.com/", "FACEBOOK")
            } else if full_match.contains("youtu") || full_match.contains("yt") {
                ("https://youtube.com/", "YOUTUBE")
            } else {
                continue;
            };
            
            results.push(Scored {
                value: format!("{}{}", base_url, handle),
                score: 0.9,
                label: Some(label.to_string()),
                debug_info: "social_handle_regex".to_string(),
            });
        }
    }
    
    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify() {
        assert_eq!(classify_social_url("https://www.linkedin.com/in/foo"), Some("LINKEDIN".to_string()));
        assert_eq!(classify_social_url("https://github.com/foo"), Some("GITHUB".to_string()));
        assert_eq!(classify_social_url("https://ektavision.de"), None);
    }
    
    #[test]
    fn test_handle_extraction() {
        let input = "Follow us on Twitter: @kontakte_app and IG: insta.gram";
        let res = extract_social_handles(input);
        
        assert_eq!(res.len(), 2);
        
        // Twitter
        assert!(res.iter().any(|r| r.value == "https://twitter.com/kontakte_app" && r.label.as_deref() == Some("TWITTER")));
        
        // Instagram
        assert!(res.iter().any(|r| r.value == "https://instagram.com/insta.gram" && r.label.as_deref() == Some("INSTAGRAM")));
    }
    
    #[test]
    fn test_youtube() {
        assert_eq!(classify_social_url("https://youtu.be/dQw4w9WgXcQ"), Some("YOUTUBE".to_string()));
        
        // Handle extraction for YouTube
        let res = extract_social_handles("Check out YT: @pewdiepie");
        assert!(res.iter().any(|r| r.value == "https://youtube.com/pewdiepie" && r.label.as_deref() == Some("YOUTUBE")));
    }
}
