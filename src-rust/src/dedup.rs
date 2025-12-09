use wasm_bindgen::prelude::*;
use js_sys::Array;

// Standard Levenshtein distance
fn levenshtein(a: &str, b: &str) -> usize {
    let len_a = a.chars().count();
    let len_b = b.chars().count();
    
    if len_a == 0 { return len_b; }
    if len_b == 0 { return len_a; }

    let mut matrix: Vec<Vec<usize>> = vec![vec![0; len_b + 1]; len_a + 1];

    for i in 0..=len_a { matrix[i][0] = i; }
    for j in 0..=len_b { matrix[0][j] = j; }

    for (i, char_a) in a.chars().enumerate() {
        for (j, char_b) in b.chars().enumerate() {
            let cost = if char_a == char_b { 0 } else { 1 };
            matrix[i + 1][j + 1] = std::cmp::min(
                std::cmp::min(matrix[i][j + 1] + 1, matrix[i + 1][j] + 1),
                matrix[i][j] + cost,
            );
        }
    }

    matrix[len_a][len_b]
}

// Normalized Similarity (0.0 to 1.0)
fn similarity(a: &str, b: &str) -> f64 {
    let max_len = std::cmp::max(a.chars().count(), b.chars().count());
    if max_len == 0 { return 1.0; }
    let dist = levenshtein(a, b);
    1.0 - (dist as f64 / max_len as f64)
}

#[wasm_bindgen]
pub fn find_duplicate(candidate: &str, valid_history_strings: Array) -> Option<usize> {
    // Convert JS Array of strings to Rust Vec<String>
    // Iterating JS array in Rust is slightly costly but faster than JS-side loop for heavy logic
    
    // Naive implementation: Iterate all.
    // Optimization: Early exit if exact match?
    // Optimization: Length check?
    
    for (index, item) in valid_history_strings.iter().enumerate() {
        if let Some(history_str) = item.as_string() {
             // Check exact match first
             if candidate == history_str {
                 return Some(index);
             }
             
             // Check similarity (> 0.95)
             // Only calculate Levenshtein if lengths are close
             let len_diff = (candidate.len() as isize - history_str.len() as isize).abs();
             if len_diff < 5 { // Optimization
                 let sim = similarity(candidate, &history_str);
                 if sim > 0.95 {
                     return Some(index);
                 }
             }
        }
    }
    
    None
}
