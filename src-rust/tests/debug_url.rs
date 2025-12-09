#[cfg(test)]
mod debug_url_test {
    use core::parser::parse;
    
    #[test]
    fn test_ekta_vision_url() {
        let input = r#"
.. Yury Romov                       EKTA Vision GmbH                 ,
Geschäftsführer                Lilienthalstr. 5                     j
D - 34123 Kassel                       -

Tel: +49 (0) 561 890799 -6

Fax: +49 (0) 561 89 07 999 - 4
E-Mail: y.romov@ektavision.de
www. ektavision.de
        "#;
        
        let result = parse(input);
        
        println!("=== DEBUG URL TEST ===");
        println!("URLs found: {}", result.url.len());
        for (i, url) in result.url.iter().enumerate() {
            println!("  URL {}: {} (score: {}, debug: {})", 
                i+1, url.value, url.score, url.debug_info);
        }
        
        assert!(result.url.len() > 0, "No URLs found!");
        assert!(result.url.iter().any(|u| u.value.contains("ektavision")), 
            "ektavision.de not found in URLs");
    }
}
