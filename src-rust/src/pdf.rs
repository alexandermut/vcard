use wasm_bindgen::prelude::*;
use lopdf::{Document, Object, Stream};
use js_sys::Array;
use js_sys::Uint8Array;

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
        let content = doc.get_page_content(page_object_id).unwrap_or_default();
        // Naive approach: Look for XObject resources in the page dictionary
        // Better: lopdf has helpers for this? 
        // We will iterate ALL objects in the doc that are Images, because associating them to pages strictly is hard without a full renderer.
        // Wait, for a "Batch Upload", we usually want 1 Image per Page (Scan).
        // If the PDF is a scan, it usually has one big image per page.
        
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
                                         // In a real implementation we need to handle filters (FlateDecode, DCTDecode etc).
                                         // lopdf can decompress, but for JPEG (DCTDecode) we can just pass the raw bytes!
                                         // This is the huge speedup: Zero decoding if it's already a JPEG.
                                         
                                         if let Ok(filter) = stream.dict.get(b"Filter").and_then(|o| o.as_name()) {
                                             if filter == b"DCTDecode" {
                                                 // It's a JPEG. Pass through.
                                                 let js_bytes = Uint8Array::from(&stream.content[..]);
                                                 js_array.push(&js_bytes);
                                                 continue;
                                             }
                                         }
                                         
                                         // Fallback: Use 'image' crate to encode to PNG if raw bytes aren't usable directly
                                         // For now, let's assume Scanned PDFs are mostly JPEGs.
                                         // If re-encoding is needed, we'd use image::load_from_memory -> encode to png.
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

