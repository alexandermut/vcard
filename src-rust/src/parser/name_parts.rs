use crate::parser::types::Scored;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::OnceLock;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct NameParts {
    pub family: String,
    pub given: String,
    pub middle: String,
    pub prefix: String, // Titles like Dr., Prof.
    pub suffix: String,
}

impl NameParts {
    pub fn to_string(&self) -> String {
        // VCard format: Family;Given;Middle;Prefix;Suffix
        format!("{};{};{};{};{}", 
            self.family, self.given, self.middle, self.prefix, self.suffix)
    }
}

// Database of particles that indicate start of Last Name
static PARTICLES: OnceLock<HashSet<&'static str>> = OnceLock::new();

fn get_particles() -> &'static HashSet<&'static str> {
    PARTICLES.get_or_init(|| {
        let mut s = HashSet::new();
        s.insert("von");
        s.insert("von der");
        s.insert("vom");
        s.insert("zu");
        s.insert("zur");
        s.insert("van");
        s.insert("de");
        s.insert("del");
        s.insert("da");
        s.insert("di");
        s.insert("du");
        s.insert("la");
        s.insert("le");
        s.insert("ter");
        s.insert("den");
        s.insert("der");
        // German nobility
        s.insert("freiherr");
        s.insert("baron");
        s.insert("graf");
        s
    })
}

// Reuse from name.rs or redefine here?
// Redefining relevant prefixes for structure parsing 
// (superset of academic titles + common salutations)
static PREFIXES: OnceLock<HashSet<&'static str>> = OnceLock::new();

fn get_prefixes() -> &'static HashSet<&'static str> {
    PREFIXES.get_or_init(|| {
        let mut s = HashSet::new();
        // Academic
        s.insert("dr.");
        s.insert("prof.");
        s.insert("dipl."); // Covers Dipl.-Ing. etc via partial match logic
        s.insert("ph.d.");
        s.insert("mag.");
        s
    })
}

pub fn parse_name_structure(full_name: &str) -> Scored<String> {
    let parts = split_name(full_name);
    
    // We reuse the score from the original extraction, usually 1.0 if it came from there
    // But here we return the VCard N string structure
    Scored {
        value: parts.to_string(),
        score: 1.0, 
        label: None,
        debug_info: format!("split_family:{}", parts.family),
    }
}

fn split_name(full_name: &str) -> NameParts {
    let tokens: Vec<&str> = full_name.split_whitespace().collect();
    let mut parts = NameParts::default();
    
    if tokens.is_empty() {
        return parts;
    }
    
    let particles = get_particles();
    let prefixes = get_prefixes();
    
    // 1. Extract Prefixes from the start
    let mut start_idx = 0;
    let mut prefix_buffer = Vec::new();
    
    while start_idx < tokens.len() {
        let t = tokens[start_idx];
        let t_lower = t.to_lowercase();
        
        // Simple check: strict match or starts with common prefix pattern
        let looks_like_prefix = prefixes.contains(t_lower.as_str()) ||
                                t.ends_with('.') || // Dr. Prof.
                                t_lower.starts_with("dipl") ||
                                t_lower == "mba" ||
                                t_lower == "herr" ||
                                t_lower == "frau";
                                
        if looks_like_prefix {
            prefix_buffer.push(t);
            start_idx += 1;
        } else {
            break;
        }
    }
    parts.prefix = prefix_buffer.join(" ");
    
    // Remaining tokens for Name
    let remaining = &tokens[start_idx..];
    if remaining.is_empty() {
        // Only prefixes?? e.g. "Prof. Dr." without name
        // Fallback: put last prefix as family name? No, invalid name.
        return parts;
    }
    
    // 2. Find Family Name start (particles)
    let mut family_start_idx = remaining.len() - 1; // Default to last word
    
    for (i, token) in remaining.iter().enumerate() {
        // Skip first word usually (Given Name), unles only 1 word remaining
        if i == 0 && remaining.len() > 1 {
            continue;
        }
        
        // Check particle
        let t_lower = token.to_lowercase();
        if particles.contains(t_lower.as_str()) {
            family_start_idx = i;
            break;
        }
    }
    
    // 3. Assign
    if family_start_idx == 0 {
         // Either single word name OR name starting with particle (e.g. "von Suttner" without first name?)
         // If remaining len > 1, assume whole thing is family?
         // E.g. "Von Suttner" -> Given="", Family="Von Suttner"
         parts.family = remaining.join(" ");
    } else {
        // Given Names are everything before family_start_idx
        let given_tokens = &remaining[..family_start_idx];
        
        // Handle Middle Name logic?
        // Simple: 1st word = Given. Rest = Middle.
        if given_tokens.len() > 1 {
            parts.given = given_tokens[0].to_string();
            parts.middle = given_tokens[1..].join(" ");
        } else {
            parts.given = given_tokens[0].to_string();
        }
        
        parts.family = remaining[family_start_idx..].join(" ");
    }
    
    parts
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_name() {
        let p = split_name("Max Mustermann");
        assert_eq!(p.given, "Max");
        assert_eq!(p.family, "Mustermann");
        assert_eq!(p.prefix, "");
    }

    #[test]
    fn test_titles() {
        let p = split_name("Prof. Dr. med. Max Mustermann");
        assert_eq!(p.prefix, "Prof. Dr. med.");
        assert_eq!(p.given, "Max");
        assert_eq!(p.family, "Mustermann");
    }

    #[test]
    fn test_particles() {
        let p = split_name("Max von Mustermann");
        assert_eq!(p.given, "Max");
        assert_eq!(p.family, "von Mustermann");
        
        let p2 = split_name("Max Freiherr von Mustermann");
        assert_eq!(p2.given, "Max");
        // "Freiherr" is in particles list
        assert_eq!(p2.family, "Freiherr von Mustermann");
    }

    #[test]
    fn test_middle_name() {
        let p = split_name("Max Maria Mustermann");
        assert_eq!(p.given, "Max");
        assert_eq!(p.middle, "Maria");
        assert_eq!(p.family, "Mustermann");
    }
    
    #[test]
    fn test_dipl_ing() {
        let p = split_name("Dipl.-Ing. Max Power");
        assert_eq!(p.prefix, "Dipl.-Ing.");
        assert_eq!(p.given, "Max");
        assert_eq!(p.family, "Power");
    }
}
