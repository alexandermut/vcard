#[cfg(test)]
mod user_test {
    use core::parser::parse;
    
    #[test]
    fn test_user_exact_input() {
        let input = r#"Le N Son a imfad 0 Tei A

f ze

.. Yury Romov                       EKTA Vision GmbH                 ,
Geschäftsführer                Lilienthalstr. 5                     j
D - 34123 Kassel                       -

Tel: +49 (0) 561 890799 -6

Fax: +49 (0) 561 89 07 999 - 4
E-Mail: y.romov@ektavision.de
www. ektavision.de
"#;
        
        let result = parse(input);
        
        println!("\n=== USER INPUT TEST ===");
        println!("Name: {:?}", result.fn_name);
        println!("\nORG: {} items", result.org.len());
        for (i, org) in result.org.iter().enumerate() {
            println!("  ORG {}: {} (score: {})", i+1, org.value, org.score);
        }
        
        println!("\nTITLE: {} items", result.title.len());
        for (i, title) in result.title.iter().enumerate() {
            println!("  TITLE {}: {} (score: {})", i+1, title.value, title.score);
        }
        
        println!("\nURLs: {} items", result.url.len());
        for (i, url) in result.url.iter().enumerate() {
            println!("  URL {}: {} (score: {}, debug: {})", i+1, url.value, url.score, url.debug_info);
        }
        
        println!("\nPhones: {} items", result.tel.len());
        for (i, tel) in result.tel.iter().enumerate() {
            // Note: Phone numbers are normalized in the 'value' field by the parser
            println!("  TEL {}: {} (label: {:?})", i+1, tel.value, tel.label);
        }
        
        println!("\nEmails: {} items", result.email.len());
        for (i, email) in result.email.iter().enumerate() {
            println!("  EMAIL {}: {}", i+1, email.value);
        }
        
        println!("\nAddresses: {} items", result.adr.len());
        for (i, adr) in result.adr.iter().enumerate() {
            println!("  ADR {}: {:?} {:?} {:?}", i+1, adr.value.street, adr.value.zip, adr.value.city);
        }
        
        // Assertions
        assert!(result.url.len() > 0, "No URLs found!");
        // We expect at least one version of the URL (either inferred or from text)
        assert!(result.url.iter().any(|u| u.value.contains("ektavision")), "ektavision.de not in URLs");
        
        // Assert Phone normalization
        // Input: +49 (0) 561 890799 -6
        // Expected: +495618907996 (cleaned)
        assert!(result.tel.iter().any(|p| p.value == "+495618907996"), "Phone (TEL) normalization failed: {:?}", result.tel);
        
        // Input: Fax: +49 (0) 561 89 07 999 - 4
        // Expected: +4956189079994
        assert!(result.tel.iter().any(|p| p.value == "+4956189079994"), "Phone (FAX) normalization failed: {:?}", result.tel);
    }
}
