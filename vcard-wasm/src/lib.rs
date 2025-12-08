use wasm_bindgen::prelude::*;
use serde_json::Value;
use strsim::normalized_levenshtein;

#[wasm_bindgen]
pub fn rust_clean_string(input: &str) -> String {
    input.chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect()
}

#[wasm_bindgen]
pub fn rust_fuzzy_search(items_json: &str, query: &str) -> String {
    let items: Vec<Value> = match serde_json::from_str(items_json) {
        Ok(v) => v,
        Err(_) => return "[]".to_string(),
    };

    let query_lower = query.to_lowercase();
    let query_tokens: Vec<&str> = query_lower.split_whitespace().collect();
    let threshold = 0.45; // Slightly stricter but smarter

    let mut results: Vec<(f64, Value)> = items.into_iter()
        .filter_map(|item| {
            let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            let org = item.get("org").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            
            // 1. Exact substring check (Fast path)
            if name.contains(&query_lower) || org.contains(&query_lower) {
                return Some((1.0, item));
            }

            // 2. Token-based Fuzzy Check
            // We want to see if ANY query token matches ANY name/org token well.
            // Or if the WHOLE query matches ANY name/org token well.
            
            let name_tokens: Vec<&str> = name.split_whitespace().collect();
            let org_tokens: Vec<&str> = org.split_whitespace().collect();
            let all_tokens = [name_tokens, org_tokens].concat();

            let mut max_score = 0.0;

            // Strategy: 
            // If query is "Spunge", compare "Spunge" vs "Sponge", "Bob".
            // If query is "Spunge Bob", compare "Spunge" vs "Sponge"...
            
            // Check full query against tokens (e.g. query "Sponge" vs token "Sponge")
            for token in &all_tokens {
                let score = normalized_levenshtein(token, &query_lower);
                if score > max_score { max_score = score; }
            }

            // Also check individual query tokens against item tokens (Word-by-word match)
            if query_tokens.len() > 0 {
                let mut token_match_score = 0.0;
                 for q_token in &query_tokens {
                    let mut best_token_score = 0.0;
                    for i_token in &all_tokens {
                        let score = normalized_levenshtein(i_token, q_token);
                        if score > best_token_score { best_token_score = score; }
                    }
                    // Average the best scores for each query token? Or just take the best single match?
                    // Taking the best single match favors "guessing" one word right.
                    if best_token_score > token_match_score { token_match_score = best_token_score; }
                }
                if token_match_score > max_score { max_score = token_match_score; }
            }

            // Fallback: Full string comparison (for cases where tokens are merged or short)
             let full_score_name = normalized_levenshtein(&name, &query_lower);
             if full_score_name > max_score { max_score = full_score_name; }
             
             let full_score_org = normalized_levenshtein(&org, &query_lower);
             if full_score_org > max_score { max_score = full_score_org; }


            if max_score > threshold {
                Some((max_score, item))
            } else {
                None
            }
        })
        .collect();

    // Sort by score descending
    results.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    // Extract items
    let final_items: Vec<Value> = results.into_iter().map(|(_, item)| item).collect();

    serde_json::to_string(&final_items).unwrap_or("[]".to_string())
}
