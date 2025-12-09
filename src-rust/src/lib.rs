use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

pub mod pdf;
pub mod dedup;
pub mod search;
pub mod image_ops;
pub mod parser;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn debug_parse_layout(text: &str) -> JsValue {
    let columns = parser::layout::split_line_into_columns(text);
    serde_wasm_bindgen::to_value(&columns).unwrap()
}

#[wasm_bindgen]
pub fn parse_vcard(text: &str) -> JsValue {
    let result = parser::parse(text);
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! This message comes from Rust.", name)
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn load_street_index(fst_bytes: &[u8]) -> Result<(), JsValue> {
    #[cfg(target_arch = "wasm32")]
    {
        parser::streets::init_from_bytes(fst_bytes.to_vec())
            .map_err(|e| JsValue::from_str(&e))
    }
    
    #[cfg(not(target_arch = "wasm32"))]
    {
        Err(JsValue::from_str("load_street_index only available in WASM builds"))
    }
}
