pub mod types;
pub mod primitives;
pub mod layout;
pub mod email;
pub mod phone;
pub mod address;
pub mod name;
pub mod landline;
pub mod db;
pub mod streets;
pub mod street_tokens;
pub mod org;
pub mod title;
pub mod url;
pub mod name_parts;
pub mod social;

pub use types::*;

use crate::parser::types::VCardResult;

pub fn parse(text: &str) -> VCardResult {
    // 1. Layout Phase: Split weird columns
    // We flatten everything into a linear sequence of clean chunks.
    // This transforms "Street   Tel" into ["Street", "Tel"].
    let mut chunks = Vec::new();
    for line in text.lines() {
        let cols = layout::split_line_into_columns(line);
        chunks.extend(cols);
    }
    
    // 2. Extraction Phase (Independent)
    // We join chunks with newlines to simulate a "Clean Document" for Regexes that might span?
    // Actually our parsers mostly work on strings.
    // Address parser needs context (chunks sequence).
    
    // Address (Needs chunks to look back)
    let adr = address::extract_addresses(&chunks);
    
    // Email & Phone (Can run on the whole text or individual chunks)
    let mut tel = Vec::new();
    let mut email = Vec::new();
    let mut urls = Vec::new();
    let mut best_name: Option<types::Scored<String>> = None;
    
    // NEW: ORG and TITLE extraction
    let org = org::extract_orgs(&chunks);
    let title = title::extract_titles(&chunks);
    
    for chunk in &chunks {
        tel.extend(phone::extract_phones(chunk));
        email.extend(email::extract_emails(chunk));
        urls.extend(url::extract_urls(chunk));
        urls.extend(social::extract_social_handles(chunk));
        
        // Name Candidates
        if let Some(candidate) = name::parse_name(chunk) {
            // Pick best
            if best_name.as_ref().map_or(true, |curr| candidate.score > curr.score) {
                best_name = Some(candidate);
            }
        }
    }
    
    // Social Media Classification: Label all URLs (generic or social)
    for url in urls.iter_mut() {
        if let Some(label) = social::classify_social_url(&url.value) {
            url.label = Some(label);
        }
    }
    
    // 3. Deduplication: Remove exact duplicates from tel, email, urls
    use std::collections::HashSet;
    
    // Deduplicate phone numbers (by value)
    let mut seen_phones: HashSet<String> = HashSet::new();
    tel.retain(|phone| {
        let normalized = phone.value.chars()
            .filter(|c| c.is_ascii_digit())
            .collect::<String>();
        seen_phones.insert(normalized)
    });
    
    // Deduplicate emails (lowercase comparison)
    let mut seen_emails: HashSet<String> = HashSet::new();
    email.retain(|e| seen_emails.insert(e.value.to_lowercase()));
    
    // Deduplicate URLs (normalized comparison)
    let mut seen_urls: HashSet<String> = HashSet::new();
    urls.retain(|u| seen_urls.insert(u.value.to_lowercase()));
    
    // 3b. Email Domain → URL Inference
    // Extract domains from email addresses and infer URL if not a common mail provider
    let mail_providers: HashSet<&str> = [
        "gmail.com", "googlemail.com", "yahoo.com", "yahoo.de",
        "outlook.com", "hotmail.com", "live.com", "icloud.com",
        "gmx.de", "gmx.net", "gmx.at", "gmx.ch",
        "web.de", "t-online.de", "freenet.de", "arcor.de",
        "posteo.de", "mailbox.org", "protonmail.com", "proton.me",
        "aol.com", "zoho.com", "yandex.com", "mail.ru",
    ].iter().cloned().collect();
    
    for email_entry in &email {
        // Extract domain from email
        if let Some(at_pos) = email_entry.value.find('@') {
            let domain = &email_entry.value[at_pos + 1..];
            let domain_lower = domain.to_lowercase();
            
            // Check if it's NOT a mail provider
            if !mail_providers.contains(domain_lower.as_str()) {
                // Infer URL from domain
                let inferred_url = format!("https://{}", domain);
                let inferred_lower = inferred_url.to_lowercase();
                
                // Only add if not already present
                if !seen_urls.contains(&inferred_lower) {
                    seen_urls.insert(inferred_lower);
                    urls.push(Scored {
                        value: inferred_url,
                        score: 0.8, // High confidence from email domain
                        label: Some("URL".to_string()),
                        debug_info: "inferred_from_email".to_string(),
                    });
                }
            }
        }
    }
    
    // 4. Post-Processing: Context Awareness (PLZ <-> Phone Prefix)
    // If we have an Address with ZIP, and a Landline Phone, check if they match the same City.
    if let Some(address) = adr.first() {
        if let Some(zip) = &address.value.zip {
            for phone in &mut tel {
                // Only check if not already max score (e.g. mobile 0.95 or verified landline 1.0)
                // Actually, we want to Mark it even if already verified.
                
                // 1. Normalize Phone to get Prefix
                let raw_clean: String = phone.value.chars().filter(|c| c.is_ascii_digit() || *c == '+').collect();
                let normalized = if raw_clean.starts_with("+49") {
                    format!("0{}", &raw_clean[3..])
                } else if raw_clean.starts_with("0049") {
                    format!("0{}", &raw_clean[4..])
                } else {
                    raw_clean
                };

                // 2. Find Prefix
                if let Some(prefix) = landline::find_prefix(&normalized) {
                    // 3. Check Consistency with ZIP
                    if db::check_consistency(zip, prefix) {
                        phone.score = 1.0;
                        phone.debug_info.push_str(" + geo_match");
                        // If it was generic WORK, we are now SURE.
                    }
                }
            }
        }
    }
    
    // 4. Context-Aware Conflict Resolution
    // Remove phone numbers that are actually ZIP codes or other non-phone numbers
    
    // A. Collect ZIP codes from addresses
    let zip_codes: std::collections::HashSet<String> = adr.iter()
        .filter_map(|addr| addr.value.zip.clone())
        .collect();
    
    // B. Helper: Check if a string looks like a non-phone business ID
    fn is_business_id(text: &str) -> bool {
        let clean = text.to_uppercase().replace(" ", "").replace("-", "");
        
        // IBAN: 2 letters + 20 digits (German)
        if clean.len() == 22 && clean.starts_with("DE") {
            let rest = &clean[2..];
            if rest.chars().all(|c| c.is_ascii_digit()) {
                return true; // IBAN
            }
        }
        
        // USt-ID: DE + 9 digits
        if clean.len() == 11 && clean.starts_with("DE") {
            let rest = &clean[2..];
            if rest.chars().all(|c| c.is_ascii_digit()) {
                return true; // USt-ID
            }
        }
        
        // Handelsregister: HRB/HRA + numbers
        if clean.starts_with("HRB") || clean.starts_with("HRA") {
            return true;
        }
        
        // Common ID patterns: XXX-XXX-XXX (but not phone format)
        if text.contains("---") || text.contains("___") {
            return true;
        }
        
        false
    }
    
    // C. Filter out phone numbers that match exclusion patterns
    tel.retain(|phone| {
        // Clean phone number for comparison (remove all non-digits)
        let clean_phone: String = phone.value.chars()
            .filter(|c| c.is_ascii_digit())
            .collect();
        
        // Exclude if:
        // 1. Matches a ZIP code
        if zip_codes.contains(&clean_phone) {
            return false;
        }
        
        // 2. Too short to be a real phone (< 4 digits)
        if clean_phone.len() < 4 {
            return false;
        }
        
        // 3. Looks like a business ID
        if is_business_id(&phone.value) {
            return false;
        }
        
        true // Keep this phone number
    });
    
    // Name Splitting (Structure)
    let n_structure = if let Some(ref name) = best_name {
         Some(name_parts::parse_name_structure(&name.value))
    } else {
         None
    };

    VCardResult {
        fn_name: best_name,
        adr: adr,
        tel,
        email: email,
        urls: urls,
        org: org,
        title: title,
        n_structure: n_structure,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_integration_christel() {
        let input = "
Christel A. Holster . -

Tannenhof 76 d               Tel.: (040)608 47 828
D-22397 Hamburg     Handy: 0172/5169062
E-Mail: Christel.Holster@gmx.de
";
        let res = parse(input);

        // 1. Address
        assert_eq!(res.adr.len(), 1, "Should find 1 address");
        let a = &res.adr[0].value;
        assert_eq!(a.city.as_deref(), Some("Hamburg"));
        assert_eq!(a.zip.as_deref(), Some("22397"));
        assert_eq!(a.street.as_deref(), Some("Tannenhof 76 d"));

        // 2. Phones
        // Note: The ZIP "22397" might be picked up as a phone number with low score (0.5).
        // We only care about high-confidence phones (> 0.8).
        let valid_phones: Vec<_> = res.tel.iter().filter(|t| t.score > 0.8).collect();
        assert_eq!(valid_phones.len(), 2, "Should find 2 high-confidence phones");
        
        let landline = valid_phones.iter().find(|t| t.value.contains("608")).expect("Landline missing");
        assert_eq!(landline.label.as_deref(), Some("WORK"));
        
        let cell = res.tel.iter().find(|t| t.value.contains("0172")).expect("Cell missing");
        assert_eq!(cell.label.as_deref(), Some("CELL"));

        // 3. Email
        assert_eq!(res.email.len(), 1);
        assert_eq!(res.email[0].value, "Christel.Holster@gmx.de");
        
        // 4. Name
        assert!(res.fn_name.is_some(), "Name missing");
        assert_eq!(res.fn_name.as_ref().unwrap().value, "Christel A. Holster");
    }
    
    #[test]
    fn test_integration_ekta_vision() {
        // User's actual problem case - multi column layout
        let input = "
, Yury Romov                       EKTA Vision GmbH                 ,
Geschäftsführer                Lilienthalstr. 5                     
D - 34123 Kassel                       

Tel: +49 (0) 561 8907999 - 6
Fax: +49 (0) 561 89 07 999 - 4
E-Mail: y.romov@ektavision.de
Www.ektavision.de
";
        let res = parse(input);
        
        // Address should be found
        assert_eq!(res.adr.len(), 1, "Should find 1 address");
        let a = &res.adr[0].value;
        assert_eq!(a.city.as_deref(), Some("Kassel"), "City should be Kassel");
        assert_eq!(a.zip.as_deref(), Some("34123"), "ZIP should be 34123");
        assert_eq!(a.street.as_deref(), Some("Lilienthalstr. 5"), "Street should be Lilienthalstr. 5");
    }
}

pub use types::*;
pub use primitives::*;
pub use layout::*;
