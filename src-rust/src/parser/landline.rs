use std::collections::HashSet;
use std::sync::OnceLock;

static LANDLINE_PREFIXES: OnceLock<HashSet<&'static str>> = OnceLock::new();

// Embed the raw TS file content
const RAW_TS: &str = include_str!("../../../utils/landlinePrefixes.ts");

fn get_landline_prefixes() -> &'static HashSet<&'static str> {
    LANDLINE_PREFIXES.get_or_init(|| {
        let mut set = HashSet::new();
        
        // 1. Find the Array brackets
        if let Some(start) = RAW_TS.find('[') {
            if let Some(end) = RAW_TS[start..].find(']') {
                let array_str = &RAW_TS[start+1..start+end];
                
                // 2. Split and clean
                // Format: "0123", "0456", ...
                for part in array_str.split(',') {
                    let cleaned = part.trim().trim_matches('"').trim();
                    if !cleaned.is_empty() {
                        set.insert(cleaned);
                    }
                }
            }
        }
        
        // Fallbacks if parsing fails (shouldn't happen)
        if set.is_empty() {
            set.insert("030"); // Berlin
            set.insert("040"); // Hamburg
            set.insert("089"); // Munich
            set.insert("069"); // Frankfurt
        }
        
        set
    })
}

pub fn is_landline_prefix(prefix: &str) -> bool {
    let set = get_landline_prefixes();
    set.contains(prefix)
}

// Utility to find if a number starts with ANY valid landline prefix
// Returns the matching prefix if any.
pub fn find_prefix(number: &str) -> Option<&str> {
    // Check increasing lengths from 3 to 6
    // Prefixes are usually 3 to 5 chars (030 to 0xxxxx)
    for len in 3..=6 {
        if number.len() >= len {
            let candidate = &number[0..len];
            if is_landline_prefix(candidate) {
                return Some(candidate);
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parsing_embedded_file() {
        let set = get_landline_prefixes();
        assert!(set.len() > 1000, "Should have parsed > 1000 prefixes, got {}", set.len());
        assert!(set.contains("030")); // Berlin
        assert!(set.contains("040")); // Hamburg
        assert!(set.contains("033203")); // Something from the list start
    }

    #[test]
    fn test_find_prefix() {
        assert_eq!(find_prefix("030123456"), Some("030"));
        assert_eq!(find_prefix("040608"), Some("040"));
        assert_eq!(find_prefix("0172555"), None); // Mobile is NOT in landline list
    }
}
