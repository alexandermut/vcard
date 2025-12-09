use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Scored<T> {
    pub value: T,
    pub score: f32, // 0.0 to 1.0
    pub label: Option<String>, // e.g. "WORK", "CELL"
    pub debug_info: String, // e.g. "matched via nom_column_split"
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ParsedAddress {
    pub street: Option<String>,
    pub city: Option<String>,
    pub zip: Option<String>,
    pub country: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct VCardResult {
    pub fn_name: Option<Scored<String>>,
    pub n_structure: Option<Scored<String>>, // Family;Given;...
    pub tel: Vec<Scored<String>>,
    pub email: Vec<Scored<String>>,
    pub url: Vec<Scored<String>>,
    pub adr: Vec<Scored<ParsedAddress>>,
    pub org: Vec<Scored<String>>,
    pub title: Vec<Scored<String>>,
}
