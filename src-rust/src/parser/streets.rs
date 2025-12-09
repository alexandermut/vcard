use fst::{Set, SetBuilder};
use std::sync::OnceLock;

static STREET_INDEX: OnceLock<Set<Vec<u8>>> = OnceLock::new();

// Embed the FST file at compile time
// Note: For production, you might want to load this dynamically
// to keep WASM size small. For now, we'll create a stub.
const FST_DATA: &[u8] = &[]; // Will be populated later

fn get_street_index() -> &'static Set<Vec<u8>> {
    STREET_INDEX.get_or_init(|| {
        // For WASM, we can't easily embed the 3MB file without bloating the bundle
        // Instead, we'll implement dynamic loading in the next step
        // For now, return an empty set
        if FST_DATA.is_empty() {
            // Build a valid empty FST
            let mut builder = SetBuilder::memory();
            let bytes = builder.into_inner().expect("Failed to finalize empty FST");
            Set::new(bytes).expect("Failed to create Set from empty FST")
        } else {
            Set::new(FST_DATA.to_vec()).expect("Failed to load FST")
        }
    })
}

// Normalize street name for FST lookup (same as build script)
fn normalize_for_fst(name: &str) -> String {
    name.trim()
        .trim_matches('"')
        .trim()
        .to_lowercase()
}

pub fn is_valid_street(name: &str) -> bool {
    if name.is_empty() {
        return false;
    }
    
    let normalized = normalize_for_fst(name);
    let index = get_street_index();
    index.contains(normalized.as_bytes())
}

// Try multiple variations of a street name to handle OCR errors
pub fn find_street_fuzzy(name: &str) -> bool {
    if name.is_empty() || name.len() < 3 {
        return false;
    }
    
    // Try exact match first
    if is_valid_street(name) {
        return true;
    }
    
    // Try common variations
    let variations = vec![
        name.to_string(),
        format!("{}.", name),  // Add dot
        format!("{}straße", name),  // Add "straße"
        format!("{}strasse", name),  // Add "strasse"
        format!("{}str.", name),  // Add "str."
        format!("{}str", name),  // Add "str"
        name.trim_end_matches('.').to_string(),  // Remove dot
        name.trim_end_matches("straße").to_string(),  // Remove suffix
        name.trim_end_matches("strasse").to_string(),
        name.trim_end_matches("str.").to_string(),
        name.trim_end_matches("str").to_string(),
    ];
    
    for variant in variations {
        if is_valid_street(&variant) {
            return true;
        }
    }
    
    false
}

// For non-WASM builds (native), we can load from file
#[cfg(not(target_arch = "wasm32"))]
pub fn load_from_file(path: &str) -> Result<(), Box<dyn std::error::Error>> {
    use std::fs;
    let data = fs::read(path)?;
    let set = Set::new(data)?;
    STREET_INDEX.set(set).map_err(|_| "Already initialized")?;
    Ok(())
}

// For WASM builds: Initialize from bytes (fetched by JavaScript)
#[cfg(target_arch = "wasm32")]
pub fn init_from_bytes(data: Vec<u8>) -> Result<(), String> {
    let set = Set::new(data).map_err(|e| format!("FST parse error: {:?}", e))?;
    STREET_INDEX.set(set).map_err(|_| "FST already initialized".to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore] // Only works after FST is loaded
    fn test_street_validation() {
        // Load FST from file in test
        #[cfg(not(target_arch = "wasm32"))]
        {
            let _ = load_from_file("../public/streets.fst");
        }
        
        // These tests assume FST is loaded
        assert!(is_valid_street("hauptstraße"));
        assert!(is_valid_street("Hauptstraße")); // Case insensitive
        assert!(!is_valid_street(""));
        assert!(!is_valid_street("ThisIsNotARealStreet"));
    }
    
    #[test]
    #[ignore]
    fn test_fuzzy_matching() {
        #[cfg(not(target_arch = "wasm32"))]
        {
            let _ = load_from_file("../public/streets.fst");
        }
        
        // Should find "Hauptstraße" even with variations
        assert!(find_street_fuzzy("Haupt"));  // Partial
        assert!(find_street_fuzzy("Hauptstr"));  // Without suffix
        assert!(find_street_fuzzy("Hauptstr."));  // With dot
    }
}
