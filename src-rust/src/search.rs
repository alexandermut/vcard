use wasm_bindgen::prelude::*;
use std::collections::{HashMap, HashSet};

#[wasm_bindgen]
pub struct SearchIndex {
    // Maps a word to a set of IDs that contain it.
    index: HashMap<String, Vec<String>>,
    // Maps an ID to its full content (optional, or just keep IDs)
    // For now, we only need to return IDs.
}

#[wasm_bindgen]
impl SearchIndex {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SearchIndex {
        SearchIndex {
            index: HashMap::new(),
        }
    }

    pub fn add(&mut self, id: String, name: String, org: String, keywords: String) {
        // Combine all searchable text
        let full_text = format!("{} {} {}", name, org, keywords).to_lowercase();
        
        // Simple tokenizer: split by whitespace and non-alphanumeric
        // We can optimize this later with a real tokenizer crate.
        let tokens: Vec<&str> = full_text.split_whitespace().collect();

        for token in tokens {
            // Trim punctuation
            let clean_token: String = token.chars()
                .filter(|c| c.is_alphanumeric())
                .collect();
            
            if !clean_token.is_empty() {
                // Add to index
                let entry = self.index.entry(clean_token).or_insert(Vec::new());
                if !entry.contains(&id) {
                    entry.push(id.clone());
                }
            }
        }
    }

    pub fn search(&self, query: String) -> String {
        let query = query.to_lowercase();
        let tokens: Vec<&str> = query.split_whitespace().collect();
        
        if tokens.is_empty() {
            return "[]".to_string();
        }

        // Result set (intersection of all token matches)
        let mut result_ids: Option<HashSet<String>> = None;

        for token in tokens {
            let clean_token: String = token.chars()
                .filter(|c| c.is_alphanumeric())
                .collect();
            
            if clean_token.is_empty() { continue; }

            // Find all IDs containing this token (Prefix search?)
            // Strict match vs Prefix: For "Mül", we want "Müller".
            // Naive approach: Iterate all keys. Slow?
            // Better: If we want prefix search, we need a Trie or BTree. HashMap is exact match.
            // Optimization for now: Linear scan of keys for prefix match (O(K), K=unique words).
            // With 20k contacts, maybe 100k unique words. Fast enough in Rust.
            
            let mut current_token_matches = HashSet::new();
            
            for (key, ids) in &self.index {
                // Substring match: 'contains' instead of 'starts_with'
                if key.contains(&clean_token) {
                    for id in ids {
                        current_token_matches.insert(id.clone());
                    }
                }
            }

            match result_ids {
                None => result_ids = Some(current_token_matches),
                Some(prev) => {
                    // Intersection (AND logic)
                    let intersection: HashSet<_> = prev.intersection(&current_token_matches).cloned().collect();
                    result_ids = Some(intersection);
                }
            }
        }

        match result_ids {
            Some(res) => {
                let list: Vec<String> = res.into_iter().collect();
                serde_json::to_string(&list).unwrap_or("[]".to_string())
            },
            None => "[]".to_string()
        }
    }

    pub fn clear(&mut self) {
        self.index.clear();
    }
}
