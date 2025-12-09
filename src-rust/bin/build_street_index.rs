use csv::ReaderBuilder;
use fst::{SetBuilder, Error};
use std::collections::HashSet;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::Path;

fn normalize_street_name(name: &str) -> String {
    // Remove surrounding quotes (CSV artifact)
    let trimmed = name.trim().trim_matches('"').trim();
    
    // Lowercase for case-insensitive matching
    trimmed.to_lowercase()
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🏗️  Building Street Index (FST)...");
    
    let csv_path = "../public/streets.csv";
    let output_path = "../public/streets.fst";
    
    if !Path::new(csv_path).exists() {
        eprintln!("❌ Error: {} not found", csv_path);
        std::process::exit(1);
    }
    
    println!("📖 Reading CSV...");
    let file = File::open(csv_path)?;
    let mut rdr = ReaderBuilder::new()
        .has_headers(true)
        .from_reader(file);
    
    let mut street_names = HashSet::new();
    let mut processed = 0;
    
    for result in rdr.records() {
        let record = result?;
        
        // Column 0 is "Name"
        if let Some(name) = record.get(0) {
            if !name.is_empty() {
                let normalized = normalize_street_name(name);
                if !normalized.is_empty() {
                    street_names.insert(normalized);
                }
            }
        }
        
        processed += 1;
        if processed % 100_000 == 0 {
            println!("   Processed {} records...", processed);
        }
    }
    
    println!("✅ Extracted {} unique street names from {} records", 
             street_names.len(), processed);
    
    // Sort for FST building
    println!("🔄 Sorting...");
    let mut sorted_streets: Vec<String> = street_names.into_iter().collect();
    sorted_streets.sort();
    
    println!("🔨 Building FST...");
    let output_file = BufWriter::new(File::create(output_path)?);
    let mut build = SetBuilder::new(output_file)?;
    
    for (i, street) in sorted_streets.iter().enumerate() {
        build.insert(street.as_bytes())?;
        
        if (i + 1) % 100_000 == 0 {
            println!("   Added {} entries...", i + 1);
        }
    }
    
    build.finish()?;
    
    // Get file size
    let metadata = std::fs::metadata(output_path)?;
    let size_mb = metadata.len() as f64 / 1_024_000.0;
    
    println!("✨ FST built successfully!");
    println!("   Output: {}", output_path);
    println!("   Size: {:.2} MB", size_mb);
    println!("   Entries: {}", sorted_streets.len());
    println!("   Compression: {:.1}%", (1.0 - size_mb / 53.0) * 100.0);
    
    Ok(())
}
