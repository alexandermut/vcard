import { CITIES_PATTERN } from './cities';
import { VCardData } from '../types';
import { parseGermanAddress } from './addressParser';
import { findNumbers } from 'libphonenumber-js';
import { getMobileRegexPattern } from './mobilePrefixes';
import { germanLandlinePrefixes } from './landlinePrefixes';
import { landlineMap, plzMap } from './landlineData';
import { parseInternationalAddress } from './addressParserIntl';
import { parseComplexName } from './nameParserIntl';
import { detectAnchors, AnchorMatch } from './anchorDetection';
import { scoreCandidate } from './contextInference';

// --- Types ---

interface Line {
  original: string;
  clean: string;
  isConsumed: boolean;
  type?: 'EMAIL' | 'PHONE' | 'URL' | 'ADDRESS' | 'JOB' | 'META' | 'ORG' | 'NAME' | null;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
  anchors?: AnchorMatch[]; // Phase 2: Anchor Detection
}

interface ParserData {
  fn: string;
  n: string;
  org: string;
  title: string;
  tel: { type: string; value: string }[];
  email: { type: string; value: string }[];
  url: { type: string; value: string }[];
  adr: { type: string; value: string }[];
  note: string[];
}

// --- Constants ---

// Common list of names for regex matching
const VORNAMEN_PATTERN = "(?:Aaliyah|Aaron|Adam|Adrian|Alexander|Alfred|Alice|Andreas|Angela|Anna|Anne|Antonia|Arthur|Barbara|Ben|Benjamin|Bernhard|Bernd|Bettina|Bianca|Birgit|Brigitte|Carl|Carla|Carlos|Caroline|Carsten|Chantal|Charlotte|Christian|Christiane|Christina|Christine|Christoph|Claudia|Claus|Cornelia|Dagmar|Daniel|Daniela|David|Dennis|Dieter|Dietmar|Dirk|Dominik|Doris|Eberhard|Edith|Elisabeth|Elke|Ellen|Elfriede|Elias|Emil|Emily|Emma|Erich|Erik|Erika|Ernst|Erwin|Esther|Eva|Evelyn|Fabian|Felix|Florian|Frank|Franz|Franziska|Friedrich|Gabriele|Georg|Gerhard|Gertrud|Gisela|Gunnar|Günter|Hanna|Hannes|Hans|Harald|Heike|Heinrich|Heinz|Helga|Helmut|Herbert|Hermann|Holger|Horst|Hubert|Hugo|Ingo|Ingrid|Irene|Iris|Isabel|Jan|Jana|Jane|Janine|Jennifer|Jens|Jessica|Joachim|Johannes|John|Jolanthe|Jonas|Jonathan|Jörg|Josef|Julia|Julian|Juliane|Jürgen|Jutta|Kai|Karin|Karl|Karla|Karolin|Karsten|Katharina|Katja|Katrin|Kevin|Klaus|Konrad|Kristin|Kurt|Lara|Laura|Lea|Lena|Leon|Leonie|Lisa|Lothar|Luca|Lukas|Lutz|Manfred|Manuel|Manuela|Marc|Marcel|Marco|Marcus|Marek|Maria|Marianne|Mario|Marion|Mark|Markus|Martha|Martin|Martina|Mathias|Matthias|Max|Maximilian|Melanie|Michael|Michaela|Miriam|Monika|Moritz|Nadine|Nadja|Nicole|Niklas|Nils|Nina|Norbert|Ola|Olaf|Oliver|Olivia|Patrick|Paul|Paula|Peter|Petra|Philipp|Pia|Rainer|Ralf|Ralph|Ramona|Raphael|Rebecca|Regina|Reinhard|Renate|Rene|Richard|Rita|Robert|Roland|Rolf|Ronald|Rosemarie|Rudolf|Sabine|Sabrina|Sandra|Sara|Sarah|Sascha|Sebastian|Silke|Silvia|Simon|Simone|Sonja|Stefan|Stefanie|Steffen|Stephanie|Susanne|Susi|Sven|Svenja|Sylvia|Tanja|Thomas|Thorsten|Tim|Timo|Tobias|Tom|Torsten|Udo|Ulrich|Ulrike|Ursula|Ute|Uwe|Vanessa|Vera|Verena|Veronica|Veronika|Viktor|Viktoria|Volker|Walter|Waltraud|Werner|Wilhelm|Wolfgang|Yvonne|Zoe)\\b";

// --- Helpers ---

export const clean_number = (number: string): string => {
  let cleaned = number.toString();
  cleaned = cleaned.replace(/[a-zA-Z]/g, ""); // Remove letters
  cleaned = cleaned.replace(/:/g, " ");
  cleaned = cleaned.replace(/\+\s/, "+");
  cleaned = cleaned.replace(/\(0\)/g, "");
  cleaned = cleaned.replace(/[\-._\|\\\/\(\)\[\]\(\)\{\}]+/g, " ");
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  return cleaned.trim();
};

const trim_whitespace_begin_end = (x: string) => {
  return x.replace(/^\s+|\s+$/gm, '');
}

// --- Extractors ---

const consumeMeta = (lines: Line[]) => {
  const metaPatterns = [
    /sent from my/i,
    /von meinem.*gesendet/i,
    /datenschutz/i,
    /confidential/i,
    /vertraulich/i,
    /disclaimer/i,
    /please consider the environment/i,
    /bitte denken sie an die umwelt/i,
    /^home$/i,
    /^about us$/i,
    /^login$/i,
    /^impressum$/i,
    /^kontakt$/i,
    /^herausgeber:?$/i,
    /^anschrift:?$/i
  ];

  lines.forEach(line => {
    if (line.isConsumed) return;
    if (metaPatterns.some(p => p.test(line.clean))) {
      line.isConsumed = true;
      line.type = 'META';
    }
  });
};

const consumeEmails = (lines: Line[], data: ParserData) => {
  // Expanded regex to handle spaced [at] and dots
  // e.g. "name [at] domain . com"
  // Relaxed to allow spaces around @ and .
  // Simplified to capture "word @ word . word" pattern
  const re_email = /([a-zA-Z0-9_.+-]+)\s*(?:@|\[\s*at\s*\]|\(\s*at\s*\))\s*([a-zA-Z0-9-]+\s*(?:\.|\[\s*dot\s*\]|\(\s*dot\s*\))\s*[a-zA-Z0-9-.]+)/gi;
  const genericProviders = [
    'gmail.com', 'googlemail.com', 'gmx.de', 'gmx.net', 'web.de',
    'yahoo.com', 'yahoo.de', 'hotmail.com', 'outlook.com', 'outlook.de',
    'live.com', 'icloud.com', 'me.com', 't-online.de', 'aol.com', 'protonmail.com'
  ];

  lines.forEach(line => {
    if (line.isConsumed) return;

    const matches = line.clean.match(re_email);
    if (matches) {
      matches.forEach(email => {
        // Normalize (at) -> @ and remove spaces around dots
        let cleanEmail = email.replace(/\s*(?:\[\s*at\s*\]|\(\s*at\s*\))\s*/i, '@');
        cleanEmail = cleanEmail.replace(/\s*(?:\[\s*dot\s*\]|\(\s*dot\s*\))\s*/i, '.');
        cleanEmail = cleanEmail.replace(/\s+/g, ''); // Remove remaining spaces (e.g. "domain . com")
        cleanEmail = cleanEmail.replace(/\.c0m$/i, '.com'); // Fix common OCR error
        data.email.push({ type: 'WORK,INTERNET', value: cleanEmail });

        // Also extract web from domain if not generic
        const domain = cleanEmail.split('@')[1];
        if (!genericProviders.includes(domain.toLowerCase())) {
          // Only add if we don't have a URL yet or it's a new one
          const url = `www.${domain}`;
          if (!data.url.some(u => u.value.includes(domain))) {
            data.url.push({ type: 'WORK', value: url });
          }
        }
      });
      line.isConsumed = true;
      line.type = 'EMAIL';
    }
  });
};

const consumeUrls = (lines: Line[], data: ParserData) => {
  // Relaxed regex to capture github.com, youtube.com etc. without www
  // We rely on the fact that emails are already consumed.
  const re_www = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(?:\/[^\s]*)?/gi;

  lines.forEach(line => {
    // ✅ FIX: Skip EMAIL lines completely to prevent extracting URLs from email usernames
    // Email usernames like "info.company@example.com" could be misidentified as "info.company" URL
    if (line.isConsumed) return;

    const matches = line.clean.match(re_www);
    if (matches) {
      matches.forEach(url => {
        // Clean url
        let cleanUrl = url;
        if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;

        // Check for social media
        let type = 'WORK';
        const lower = cleanUrl.toLowerCase();
        if (lower.includes('linkedin')) type = 'LINKEDIN';
        else if (lower.includes('xing')) type = 'XING';
        else if (lower.includes('twitter') || lower.includes('x.com')) type = 'TWITTER';
        else if (lower.includes('facebook')) type = 'FACEBOOK';
        else if (lower.includes('instagram')) type = 'INSTAGRAM';
        else if (lower.includes('github')) type = 'GITHUB';
        else if (lower.includes('gitlab')) type = 'GITLAB';
        else if (lower.includes('stackoverflow')) type = 'STACKOVERFLOW';
        else if (lower.includes('youtube')) type = 'YOUTUBE';
        else if (lower.includes('twitch')) type = 'TWITCH';
        else if (lower.includes('tiktok')) type = 'TIKTOK';
        else if (lower.includes('medium')) type = 'MEDIUM';

        // Check for duplicates (ignore protocol and www for comparison)
        const normalizeForCheck = (u: string) => u.replace(/^https?:\/\/(?:www\.)?/, '').replace(/\/$/, '');
        const currentNormalized = normalizeForCheck(cleanUrl);

        const isDuplicate = data.url.some(existing => {
          return normalizeForCheck(existing.value) === currentNormalized;
        });

        if (!isDuplicate) {
          data.url.push({ type, value: cleanUrl });
        }
      });
      line.isConsumed = true;
      line.type = 'URL';
    }
  });
};

// Heuristic: Looks like a name?
// Allow noble particles (von, van, de, du, da, di, der, den)
// e.g. "Hans von der Wiese"
const isName = (str: string) => {
  if (str.length < 3) return false;
  // Assuming re_forbidden is defined elsewhere or will be added.
  // For now, commenting out to avoid error if not defined.
  // if (re_forbidden.test(str)) return false;
  // Must have at least one capitalized word
  if (!/[A-ZÄÖÜ]/.test(str)) return false;
  // Allow words starting with lowercase if they are particles
  const words = str.split(/\s+/);
  const particles = /^(von|van|de|du|da|di|der|den|le|la)$/i;
  const validWords = words.every(w => {
    return /^[A-ZÄÖÜ]/.test(w) || particles.test(w) || /^(Dr\.|Prof\.|Dipl\.|Mag\.|Ing\.)$/.test(w) || w.includes('-');
  });

  // Exclude common non-name words that might look like names
  // Check first word for particles/common starts
  if (/^(Ihr|Dein|Euer|Unser|Das|Die|Der|Team|Service|Info|Kontakt|Web|Mail|Tel|Fax)$/i.test(words[0])) {
    return false;
  }
  // Check ANY word for specific business terms
  if (words.some(w => /^(Startup|GmbH|AG|Inc|Ltd)$/i.test(w))) {
    return false;
  }
  // console.log(`DEBUG isName: "${str}" -> validWords=${validWords}`);
  // return validWords; // Too strict?
  // Let's just check if it LOOKS like a name (mostly capitalized words or particles)
  const capitalizedCount = words.filter(w => /^[A-ZÄÖÜ]/.test(w)).length;
  // Must have at least 2 words (First Last) or particles
  const hasSpace = words.length >= 2;
  const result = capitalizedCount >= 1 && !/\d/.test(str) && hasSpace;

  if (str.includes('Prof') || str.includes('Schlossallee')) {
    // console.log(`DEBUG isName: "${str}" -> result=${result}, cap=${capitalizedCount}, validWords=${validWords}, hasSpace=${hasSpace}, noDigit=${!/\d/.test(str)}`);
  }
  return result;
};

const consumePhones = (lines: Line[], data: ParserData) => {
  lines.forEach(line => {
    if (line.isConsumed && line.type !== 'EMAIL' && line.type !== 'URL') return;

    // OCR Correction for Phone Numbers
    // If line looks like phone (has "Tel", "Fax", "Mobil" or +), try to fix common OCR errors
    let lineForPhone = line.clean;
    if (/Tel|Fax|Mobil|Phon|Cell|\+/i.test(lineForPhone)) {
      // Replace 'l' or 'I' with '1' inside potential number blocks
      // This is risky, so we only do it if we see other digits
      lineForPhone = lineForPhone.replace(/([0-9\s\+])([lI])([0-9\s])/g, '$11$3');
      // Replace 'O' with '0'
      lineForPhone = lineForPhone.replace(/([0-9\s\+])(O)([0-9\s])/g, '$10$3');
    }

    // Use libphonenumber-js to find numbers in the line
    // We use 'DE' as default country, but it handles international numbers (+...) automatically
    const foundNumbers = findNumbers(lineForPhone, { defaultCountry: 'DE', v2: true });

    // Filter out Register numbers (HRA, HRB, Amtsgericht)
    if (/HR[AB]\s*\d+|Amtsgericht|Registergericht/i.test(line.clean)) {
      line.isConsumed = true;
      line.type = 'META';
      return;
    }

    // Ignore Postfach/Postbox lines (they contain numbers but are addresses)
    if (/Postfach|Postbox|P\.O\. Box/i.test(line.clean)) {
      return;
    }

    if (foundNumbers && foundNumbers.length > 0) {
      let hasValidNumber = false;

      foundNumbers.forEach(res => {
        const numberObj = res.number; // E.164 format (e.g. +491711234567)
        const rawNumber = line.clean.substring(res.startsAt, res.endsAt);

        // Phase 2: Anchor Overlap Check (Intelligent Parser)
        // If this potential phone number strongly overlaps with a detected PLZ anchor, skip it.
        // BUT ONLY if the PLZ is "conditionally verified" by a City anchor!
        // Otherwise valid phone numbers like "040 11111" (11111 is 5 digits) gets ignored.
        const overlappingPLZ = line.anchors?.find(a => a.type === 'PLZ' &&
          // Check for significant overlap
          (Math.max(a.startIndex, res.startsAt) < Math.min(a.endIndex, res.endsAt))
        );

        if (overlappingPLZ) {
          // Check if there is a City anchor on this line
          const hasCity = line.anchors?.some(a => a.type === 'CITY');
          if (hasCity) {
            // console.log(`DEBUG consumePhones: Ignored PLZ candidate ${rawNumber} due to Verified Anchor overlap.`);
            return;
          }
          // If no City, we treat strict PLZ anchors as weak against a valid Phone Parse result, 
          // UNLESS the phone number is very weak (e.g. just 5 digits).
          // But valid phone numbers usually have prefixes.
          // If libphonenumber parsed it, it's likely a phone or a PLZ misidentified as phone.
          // Without a city, we favor Phone if it looks like one (e.g. has separators or prefix).
          // If it is JUST 5 digits (e.g. "10115") libphonenumber might pick it up as +49...

          // Let's rely on the REGRESSION FIX further down for pure 5-digit cases.
          // So here we only block if verify.
        }

        // REGRESSION FIX: Check if this "number" is actually a PLZ followed by a City
        // PLZ is 4 or 5 digits.
        const cleanRaw = rawNumber.replace(/\D/g, '');
        if (cleanRaw.length === 4 || cleanRaw.length === 5) {
          // Check for Country Prefix (A-, CH-, D-) immediately before
          const preceeding = line.clean.substring(0, res.startsAt).trim();
          if (/(A|CH|D)-?$/i.test(preceeding)) {
            return;
          }

          // Check what comes AFTER this number (German Format: PLZ City)
          const remainder = line.clean.substring(res.endsAt).trim();
          // Relaxed city check: Word starting with uppercase
          // Also check CITIES_PATTERN for robustness
          const cityRegex = new RegExp(`^(${CITIES_PATTERN})`, 'i');
          if (cityRegex.test(remainder) || /^[A-ZÄÖÜ][a-zäöüß]+/.test(remainder)) {
            return;
          }

          // Check what comes BEFORE this number (US Format: State ZIP)
          // e.g. "NY 10001"
          if (/[A-Z]{2}$/.test(preceeding)) {
            return;
          }
        }

        // Filter out short numbers that might be false positives (like dates or zip codes if they look like phones)
        // libphonenumber is usually good, but let's be safe.
        // E.164 for DE is at least +49... (12 chars). 
        // But local numbers might be shorter.
        // The library returns structured data.

        // We trust the library's validation mostly.

        let type = 'WORK,VOICE';
        const lowerLine = line.clean.toLowerCase();

        if (lowerLine.includes('fax')) type = 'FAX';
        else if (lowerLine.includes('mobil') || lowerLine.includes('cell') || lowerLine.includes('handy')) type = 'CELL';
        else if (lowerLine.includes('home') || lowerLine.includes('privat')) type = 'HOME';

        // Check for mobile number using the provided list
        // Normalize number for check: Remove +49, replace with 0
        let normalizedForCheck: string = numberObj.number; // e.g. +49171...
        if (normalizedForCheck.startsWith('+49')) {
          normalizedForCheck = '0' + normalizedForCheck.substring(3);
        }

        const mobilePattern = new RegExp(`^${getMobileRegexPattern()}`);

        // 1. Check Mobile
        if (mobilePattern.test(normalizedForCheck)) {
          type = 'CELL';
        }
        // 2. Check Landline
        else if (germanLandlinePrefixes.some(prefix => normalizedForCheck.startsWith(prefix))) {
          // Sherlock Holmes Logic: Cross-check with ZIP/City in text
          // 1. Get City from Prefix
          const prefix = germanLandlinePrefixes.find(p => normalizedForCheck.startsWith(p));
          const cityFromPrefix = prefix ? landlineMap[prefix as keyof typeof landlineMap] : null;

          // Phase 2: Check Anchor Confidence
          // If we have an Area Code Anchor in this line, it's a strong signal.
          const anchor = lines.flatMap(l => l.anchors || []).find(a => a.type === 'AREA_CODE' && normalizedForCheck.startsWith(a.value));

          if (cityFromPrefix || anchor) {
            // 2. Find ZIPs in text
            const zipMatches = lines.flatMap(l => l.clean.match(/\b\d{5}\b/g) || []);

            // 3. Check if any ZIP maps to the same City
            let isConfirmed = false;

            if (anchor) {
              isConfirmed = true; // High confidence from Anchor
            } else if (cityFromPrefix) {
              isConfirmed = zipMatches.some(zip => {
                const cityFromZip = plzMap[zip as keyof typeof plzMap];
                // Fuzzy check: does one contain the other? (e.g. "Hamburg" vs "Hamburg-Mitte")
                return cityFromZip && (cityFromZip.includes(cityFromPrefix) || cityFromPrefix.includes(cityFromZip));
              });
            }

            if (isConfirmed) {
              type = 'TEL'; // High confidence
            } else {
              type = 'WORK,VOICE'; // Unconfirmed fallback
            }
          } else {
            type = 'WORK,VOICE';
          }
        }
        // 3. Fallback: Starts with 0 but not in any list -> Assume Landline (rare prefix)
        else if (normalizedForCheck.startsWith('0')) {
          console.warn(`Unknown phone prefix for number: ${normalizedForCheck}. Assuming Landline.`);
          type = 'WORK,VOICE';
        }
        // 4. Fallback: No valid number format (shouldn't happen with libphonenumber E.164) -> Ignore or keep as is?
        // User said: "Check 4 (Keine Nummer): Wenn das Feld leer ist oder nur Müll enthält -> """
        // Since we are iterating over foundNumbers, we have a number.
        // If it doesn't start with 0 (after +49 replacement), it might be international or special.
        // We keep the default type (WORK,VOICE) or whatever was inferred from context.

        // Context override: If line said "Mobil" but it's clearly a landline prefix, we trust the prefix?
        // Or trust the label?
        // User logic implies strict classification based on prefixes.
        // "Check 1... Check 2..." implies priority.
        // So if it matches Landline list, it IS Landline, even if label said "Mobil" (which would be a typo in the contact).
        // Let's stick to the prefix classification as primary truth for type assignment.

        // Avoid duplicates
        // We store the formatted E.164 number or the national format?
        // Let's store the formatted number from the library to look nice?
        // Or E.164 for better machine readability?
        // User wants "robust handling". E.164 is robust.
        // But for display, maybe we want spaces?
        // Let's use the raw number found if we want to preserve input, OR use the formatted one.
        // Let's use the E.164 value for consistency.

        const value = res.number.number;

        if (!data.tel.some(t => t.value === value)) {
          data.tel.push({ type, value });
          // console.log(`DEBUG consumePhones: Found ${value} (Type: ${type})`);
          hasValidNumber = true;
        }
      });

      if (hasValidNumber) {
        line.isConsumed = true;
        line.type = 'PHONE';
      }
    }
  });
};

const consumeAddress = (lines: Line[], data: ParserData) => {
  // Strategy: Find ZIP CITY anchor
  const re_anchor_address = new RegExp(`\\b([0-9]{5})\\s+(${CITIES_PATTERN})\\b`, 'i');

  // Fallback for international/generic ZIP
  const re_zip_generic = /(?:\s|^)(A-|CH-|D-|BE-|PL-|CZ-|NL-|FR-|IT-|ES-|DK-|SE-|NO-|FI-)?([0-9]{4,5})(?=\s|$)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.isConsumed) continue;

    let zip = "", city = "", country = "", street = "";

    // 1. Try German Anchor
    const matchAnchor = line.clean.match(re_anchor_address);
    if (matchAnchor) {
      zip = matchAnchor[1];
      city = matchAnchor[2];
      country = "Deutschland";
      // console.log(`DEBUG consumeAddress Anchor: ZIP=${zip} City=${city}`);

      // Check if street is in the same line before ZIP
      const preZip = line.clean.substring(0, matchAnchor.index).trim();
      if (preZip.length > 3 && !/tel|fax|mail/i.test(preZip)) {
        street = preZip.replace(/,$/, '');
      }

      line.isConsumed = true;
      line.type = 'ADDRESS';
    }
    // 1b. Phase 2: Anchor Detection (Robust Fallback)
    // Only enter this block if we actually have strong anchors to act on.
    // Otherwise, fall through to generic regex.
    else if (line.anchors && line.anchors.some(a => a.type === 'PLZ') && line.anchors.some(a => a.type === 'CITY')) {
      const plzAnchor = line.anchors.find(a => a.type === 'PLZ');
      const cityAnchor = line.anchors.find(a => a.type === 'CITY');

      // Double check (redundant but safe for types)
      if (plzAnchor && cityAnchor) {
        zip = plzAnchor.value;
        city = cityAnchor.value;
        country = "Deutschland"; // Assume DE if valid 5-digit PLZ found by detector

        // Try to find Street (Text surrounding anchors)
        // Usually Street is before PLZ
        if (plzAnchor.startIndex > 5) {
          const preContent = line.clean.substring(0, plzAnchor.startIndex).trim();
          // Clean trailing comma
          const cleanPre = preContent.replace(/,$/, '').trim();
          if (cleanPre.length > 3 && !/tel|fax|mail/i.test(cleanPre)) {
            street = cleanPre;
          }
        }

        line.isConsumed = true;
        line.type = 'ADDRESS';
        // console.log(`DEBUG consumeAddress (Anchors): ZIP=${zip} City=${city}`);
      }
    }
    else {
      // 2. Try US/International Format: City, State ZIP (e.g. New York, NY 10001)
      const re_us = /([A-Za-z\s]+),\s*([A-Z]{2})\s+(\d{5})/;
      const matchUS = line.clean.match(re_us);
      if (matchUS) {
        city = matchUS[1].trim();
        zip = matchUS[3];
        country = "USA";
        // console.log(`DEBUG consumeAddress US: ZIP=${zip} City=${city}`);
        // Street might be before in same line
        const preCity = line.clean.substring(0, matchUS.index).trim();
        if (preCity.length > 3) {
          street = preCity.replace(/,$/, '');
        }
        // Or street might be in previous line if empty
        if (!street && i > 0 && !lines[i - 1].isConsumed) {
          const prevLine = lines[i - 1];
          // US streets often start with number
          if (/^\d+\s+[A-Za-z]/.test(prevLine.clean)) {
            street = prevLine.clean;
            prevLine.isConsumed = true;
            prevLine.type = 'ADDRESS';
          }
        }
        line.isConsumed = true;
      }
      // 3. Try Generic Fallback
      else {
        const matchGeneric = line.clean.match(re_zip_generic);
        // console.log(`DEBUG consumeAddress Generic Check: "${line.clean}" -> Match=${!!matchGeneric}`);
        // if (!matchGeneric && (line.clean.includes('1010') || line.clean.includes('12345'))) {
        //   console.log(`DEBUG Regex Source: ${re_zip_generic.source}`);
        //   console.log(`DEBUG Char Codes: ${line.clean.split('').map(c => c.charCodeAt(0)).join(',')}`);
        // }
        if (matchGeneric) {
          const prefix = matchGeneric[1] ? matchGeneric[1].toUpperCase().replace('-', '') : '';
          zip = matchGeneric[2];
          // console.log(`DEBUG consumeAddress Generic: ZIP=${zip} Prefix=${prefix}`);

          // Try to find City after PLZ
          const postZip = line.clean.substring(matchGeneric.index! + matchGeneric[0].length).trim();
          const cityMatch = postZip.match(/^([A-Za-zÀ-ÖØ-öø-ÿ\-\s]+)/);
          if (cityMatch) {
            city = cityMatch[1].trim();
            line.isConsumed = true;
            line.type = 'ADDRESS';

            // Infer Country
            switch (prefix) {
              case 'A': country = 'Österreich'; break;
              case 'CH': country = 'Schweiz'; break;
              case 'D': country = 'Deutschland'; break;
              default:
                if (line.clean.includes('Schweiz')) country = 'Schweiz';
                else if (line.clean.includes('Österreich')) country = 'Österreich';
                else if (line.clean.includes('USA') || line.clean.includes('United States')) country = 'USA';
                else country = 'Deutschland';
            }

            // Check if street is in the same line before ZIP (e.g. "Wienzeile 5, A-1010 Wien")
            const preZip = line.clean.substring(0, matchGeneric.index).trim();
            // console.log(`DEBUG consumeAddress Generic PreZip: "${preZip}"`);
            if (preZip.length > 3 && !/tel|fax|mail/i.test(preZip)) {
              street = preZip.replace(/,$/, '');
            }
          }
        }
      }
    }

    // 5. Fallback: Street found, but no ZIP yet? (e.g. "Schlossallee 1" \n "München")
    if (!zip && !city && !line.isConsumed) {
      // Simple regex: Word+ Number (at least 3 chars for word), optional suffix like 7a or 7 a
      const isStreet = /^[A-Za-zäöüß\s.-]{3,}\s\d+(\s?[a-z])?$/i.test(line.clean);
      if (isStreet) {
        // Look ahead for City
        if (!line.isConsumed) {
          const intlAddress = parseInternationalAddress(line.clean);
          if (intlAddress && intlAddress.street && intlAddress.city && intlAddress.zip) {
            street = intlAddress.street;
            city = intlAddress.city;
            zip = intlAddress.zip;
            country = intlAddress.country || country; // Keep existing country guess if available, or use parser's
            line.isConsumed = true;
            line.type = 'ADDRESS';
          }
        }
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          // City should be capitalized word(s), no digits
          const isCity = !nextLine.isConsumed && /^[A-ZÄÖÜ][a-zäöüß]+(?:[\s-][A-ZÄÖÜ][a-zäöüß]+)*$/.test(nextLine.clean);

          if (isCity) {
            street = line.clean;
            city = nextLine.clean;
            country = "Deutschland"; // Default
            line.isConsumed = true;
            line.type = 'ADDRESS';
            nextLine.isConsumed = true;
            nextLine.type = 'ADDRESS';
          }
        }
      }
    }

    // 4. Postbox / c/o support
    // "Postfach 12 34" or "c/o Briefkasten-Firma"
    if (!zip && /Postfach|c\/o/i.test(line.clean)) {
      // If we found a ZIP in another line, this might be the street/pobox line
      // But we need to link them.
      // For now, if we see Postfach, treat it as address part.
      // If we already have an address (from previous loop), append?
      // The current logic breaks after finding one address.
      // We might need to capture multiple address lines.
    }

    if ((zip || street) && city) {
      // If we have a valid address anchor (ZIP+City), look backwards for Street/Address lines
      if (i > 0) {
        let collectedParts: string[] = [];
        if (street) collectedParts.push(street); // Start with what we found (e.g. from Generic PreZip)

        // Loop backwards to find address lines (Street, Postfach, c/o, Floor, etc.)
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j];
          if (prevLine.isConsumed) {
            // FIX: Allow skipping over contact info (phones, emails) that might be interleaved due to column splitting
            if (['PHONE', 'EMAIL', 'URL', 'META', 'JOB'].includes(prevLine.type || '')) {
              continue;
            }
            break;
          }

          // Stop if we hit a known non-address type
          if (prevLine.type && prevLine.type !== 'ADDRESS') break;

          // Heuristics for Address vs Name/Company
          const isCompany = /GmbH|AG|Inc|Ltd|e\.V\.|GbR|OHG|KG|UG|Limited|Corp/i.test(prevLine.clean);
          if (isCompany) break;

          const isAddressLine =
            /\d/.test(prevLine.clean) || // Has digits (House number, Postfach number, Floor)
            /Str\.|Strasse|Straße|Weg|Platz|Allee|Gasse|Damm|Ring|Hof|Garten|Park|Land|Ufer|Steig|Pfad|Zeile/i.test(prevLine.clean) ||
            /Postfach|Postbox|P\.O\. Box|c\/o|App\.|Whg\.|Zimmer|Floor|Etage|Aufgang|Hinterhof|Vorderhaus|Gebäude|Besuchen Sie uns/i.test(prevLine.clean);

          if (isAddressLine) {
            collectedParts.unshift(prevLine.clean);
            prevLine.isConsumed = true;
            prevLine.type = 'ADDRESS';
          } else {
            // If it doesn't look like address or company, it might be a name.
            // If we already collected some address parts, we stop.
            if (collectedParts.length > 0) break;

            // If we haven't collected anything yet, and this line doesn't look like an address,
            // we should be careful. It might be the street (e.g. "Hauptstrasse" without number).
            // But it's risky.
            break;
          }

          // Limit to 3 lines max
          if (collectedParts.length >= 3) break;
        }

        if (collectedParts.length > 0) {
          street = collectedParts.join(', ');
        }
      }

      // Check for Postfach in CURRENT line if street is empty or just to add it?
      // If current line is "Postfach 12 34, 12345 City", street might be empty if we only parsed ZIP/City.
      if (!street) {
        const matchPostfach = line.clean.match(/Postfach\s+\d+(?:\s+\d+)?/i);
        if (matchPostfach) {
          street = matchPostfach[0];
        } else if (/Postfach|c\/o/i.test(line.clean)) {
          street = line.clean;
        }
      }

      data.adr.push({
        type: 'WORK',
        value: `;;${street};${city};;${zip};${country}`
      });
      // console.log(`DEBUG consumeAddress PUSH: Street="${street}" City="${city}" Zip="${zip}"`);

      // Stop after finding one main address (usually sufficient)
      break;
    }
  }
};

const consumeJobAndTax = (lines: Line[], data: ParserData) => {
  const re_job = /Geschäftsführerin|Geschäftsführung|Geschäftsführer|Inhaberin|Inhaber|Inh\.|Vorstand|Vorstände|Gesellschafter|Manager|Director|CEO|CTO|CFO|Founder|Gründer|Vertreten durch|Mittelstandsberater|Berater|Vorstandsvorsitzender/i;
  const re_ustid = /((Ust|Umsatz|VAT)\S*(\s|:))(DE(\s)?.*\d{1,9})/i;
  const re_stnr = /(?:Steuer+[-\s|:.A-Za-z]*)\D(.*\d{1,9})/i;

  lines.forEach(line => {
    if (line.isConsumed) return;

    // Job Title
    const jobMatch = line.clean.match(re_job);
    if (jobMatch) {
      // If the line is JUST the job title, consume it. 
      // If it contains a name (e.g. "Geschäftsführer: Max Mustermann"), we extract the title but leave the name for the Name Extractor.

      // FIX: If the line also looks like an Organization (e.g. "Universität Musterstadt"), be careful!
      // But "Vorstandsvorsitzender & CEO" is a valid complex title.
      // "Universität Musterstadt" does NOT match re_job.
      // The issue in "syn_multi_role" is:
      // Line: "Vorstandsvorsitzender & CEO" -> Matches re_job. Consumed as Title.
      // Line: "Universität Musterstadt" -> Not consumed yet.
      // Wait, why did the test fail saying "Received: Vorstandsvorsitzender & CEO"?
      // Ah, the test expects Org: "Universität Musterstadt".
      // If "Vorstandsvorsitzender & CEO" was set as Org, that means consumeLeftovers took it?
      // No, consumeJobAndTax runs BEFORE consumeLeftovers.
      // If consumeJobAndTax took it as Title, then data.title = "Vorstandsvorsitzender & CEO".
      // Then "Universität Musterstadt" is left. consumeLeftovers should take it as Org.

      // Maybe the test failure means data.org was WRONGLY set to "Vorstandsvorsitzender & CEO"?
      // That would happen if consumeJobAndTax DID NOT consume it, and consumeLeftovers took it.
      // So re_job match failed?
      // "Vorstandsvorsitzender & CEO"
      // re_job has "Vorstandsvorsitzender".
      // It should match.

      // Let's ensure we capture the FULL title if it's a complex one.
      // The current logic: data.title = line.clean.replace(/:$/, '');
      // This sets title to the whole line.

      if (line.clean.length < 100) { // Reasonable length
        // Only set title if empty (prioritize top-most title)
        if (!data.title) {
          // Strip "Vertreten durch den" or "Geschäftsführer:" prefixes
          let title = line.clean;

          // Check for "Title: Name" pattern
          if (title.includes(':')) {
            const parts = title.split(':');
            const potentialTitle = parts[0].trim();
            const potentialName = parts.slice(1).join(':').trim();

            // If the part before colon is the job title
            if (potentialName.length > 0 && re_job.test(potentialTitle)) {
              data.title = potentialTitle;
              // Do NOT modify line.clean, so consumeName can use the context!
              // Mark as JOB so consumeName processes it.
              line.isConsumed = true;
              line.type = 'JOB';
              return;
            }
          }

          // Relaxed regex to handle "Vertreten durch den" with case insensitivity and optional parts
          // Use [\s\u00A0] to match regular spaces and non-breaking spaces
          // Also handle "Vertreten durch" without "den"
          title = title.replace(/^Vertreten durch(?:[:\s\u00A0]+(?:den|die|das))?[:\s\u00A0]*/i, '');
          title = title.replace(/:$/, '');
          data.title = title.trim();
          line.isConsumed = true;
          line.type = 'JOB';
        }
      }
    }

    // Tax IDs
    const ustMatch = line.clean.match(re_ustid);
    if (ustMatch) {
      const id = ustMatch[4].replace(/(\/|\s)/g, "");
      data.note.push(`UStID: ${id}`);
      line.isConsumed = true;
      line.type = 'META';
    }

    const stnrMatch = line.clean.match(re_stnr);
    if (stnrMatch) {
      data.note.push(`StNr: ${stnrMatch[1]}`);
      line.isConsumed = true;
      line.type = 'META';
    }
  });
};

import { getLegalFormsRegex } from './parserAnchors';

const consumeCompany = (lines: Line[], data: ParserData) => {
  const re_legal_form = getLegalFormsRegex();

  lines.forEach(line => {
    if (line.isConsumed) return;

    if (re_legal_form.test(line.clean)) {
      // Clean trailing digits (page numbers, OCR noise)
      // e.g. "Company GmbH 9" -> "Company GmbH"
      data.org = line.clean.replace(/\s+\d{1,2}$/, '');
      line.isConsumed = true;
      line.type = 'ORG';
    }
  });
};

const consumeName = (lines: Line[], data: ParserData) => {
  // 1. Contextual (GF: Name)
  // Allow optional adjectives before title (e.g. "Vertretungsberechtigte Geschäftsführer")
  // Allow comma separated list, capture first name
  // Support German characters (Umlauts) in name
  // Support academic titles in name (Prof. Dr. Max Mustermann)
  // Support trailing text like (Vorsitz) or & Partner
  const re_context = /(?:Geschäftsführer|Inhaber|Vorstand|GF|CEO|Director|Vorstandsvorsitzender)(?:\s*:\s*|\s+&?\s*CEO\s*|\s+)((?:Prof\.|Dr\.|h\.c\.|mult\.|Dipl\.-|Mag\.|[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+\.?\s+)+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+)(?:[\s,(]|$)/i;

  for (const line of lines) {
    if (line.isConsumed && line.type !== 'JOB') continue;

    // Check if line contains any of the keywords
    if (/Geschäftsführer|Inhaber|Vorstand|GF|CEO|Director|Geschäftsleitung/i.test(line.clean)) {
      const match = line.clean.match(re_context);
      if (match) {
        const fullName = match[1].trim();
        const parts = fullName.split(' ');
        data.fn = fullName;
        data.n = `${parts[parts.length - 1]};${parts[0]}`;

        // If this line was NOT consumed yet, consume it now.
        if (!line.isConsumed) {
          line.isConsumed = true;
          line.type = 'NAME';
        }
        return;
      } else {
        // Look ahead: Title found, but no name on same line?
        // e.g. "Geschäftsleitung:" \n "Thomas Mau"
        // Check if next line looks like a name
        const lineIndex = lines.indexOf(line);
        if (lineIndex !== -1 && lineIndex + 1 < lines.length) {
          const nextLine = lines[lineIndex + 1];
          if (!nextLine.isConsumed && isName(nextLine.clean)) {
            // Found name on next line!
            const fullName = nextLine.clean;
            const parts = fullName.split(' ');
            data.fn = fullName;
            data.n = `${parts[parts.length - 1]};${parts[0]}`;

            // Consume both
            if (!line.isConsumed) {
              line.isConsumed = true;
              line.type = 'JOB'; // The first line was the title
              // Also ensure data.title is set if not already
              if (!data.title) data.title = line.clean.replace(/:$/, '');
            }
            nextLine.isConsumed = true;
            nextLine.type = 'NAME';
            return;
          }
        }
      }
    }
  }

  // 2. Database Match (or Academic Title Match)
  // Expanded pattern to include academic titles at the start
  const VORNAMEN_PATTERN_EXT = `(?:(?:Prof\\.|Dr\\.|Dipl\\.-|Mag\\.|h\\.c\\.|mult\\.|Med\\.)\\s+)*${VORNAMEN_PATTERN}`;
  const re_names = new RegExp(VORNAMEN_PATTERN_EXT, 'i');

  for (const line of lines) {
    if (line.isConsumed) continue;

    const match = line.clean.match(re_names);
    // if (line.clean.includes('Max')) {
    //   console.error('DEBUG consumeName:', { line: line.clean, match: match ? match[0] : 'null' });
    // }
    if (match) {
      // Found a firstname (potentially with titles). Check if there is a lastname following.
      const nameIndex = match.index!;
      const remainder = line.clean.substring(nameIndex + match[0].length).trim();
      const nextWord = remainder.split(' ')[0];

      if (nextWord && /^[A-Z]/.test(nextWord)) {
        // Looks like a name!
        // match[0] contains titles + firstname (e.g. "Prof. Dr. Max")
        // nextWord is Lastname (e.g. "Mustermann")

        const prefix = match[0].substring(0, match[0].lastIndexOf(' ')).trim(); // "Prof. Dr."
        const vorname = match[0].split(' ').pop(); // "Max"
        const nachname = nextWord.replace(/[.,;:]+$/, ''); // Clean trailing punctuation

        data.fn = prefix ? `${prefix} ${vorname} ${nachname}` : `${vorname} ${nachname}`;
        data.n = `${nachname};${vorname};;${prefix};`; // Store prefix in N field correctly

        line.isConsumed = true;
        line.type = 'NAME';
        return;
      }
    }
  }
};

const consumeNameHeuristic = (lines: Line[], data: ParserData) => {
  // Only run if we haven't found a name yet
  if (data.fn) return;

  for (const line of lines) {
    if (line.isConsumed) continue;

    // Heuristic: Use isName function
    if (isName(line.clean)) {
      // Check for comma-separated names (e.g. "Susi Sorglos, Peter Pan")
      if (line.clean.includes(',')) {
        const parts = line.clean.split(',').map(p => p.trim());
        // If both parts look like names, take the first one as primary FN
        // Ideally we should add both, but our data structure supports one FN.
        // We can add the second one to N or just ignore it for now to pass the test which expects the first one.
        if (parts.length > 0 && isName(parts[0])) {
          const firstPart = parts[0];
          const words = firstPart.split(/\s+/);
          const last = words[words.length - 1];
          const first = words.slice(0, words.length - 1).join(' ');

          data.fn = firstPart;
          data.n = `${last};${first}`;
          line.isConsumed = true;
          line.type = 'NAME';
          return;
        }
      }

      // 2. Check if line looks like a name (2-4 words, no digits, no common blacklist words)
      // This check is now redundant because isName() already filters.
      // We can directly try to parse with Namefully if isName() is true.
      // The original `words` variable is not available here, it was inside the `if (line.clean.includes(','))` block.
      // We should use `line.clean` directly.
      // The `isName(line.clean)` check already ensures it's likely a name.
      // Let's add a word count check here to refine.
      const currentLineWords = line.clean.split(/\s+/);
      if (currentLineWords.length >= 2 && currentLineWords.length <= 6 && !/\d/.test(line.clean)) {
        // Use Namefully to parse
        const complexName = parseComplexName(line.clean);
        if (complexName && complexName.first && complexName.last) {

          let fn = complexName.first;
          if (complexName.middle) fn += ` ${complexName.middle}`;
          fn += ` ${complexName.last}`;

          if (complexName.prefix) fn = `${complexName.prefix} ${fn}`;
          if (complexName.suffix) fn = `${fn} ${complexName.suffix}`;

          data.fn = fn;
          data.n = `${complexName.last};${complexName.first};${complexName.middle || ''};${complexName.prefix || ''};${complexName.suffix || ''}`;

          line.isConsumed = true;
          line.type = 'NAME';
          return;
        }
      }

      const words = line.clean.split(/\s+/);
      // If isName returns true, we trust it.
      // But we need to split into First/Last for N field.
      // Simple assumption: Last word is surname.
      const last = words[words.length - 1];
      const first = words.slice(0, words.length - 1).join(' ');

      data.fn = line.clean;
      // console.log(`DEBUG consumeNameHeuristic: Set data.fn to "${data.fn}"`);
      data.n = `${last};${first}`;
      line.isConsumed = true;
      line.type = 'NAME';
      return; // Found it
    }
  }
};

const consumeLeftovers = (lines: Line[], data: ParserData) => {
  // If we still have no Company, take the first unconsumed line
  if (!data.org) {
    const firstUnconsumed = lines.find(l => !l.isConsumed && l.clean.length > 2);
    if (firstUnconsumed) {
      let org = firstUnconsumed.clean;
      // Strip "Ihr Team von" or "Your Team from" prefixes
      org = org.replace(/^(?:Ihr Team von|Your Team from|Dein Team von)\s*/i, '');
      // Strip trailing punctuation
      org = org.replace(/[.,;:]+$/, '');
      // Strip trailing digits (page numbers, OCR noise)
      org = org.replace(/\s+\d{1,2}$/, '');
      data.org = org;
      firstUnconsumed.isConsumed = true;
      firstUnconsumed.type = 'ORG';
    }
  }

  // If we still have no Name, take the NEXT unconsumed line (or the first if we just took org)
  if (!data.fn) {
    const nextUnconsumed = lines.find(l => !l.isConsumed && l.clean.length > 2);
    if (nextUnconsumed) {
      // Simple heuristic: If it has 2 words, it might be a name
      // BUT must not have digits (to avoid addresses like "Musterstr 1")
      const parts = nextUnconsumed.clean.split(' ');
      if (parts.length >= 2 && !/\d/.test(nextUnconsumed.clean)) {
        data.fn = nextUnconsumed.clean;
        // console.log(`DEBUG consumeLeftovers: Set data.fn to "${data.fn}"`);
        data.n = `${parts[parts.length - 1]};${parts[0]}`;
        nextUnconsumed.isConsumed = true;
        nextUnconsumed.type = 'NAME';
      }
    }
  }
};

// --- Main Parser ---

const sanitizeText = (text: string): string => {
  return text
    .replace(/\u00A0/g, ' ') // Non-breaking space
    .replace(/[\u2000-\u200B]/g, ' ') // Zero-width spaces
    .replace(/\t/g, ' ');
};

export const parseSpatialToVCard = (ocrLines: { text: string; bbox: any }[]): string => {
  // 1. Convert to internal Line format
  // Sort by Y (top to bottom) primarily, then X (left to right)
  const sortedLines = [...ocrLines].sort((a, b) => {
    // Threshold for "same line" (e.g. 10px difference)
    const yDiff = Math.abs(a.bbox.y0 - b.bbox.y0);
    if (yDiff < 10) {
      return a.bbox.x0 - b.bbox.x0;
    }
    return a.bbox.y0 - b.bbox.y0;
  });

  const lines: Line[] = sortedLines
    .map(l => ({
      original: l.text,
      clean: l.text.trim(),
      isConsumed: false,
      bbox: l.bbox
    }))
    .filter(l => l.clean.length > 0);

  // Phase 2: Anchor Detection
  lines.forEach(l => {
    l.anchors = detectAnchors(l.clean);
  });

  // 2. Initialize Data
  const data: ParserData = {
    fn: "", n: "", org: "", title: "",
    tel: [], email: [], url: [], adr: [], note: []
  };

  // 3. Run Extractors (Standard Pipeline)
  consumeMeta(lines);
  consumeEmails(lines, data);
  consumeUrls(lines, data);
  consumePhones(lines, data);
  consumeCompany(lines, data);
  consumeJobAndTax(lines, data);
  consumeAddress(lines, data);

  // 4. Spatial Heuristics (Boosters)
  // If we still miss Name or Address, use position

  // Header (Top 30%): Likely Name or Company
  const maxY = Math.max(...lines.map(l => l.bbox?.y1 || 0));
  const headerThreshold = maxY * 0.3;
  // const footerThreshold = maxY * 0.7; // Unused for now

  // Try to find Name in Header if missing
  if (!data.fn) {
    const headerLines = lines.filter(l => !l.isConsumed && (l.bbox?.y0 || 0) < headerThreshold);
    consumeNameHeuristic(headerLines, data);
  }

  // Try to find Address in Footer if missing
  // (Address extractor usually relies on ZIP/City anchors, but maybe we can relax it for footer?)
  // For now, let's just run the standard name heuristic on the rest if still missing
  if (!data.fn) {
    consumeNameHeuristic(lines, data);
  }

  consumeLeftovers(lines, data);

  // 5. Build VCard
  return buildVCard(data);
};

export const parseImpressumToVCard = (text: string): string => {
  // 1. Prepare Lines
  let cleanText = sanitizeText(text);

  // PRE-PROCESSING: Fix "Newlines Mess"
  // Replace | with newline if it looks like a separator
  // Also handle " • " as separator
  cleanText = cleanText.replace(/\s+[|•]\s+/g, '\n');

  // PRE-PROCESSING: Fix "Mixed Columns" (Visual columns -> Newlines)
  // Explode lines with wide gaps (3+ spaces or tabs) into multiple lines.
  // Example: "Address    |    Tel: 123" -> "Address \n Tel: 123"
  cleanText = cleanText.replace(/(\S)[ \t]{3,}(\S)/g, '$1\n$2');
  console.log('DEBUG cleanText after column split:', cleanText);

  // PRE-PROCESSING: Fix "Sticky Text"
  // 1. LowercaseUppercase -> Lowercase Uppercase (e.g. MaxMustermann -> Max Mustermann)
  // Smart Split: Only split if the first part is a known name (e.g. Max)
  // This avoids splitting "KeinPlatz" or "McSlashface" or "GmbH"
  const re_camel = new RegExp(`\\b([A-ZÄÖÜ][a-zäöüß]+)([A-ZÄÖÜ][a-zäöüß]+)\\b`, 'g');
  const re_names_check = new RegExp(VORNAMEN_PATTERN, 'i');

  cleanText = cleanText.replace(re_camel, (match, p1, p2) => {
    // Check if p1 is a known name
    if (re_names_check.test(p1)) {
      return `${p1} ${p2}`;
    }
    return match; // Keep as is
  });

  // cleanText = cleanText.replace(/Gmb H/g, 'GmbH'); // No longer needed with smart split?
  // But maybe "GmbH" was split by something else? 
  // "GmbH" -> "Gmb" "H". "Gmb" is not a name. So it won't split.
  // "mbH" -> "m" "bH". "m" is lowercase. Regex expects Uppercase start.
  // So "GmbH" and "mbH" are safe.



  // PRE-PROCESSING: OCR Corrections (Global)

  // 1. Fix Spaced Numbers (e.g. "+ 4 9 ( 0 ) 1 2 3")
  // Look for sequences of single digits separated by spaces/tabs (NOT newlines)
  cleanText = cleanText.replace(/(?:^|[ \t])(\+\s*)?(\d[ \t]+){3,}\d/gm, (match) => {
    return match.replace(/[ \t]+/g, '');
  });

  // Fix spaced TLDs (e.g. .c 0m -> .com)
  cleanText = cleanText.replace(/\.c\s*0\s*m\b/gi, '.com');

  // 2. Fix Dots/Slashes in potential phone numbers
  // e.g. 040.123.45.67 -> 040 123 45 67
  cleanText = cleanText.replace(/(\d)[\.\/](\d)/g, '$1 $2');

  // Fix common label typos
  cleanText = cleanText.replace(/Emial:/gi, 'Email:');
  cleanText = cleanText.replace(/Te1:/gi, 'Tel:');
  cleanText = cleanText.replace(/Te[lI1\|]:/gi, 'Tel:'); // Aggressive Tel fix
  cleanText = cleanText.replace(/Telephon:/gi, 'Telefon:');
  cleanText = cleanText.replace(/Mobi[lI1]:/gi, 'Mobil:');
  cleanText = cleanText.replace(/Natel:/gi, 'Mobil:');

  // Fix "Durchwahl" (e.g. 040-12345 (Durchwahl -20) -> 040-12345-20)
  cleanText = cleanText.replace(/\(Durchwahl\s*[:.-]?\s*(\d+)\)/gi, '-$1');

  // Ensure space after labels (e.g. Tel.040 -> Tel. 040)
  cleanText = cleanText.replace(/(Tel|Fax|Mobil|Telefon|Handy|Cell|Phon)\.?\s*(\d)/gi, '$1: $2');
  cleanText = cleanText.replace(/:\+/g, ': +'); // Ensure space between colon and plus

  // Ensure space before labels if stuck (e.g. 123456Mail: -> 123456 Mail:)
  cleanText = cleanText.replace(/([a-z0-9])(Mail:|Email:|Web:|Tel:|Fax:|Mobil:|Telefon:|Handy:|Cell:|Phon:)/gi, '$1 $2');

  // Fix leetspeak/OCR: 4 -> a (e.g. M4x -> Max)
  cleanText = cleanText.replace(/([a-zA-Z])4([a-zA-Z])/g, '$1a$2');

  // Fix OCR: 0 -> O in phone context (Line-based)
  // e.g. "T: O3O" -> "T: 030"
  // Only match if we see at least one digit or it looks like a number pattern
  cleanText = cleanText.replace(/((?:Tel|Fax|Mobil|T|F|M)[:\.]?[ \t]*)([O0-9\/\-\+\(\)[ \t]+)/gi, (match, labelPart, numberPart) => {
    // Only replace if it contains at least one digit to avoid false positives
    if (/\d/.test(numberPart)) {
      return labelPart + numberPart.replace(/O/g, '0');
    }
    return match;
  });

  // Fix OCR: 0 -> O at start of words (e.g. 0CR -> OCR, 0ber -> Ober)
  // But NOT if it looks like a number (e.g. 040, 0171)
  // Look for 0 followed by uppercase letters
  cleanText = cleanText.replace(/\b0([A-Z]{2,})\b/g, 'O$1');

  // Fix OCR: l -> 1 in phone context (Line-based)
  // Expanded to handle "TeI" (capital I) and spaces inside numbers
  // Also allow "TeI" or "MobiI" in the label part (and "Te I" due to sticky text split)
  cleanText = cleanText.replace(/((?:Tel|Fax|Mobil|T|F|M|Te\s*I|Mobi\s*I)[:\.]?[ \t]*)([lI10-9\/\-\+\(\)[ \t]+)/gi, (match, labelPart, numberPart) => {
    // Only replace if it contains at least one digit OR looks like a number pattern with l/I
    // e.g. "l23 456" -> "123 456"
    if (/\d/.test(numberPart) || /[lI]\d/.test(numberPart) || /\d[lI]/.test(numberPart)) {
      return labelPart + numberPart.replace(/[lI]/g, '1');
    }
    return match;
  });

  // 2. DigitLetter -> Digit Letter (e.g. 10115Berlin -> 10115 Berlin)
  // Only split if letter is Uppercase (to avoid splitting 7a -> 7 a)
  cleanText = cleanText.replace(/(\d)([A-ZÄÖÜ])/g, '$1 $2');
  // 3. LetterDigit -> Letter Digit (e.g. Musterstraße1 -> Musterstraße 1)
  cleanText = cleanText.replace(/([a-zA-ZÄÖÜäöü])(\d)/g, '$1 $2');

  const rawLines = cleanText.split(/\r\n|\r|\n/);
  const lines: Line[] = rawLines
    .map(l => ({ original: l, clean: l.trim(), isConsumed: false }))
    .filter(l => l.clean.length > 0);

  // Phase 2: Anchor Detection
  lines.forEach(l => {
    l.anchors = detectAnchors(l.clean);
  });

  // 2. Initialize Data
  const data: ParserData = {
    fn: "", n: "", org: "", title: "",
    tel: [], email: [], url: [], adr: [], note: []
  };

  // console.log('--- PARSER DEBUG ---');
  // console.log('Clean Text:\n', cleanText);
  // console.log('Lines:', lines.map(l => l.clean));

  // 3. Run Extractors (Order Matters!)
  consumeMeta(lines);
  consumeEmails(lines, data);
  consumeUrls(lines, data);
  consumeJobAndTax(lines, data);
  consumePhones(lines, data);
  consumeAddress(lines, data);
  consumeCompany(lines, data); // Look for legal forms
  consumeName(lines, data);    // Look for names
  consumeNameHeuristic(lines, data); // Fallback for names

  // 5. Cleanup: If we have a Name, check if there are unconsumed lines that match the Name exactly
  if (data.fn) {
    lines.forEach(l => {
      if (!l.isConsumed && l.clean === data.fn) {
        l.isConsumed = true;
        l.type = 'NAME';
      }
    });
  }

  consumeLeftovers(lines, data); // Fallbacks

  // 4. Fallback: Org from Email Domain (After Leftovers)
  if (!data.org && data.email.length > 0) {
    // Try to find a non-generic domain
    const genericProviders = [
      'gmail.com', 'googlemail.com', 'gmx.de', 'gmx.net', 'web.de',
      'yahoo.com', 'yahoo.de', 'hotmail.com', 'outlook.com', 'outlook.de',
      'live.com', 'icloud.com', 'me.com', 't-online.de', 'aol.com', 'protonmail.com'
    ];

    for (const email of data.email) {
      const domain = email.value.split('@')[1];
      if (domain && !genericProviders.includes(domain.toLowerCase())) {
        data.org = domain;
        break;
      }
    }
  }

  // 7. Post-Processing: Clean Name Fields (User request: Only letters at start/end)
  if (data.fn) {
    // Strip non-letters (including dots, dashes) from start and end
    data.fn = data.fn.replace(/^[^a-zA-ZÄÖÜäöü]+|[^a-zA-ZÄÖÜäöü]+$/g, '');

    // Also fix internal dots on full words (e.g. "Christel." -> "Christel")
    // Logic: Remove dot if preceded by 2 or more letters. Keep initials (e.g. "A.")
    data.fn = data.fn.replace(/([a-zA-ZÄÖÜäöü]{2,})\./g, '$1');
  }
  if (data.n) {
    // Apply same cleaning to each part of N (Family;Given;Middle...)
    data.n = data.n.split(';').map(part => {
      let clean = part.replace(/^[^a-zA-ZÄÖÜäöü]+|[^a-zA-ZÄÖÜäöü]+$/g, '');
      clean = clean.replace(/([a-zA-ZÄÖÜäöü]{2,})\./g, '$1');
      return clean;
    }).join(';');
  }

  // 8. Smart Deduplication & Correction (Module 32)

  // A. Deduplicate Addresses
  if (data.adr.length > 1) {
    const uniqueAdrs = new Map<string, typeof data.adr[0]>();
    data.adr.forEach(a => {
      // Create a signature (Just the full String value)
      const sig = a.value;
      if (!uniqueAdrs.has(sig)) {
        uniqueAdrs.set(sig, a);
      }
    });
    data.adr = Array.from(uniqueAdrs.values());
  }

  // B. Smart Email Correction (Levenshtein)
  // Fix "vommame.nackname@firma.de" -> "vorname.nachname@firma.de" using confident Name
  if (data.fn && data.email.length > 0) {
    // 1. Prepare Candidates from Name
    const cleanFn = data.fn.toLowerCase().replace(/[^a-zäöüß ]/g, '');
    const nameParts = cleanFn.split(/\s+/).filter(p => p.length > 2);

    if (nameParts.length >= 2) {
      const candidates: string[] = [];
      const first = nameParts[0];
      const last = nameParts[nameParts.length - 1]; // Use last part as surname

      candidates.push(`${first}.${last}`); // max.mustermann
      candidates.push(`${last}.${first}`); // mustermann.max
      candidates.push(`${first}${last}`);  // maxmustermann
      candidates.push(`${first.charAt(0)}.${last}`); // m.mustermann

      // 2. Check each email
      data.email = data.email.map(email => {
        const parts = email.value.split('@');
        if (parts.length !== 2) return email;

        const prefix = parts[0].toLowerCase();
        const domain = parts[1];

        // Only attempt if prefix is reasonably long
        if (prefix.length < 5) return email;

        // Check against candidates
        for (const candidate of candidates) {
          // If match is close but not exact (e.g. 1-2 chars diff)
          const dist = getLevenshteinDistance(prefix, candidate);
          const maxEdits = Math.max(2, Math.floor(candidate.length / 4)); // Allow 2 edits, or more for very long names

          if (dist > 0 && dist <= maxEdits) {
            console.log(`[SmartCorrect] Fixing Email: ${prefix}@ -> ${candidate}@ (Dist: ${dist})`);
            return { ...email, value: `${candidate}@${domain}` }; // Keep case of candidate? Lowercase usually better for email
          }
        }
        return email;
      });
    }
  }

  // 6. Construct vCard
  return buildVCard(data);
};

export const buildVCard = (data: ParserData): string => {
  // console.log(`DEBUG FINAL data.fn: "${data.fn}"`);
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0"
  ];

  if (data.n) vcard.push(`N;CHARSET=utf-8:${data.n}`);
  if (data.fn) vcard.push(`FN;CHARSET=utf-8:${data.fn}`);
  if (data.org) vcard.push(`ORG;CHARSET=utf-8:${data.org}`);
  if (data.title) vcard.push(`TITLE;CHARSET=utf-8:${data.title}`);

  data.adr.forEach(a => vcard.push(`ADR;CHARSET=utf-8;TYPE=${a.type}:${a.value}`));
  data.tel.forEach(t => vcard.push(`TEL;CHARSET=utf-8;TYPE=${t.type}:${t.value}`));
  data.email.forEach(e => vcard.push(`EMAIL;CHARSET=utf-8;TYPE=${e.type}:${e.value}`));
  data.url.forEach(u => vcard.push(`URL;CHARSET=utf-8;TYPE=${u.type}:${u.value}`));

  if (data.note.length > 0) {
    vcard.push(`NOTE;CHARSET=utf-8:${data.note.join('\\n')}`);
  }

  vcard.push("END:VCARD");

  console.log(`[SmartCorrect] Address Count: ${data.adr.length}, Emails: ${data.email.length}`);
  return vcard.join('\n');
};

// --- Helper: Levenshtein Distance (Iterative) ---
const getLevenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};