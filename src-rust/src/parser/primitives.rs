use nom::{
    bytes::complete::{take_while, take_while1},
    character::complete::{char, space1},
    sequence::delimited,
    branch::alt,
    multi::many0,
    IResult,
};

// 1. Column Separator (> 2 spaces OR at least one TAB)
pub fn column_separator(input: &str) -> IResult<&str, &str> {
    let (input, spaces) = space1(input)?;
    
    // Logic: If plain spaces, need >= 3. If tab present, 1 is enough.
    let is_wide = spaces.len() >= 3;
    let has_tab = spaces.contains('\t');

    if is_wide || has_tab {
        Ok((input, spaces))
    } else {
        // Backtrack
        Err(nom::Err::Error(nom::error::Error::new(input, nom::error::ErrorKind::Space)))
    }
}

// 2. Garbage characters (Noise)
// e.g. " . - "
pub fn is_garbage_char(c: char) -> bool {
    c == '.' || c == '-' || c == ' ' || c == '|' || c == ':'
}

pub fn strip_garbage(input: &str) -> String {
    let trimmed = input.trim();
    let left_clean = trimmed.trim_start_matches(is_garbage_char);
    let right_clean = left_clean.trim_end_matches(is_garbage_char);
    right_clean.trim().to_string()
}

// 3. Label Detection (e.g. "Tel:", "Handy")
// Returns (Label, Rest of Line)
pub fn parse_label(input: &str) -> IResult<&str, &str> {
    // Basic implementation: Word followed by colon?
    // Or just known keywords.
    // For now, let's just create the file structure.
    Ok((input, "")) 
}
