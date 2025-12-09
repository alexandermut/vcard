use wasm_bindgen::prelude::*;
use image::{load_from_memory, ImageOutputFormat, DynamicImage};
use image::imageops::FilterType;
use std::io::Cursor;
use imageproc::contrast::adaptive_threshold;

// If imageproc is too heavy, we can do manual thresholding.
// For now let's try imageproc.

#[wasm_bindgen]
pub fn preprocess_scan(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    let mut img = load_from_memory(data)
        .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;

    // 0. Resize if too large (Max 2000px)
    // Tesseract works best at ~300 DPI (approx 2000px for card)
    if img.width() > 2000 || img.height() > 2000 {
        img = img.resize(2000, 2000, FilterType::Triangle);
    }

    // 1. Convert to Grayscale
    let gray = img.to_luma8();

    // 2. Adaptive Thresholding (Corrects lighting/shadows)
    let binary = adaptive_threshold(&gray, 10);

    // 3. Encode back to PNG
    let mut buffer = Cursor::new(Vec::new());
    // Convert GrayImage back to DynamicImage for encoding
    let output_img = DynamicImage::ImageLuma8(binary);
    
    output_img.write_to(&mut buffer, ImageOutputFormat::Png)
         .map_err(|e| JsValue::from_str(&format!("Failed to encode image: {}", e)))?;

    Ok(buffer.into_inner())
}

