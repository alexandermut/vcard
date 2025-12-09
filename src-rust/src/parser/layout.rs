use crate::parser::primitives::{column_separator, strip_garbage};
use nom::IResult;

pub fn split_line_into_columns(input: &str) -> Vec<String> {
    let mut columns = Vec::new();
    let mut remainder = input;
    
    // While we can find a separator...
    while let Ok((next_input, pre_sep)) = take_until_separator(remainder) {
        let clean = strip_garbage(pre_sep);
        if !clean.is_empty() {
             columns.push(clean);
        }
        // Skip the separator (consume it)
        if let Ok((after_sep, _)) = column_separator(next_input) {
            remainder = after_sep;
        } else {
            // Should be impossible if take_until found it, but safety break
            break; 
        }
    }
    
    // Last chunk
    let clean_last = strip_garbage(remainder);
    if !clean_last.is_empty() {
        columns.push(clean_last);
    }
    
    columns
}

// Helper: Consume chars until we see column_separator
fn take_until_separator(input: &str) -> IResult<&str, &str> {
    // This looks for strict 3-spaces or Tab separator
    // Use char_indices() to iterate over UTF-8 safe boundaries
    for (index, _) in input.char_indices() {
        // Check if separator starts here
        let slice = &input[index..];
        if let Ok(_) = column_separator(slice) {
             return Ok((slice, &input[0..index]));
        }
    }
    // No separator found, return entire input
    Ok(("", input))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_christels_horror_layout() {
        // "Christel A. Holster . -"
        // "Tannenhof 76 d               Tel.: (040)608 47 828"
        
        // 1. Name line
        let line1 = "Christel A. Holster . -";
        let cols1 = split_line_into_columns(line1);
        // Note: My primitive 'column_separator' needs 3 spaces.
        // " . -" might be separated by 1 space.
        // If so, it won't split.
        // But strip_garbage handles the end.
        // Result should be ["Christel A. Holster"]
        assert_eq!(cols1[0], "Christel A. Holster");

        // 2. Address line
        let line2 = "Tannenhof 76 d               Tel.: (040)608 47 828";
        let cols2 = split_line_into_columns(line2);
        assert_eq!(cols2.len(), 2);
        assert_eq!(cols2[0], "Tannenhof 76 d");
        assert_eq!(cols2[1], "Tel.: (040)608 47 828");
    }
}
