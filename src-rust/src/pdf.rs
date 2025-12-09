use wasm_bindgen::prelude::*;
use lopdf::{Document, Object, Stream};
use js_sys::Array;
use js_sys::Uint8Array;
use image::{load_from_memory, ImageFormat};
use image::imageops::FilterType;
use std::io::Cursor;

#[wasm_bindgen]
pub fn get_pdf_page_count(data: &[u8]) -> Result<usize, JsValue> {
    let doc = Document::load_mem(data).map_err(|e| JsValue::from_str(&format!("Failed to load PDF: {}", e)))?;
    Ok(doc.get_pages().len())
}

#[wasm_bindgen]
pub fn extract_images(data: &[u8]) -> Result<Array, JsValue> {
    let mut doc = Document::load_mem(data).map_err(|e| JsValue::from_str(&format!("Failed to load PDF: {}", e)))?;
    let js_array = Array::new();

    for (_page_id, page_object_id) in doc.get_pages() {
        let _content = doc.get_page_content(page_object_id).unwrap_or_default();
       
        // Let's try to find the images referenced by the page.
        if let Ok(page_dict) = doc.get_object(page_object_id).and_then(|obj| obj.as_dict()) {
             if let Ok(resources) = page_dict.get(b"Resources").and_then(|obj| obj.as_dict()) {
                 if let Ok(xobjects) = resources.get(b"XObject").and_then(|obj| obj.as_dict()) {
                     for (_name, object_ref) in xobjects.iter() {
                         let id = match *object_ref {
                             Object::Reference(id) => id,
                             _ => continue, // Embedded XObject? Skip for now, assume Reference.
                         };
                         
                         if let Ok(obj) = doc.get_object(id) {
                             if let Ok(stream) = obj.as_stream() {
                                 if let Ok(subtype) = stream.dict.get(b"Subtype").and_then(|o| o.as_name()) {
                                     if subtype == b"Image" {
                                         // Found an image!
                                         
                                         // Check filter to see if it's already encoded (e.g. DCTDecode = JPEG)
                                         let is_jpeg = if let Ok(filter) = stream.dict.get(b"Filter").and_then(|o| o.as_name()) {
                                             filter == b"DCTDecode"
                                         } else { false };

                                         // To optimize, we load the image using `image` crate.
                                         // Note: This decodes it. If we want passthrough, we check dims first if possible?
                                         // `image` crate requires decoding to check dimensions usually unless we use a header reader.
                                         // For now: Decode, Check, Resize or Re-encode.
                                         
                                         // Optimization: If it's JPEG, we might want to skip decoding if file size is small?
                                         // But "scan" JPEGS are huge.
                                         
                                         if let Ok(img) = load_from_memory(&stream.content) {
                                             let (w, h) = (img.width(), img.height());
                                             
                                             // Threshold: 2500px or > 2MB (approx check)
                                             if w > 2500 || h > 2500 {
                                                 // Resize!
                                                 let resized = img.resize(2000, 2000, FilterType::Lanczos3);
                                                 
                                                 let mut buffer = Cursor::new(Vec::new());
                                                 // Write as JPEG with quality 80
                                                 if let Err(_) = resized.write_to(&mut buffer, ImageFormat::Jpeg) {
                                                      // Fallback to original if encoding fails
                                                      let js_bytes = Uint8Array::from(&stream.content[..]);
                                                      js_array.push(&js_bytes);
                                                      continue;
                                                 }
                                                 
                                                 let js_bytes = Uint8Array::from(buffer.get_ref().as_slice());
                                                 js_array.push(&js_bytes);
                                             } else {
                                                 // Small enough!
                                                 if is_jpeg {
                                                      // Zero copy (almost) - pass original bytes
                                                      let js_bytes = Uint8Array::from(&stream.content[..]);
                                                      js_array.push(&js_bytes);
                                                 } else {
                                                      // It was PNG or something else, pass raw bytes?
                                                      // Wait, if it was FlateDecode (PNG-like) inside PDF, standard browsers might not render it as Blob if we just dump raw bytes unless it is a valid PNG file structure.
                                                      // PDF 'FlateDecode' stream != PNG File. It lacks PNG headers.
                                                      // JPEG 'DCTDecode' stream == Valid JPEG File (usually).
                                                      
                                                      // So if it's NOT JPEG, we MUST re-encode to a web-friendly format (JPEG/PNG) using `image` crate.
                                                      
                                                      let mut buffer = Cursor::new(Vec::new());
                                                      // Convert everything to JPEG for consistency/size?
                                                      if let Ok(_) = img.write_to(&mut buffer, ImageFormat::Jpeg) {
                                                           let js_bytes = Uint8Array::from(buffer.get_ref().as_slice());
                                                           js_array.push(&js_bytes);
                                                      }
                                                 }
                                             }
                                         } else {
                                             // Failed to load via 'image' crate (maybe CMYK or weird PDF colorspace).
                                             // Fallback: If it claimed to be JPEG, try passing it raw.
                                             if is_jpeg {
                                                 let js_bytes = Uint8Array::from(&stream.content[..]);
                                                 js_array.push(&js_bytes);
                                             }
                                         }
                                     }
                                 }
                             }
                         }
                     }
                 }
             }
        }
    }

    Ok(js_array)
}


