use crate::parser::types::Scored;
use std::collections::HashSet;
use std::sync::OnceLock;

// Simple database for Prototype
static FIRST_NAMES: OnceLock<HashSet<&'static str>> = OnceLock::new();
static TITLES: OnceLock<HashSet<&'static str>> = OnceLock::new();

fn get_first_names() -> &'static HashSet<&'static str> {
    FIRST_NAMES.get_or_init(|| {
        let raw = "Aaliyah|Aaron|Adam|Adrian|Alexander|Alfred|Alice|Andreas|Angela|Anna|Anne|Antonia|Arthur|Barbara|Ben|Benjamin|Bernhard|Bernd|Bettina|Bianca|Birgit|Brigitte|Carl|Carla|Carlos|Caroline|Carsten|Chantal|Charlotte|Christel|Christian|Christiane|Christina|Christine|Christoph|Claudia|Claus|Cornelia|Dagmar|Daniel|Daniela|David|Dennis|Dieter|Dietmar|Dirk|Dominik|Doris|Eberhard|Edith|Elisabeth|Elke|Ellen|Elfriede|Elias|Emil|Emily|Emma|Erich|Erik|Erika|Ernst|Erwin|Esther|Eva|Evelyn|Fabian|Felix|Florian|Frank|Franz|Franziska|Friedrich|Gabriele|Georg|Gerhard|Gertrud|Gisela|Gunnar|Günter|Hanna|Hannes|Hans|Harald|Heike|Heinrich|Heinz|Helga|Helmut|Herbert|Hermann|Holger|Horst|Hubert|Hugo|Ingo|Ingrid|Irene|Iris|Isabel|Jan|Jana|Jane|Janine|Jennifer|Jens|Jessica|Joachim|Johannes|John|Jolanthe|Jonas|Jonathan|Jörg|Josef|Julia|Julian|Juliane|Jürgen|Jutta|Kai|Karin|Karl|Karla|Karolin|Karsten|Katharina|Katja|Katrin|Kevin|Klaus|Konrad|Kristin|Kurt|Lara|Laura|Lea|Lena|Leon|Leonie|Lisa|Lothar|Luca|Lukas|Lutz|Manfred|Manuel|Manuela|Marc|Marcel|Marco|Marcus|Marek|Maria|Marianne|Mario|Marion|Mark|Markus|Martha|Martin|Martina|Mathias|Matthias|Max|Maximilian|Melanie|Michael|Michaela|Miriam|Monika|Moritz|Nadine|Nadja|Nicole|Niklas|Nils|Nina|Norbert|Ola|Olaf|Oliver|Olivia|Patrick|Paul|Paula|Peter|Petra|Philipp|Pia|Rainer|Ralf|Ralph|Ramona|Raphael|Rebecca|Regina|Reinhard|Renate|Rene|Richard|Rita|Robert|Roland|Rolf|Ronald|Rosemarie|Rudolf|Sabine|Sabrina|Sandra|Sara|Sarah|Sascha|Sebastian|Silke|Silvia|Simon|Simone|Sonja|Stefan|Stefanie|Steffen|Stephanie|Susanne|Susi|Sven|Svenja|Sylvia|Tanja|Thomas|Thorsten|Tim|Timo|Tobias|Tom|Torsten|Udo|Ulrich|Ulrike|Ursula|Ute|Uwe|Vanessa|Vera|Verena|Veronica|Veronika|Viktor|Viktoria|Volker|Walter|Waltraud|Werner|Wilhelm|Wolfgang|Yvonne|Zoe";
        raw.split('|').collect()
    })
}

fn get_titles() -> &'static HashSet<&'static str> {
    TITLES.get_or_init(|| {
        let mut s = HashSet::new();
        
        // Basic academic titles
        s.insert("Dr.");
        s.insert("Dr");
        s.insert("Prof.");
        s.insert("Prof");
        s.insert("Professor");
        
        // Specialized doctorates (German)
        s.insert("Dr. med.");
        s.insert("Dr. rer. nat.");
        s.insert("Dr. phil.");
        s.insert("Dr. jur.");
        s.insert("Dr. ing.");
        s.insert("Dr. h.c.");
        s.insert("Dr. mult.");
        
        // Combined titles
        s.insert("Prof. Dr.");
        s.insert("Prof. Dr. Dr.");
        
        // Professional titles (German)
        s.insert("Dipl.-Ing.");
        s.insert("Dipl.-Kfm.");
        s.insert("Dipl.-Inform.");
        s.insert("Dipl.-Wirtsch.-Ing.");
        s.insert("Dipl.-Psych.");
        
        // International
        s.insert("Ph.D.");
        s.insert("PhD");
        s.insert("M.D.");
        s.insert("MBA");
        s.insert("M.Sc.");
        s.insert("M.A.");
        s.insert("B.Sc.");
        s.insert("B.A.");
        
        s
    })
}

pub fn parse_name(input: &str) -> Option<Scored<String>> {
    let input = input.trim();
    if input.len() < 3 { return None; }
    
    // Heuristic: Must not contain digits (unless pure Roman numerals, but let's be strict first)
    if input.chars().any(|c| c.is_numeric()) {
        return None;
    }
    
    // Tokenize
    let tokens: Vec<&str> = input.split_whitespace().collect();
    if tokens.is_empty() { return None; }

    let first_names = get_first_names();
    let titles = get_titles();
    
    let mut score = 0.0;
    
    for token in &tokens {
        // Strip dots for matching? No, Titles have dots.
        // First names usually don't.
        let clean_token = token.replace(".", "");
        
        if first_names.contains(clean_token.as_str()) || first_names.contains(token) {
            score += 0.6; // Strong signal
        }
        
        if titles.contains(token) {
            score += 0.3;
        }
    }
    
    // Formatting Checks
    let is_capitalized = tokens.iter().all(|t| {
        let first = t.chars().next().unwrap_or(' ');
        first.is_uppercase() || !first.is_alphabetic() // Allow "(Spitzname)" or similar?
    });
    
    if is_capitalized {
        score += 0.2;
    }
    
    // Length check (2-4 words is typical for names)
    if tokens.len() >= 2 && tokens.len() <= 4 {
        score += 0.1;
    }
    
    if score > 0.0 {
        // Normalize score cap
        if score > 1.0 { score = 1.0; }
        
        return Some(Scored {
            value: input.to_string(),
            score,
            label: None,
            debug_info: "heuristic_name_db".to_string(),
        });
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_name_detection() {
        let input = "Christel A. Holster";
        let res = parse_name(input);
        assert!(res.is_some());
        let s = res.unwrap();
        assert_eq!(s.value, "Christel A. Holster");
        assert!(s.score >= 0.8); // 0.6 (Christel) + 0.2 (Caps) + 0.1 (Len 3) = 0.9
    }
    
    #[test]
    fn test_no_name() {
        let input = "Tannenhof 76 d"; // Has digits
        assert!(parse_name(input).is_none());
        
        let input2 = "Tel.: 040";
        assert!(parse_name(input2).is_none());
    }
}
