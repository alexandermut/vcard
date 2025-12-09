use core::parser::parse;

#[test]
fn test_ekta_vision_exact_ocr() {
    let input = r#"TB HEN LP (Ka El 20 yai

7

, Yury Romov                       EKTA Vision GmbH                 ,
Geschäftsführer                Lilienthalstr. 5                     L
D - 34123 Kassel                       -

Tel: +49 (0) 561 8907999 - 6 +

Fax: +49 (0) 561 89 07 999 - 4
E-Mail: y.romov@ektavision.de
Www.ektavision.de
"#;

    let res = parse(input);
    
    println!("Parsed result: {:#?}", res);
    
    // Check address
    if res.adr.len() > 0 {
        println!("Address found:");
        println!("  Street: {:?}", res.adr[0].value.street);
        println!("  ZIP: {:?}", res.adr[0].value.zip);
        println!("  City: {:?}", res.adr[0].value.city);
    } else {
        println!("NO ADDRESS FOUND!");
    }
}
