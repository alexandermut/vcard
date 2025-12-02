import { CITIES_PATTERN } from './cities';
import { VCardData } from '../types';
import { parseGermanAddress } from './addressParser';
import { findNumbers } from 'libphonenumber-js';
import { getMobileRegexPattern } from './mobilePrefixes';
import { germanLandlinePrefixes } from './landlinePrefixes';
import { landlineMap, plzMap } from './landlineData';

// --- Types ---

interface Line {
  original: string;
  clean: string;
  isConsumed: boolean;
  type?: 'EMAIL' | 'PHONE' | 'URL' | 'ADDRESS' | 'JOB' | 'META' | 'ORG' | 'NAME' | null;
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
const VORNAMEN_PATTERN = "(?:Aaliyah|Aaron|Adam|Adrian|Alexander|Alfred|Alice|Andreas|Angela|Anna|Anne|Antonia|Arthur|Barbara|Ben|Benjamin|Bernhard|Bernd|Bettina|Bianca|Birgit|Brigitte|Carl|Carla|Carlos|Caroline|Carsten|Chantal|Charlotte|Christian|Christiane|Christina|Christine|Christoph|Claudia|Claus|Cornelia|Dagmar|Daniel|Daniela|David|Dennis|Dieter|Dietmar|Dirk|Dominik|Doris|Eberhard|Edith|Elisabeth|Elke|Ellen|Elfriede|Elias|Emil|Emily|Emma|Erich|Erik|Erika|Ernst|Erwin|Esther|Eva|Evelyn|Fabian|Felix|Florian|Frank|Franz|Franziska|Friedrich|Gabriele|Georg|Gerhard|Gertrud|Gisela|Gunnar|Günter|Hanna|Hannes|Hans|Harald|Heike|Heinrich|Heinz|Helga|Helmut|Herbert|Hermann|Holger|Horst|Hubert|Hugo|Ingo|Ingrid|Irene|Iris|Isabel|Jan|Jana|Jane|Janine|Jennifer|Jens|Jessica|Joachim|Johannes|John|Jolanthe|Jonas|Jonathan|Jörg|Josef|Julia|Julian|Juliane|Jürgen|Jutta|Kai|Karin|Karl|Karla|Karolin|Karsten|Katharina|Katja|Katrin|Kevin|Klaus|Konrad|Kristin|Kurt|Lara|Laura|Lea|Lena|Leon|Leonie|Lisa|Lothar|Luca|Lukas|Lutz|Manfred|Manuel|Manuela|Marc|Marcel|Marco|Marcus|Marek|Maria|Marianne|Mario|Marion|Mark|Markus|Martha|Martin|Martina|Mathias|Matthias|Max|Maximilian|Melanie|Michael|Michaela|Miriam|Monika|Moritz|Nadine|Nadja|Nicole|Niklas|Nils|Nina|Norbert|Ola|Olaf|Oliver|Olivia|Patrick|Paul|Paula|Peter|Petra|Philipp|Pia|Rainer|Ralf|Ralph|Ramona|Raphael|Rebecca|Regina|Reinhard|Renate|Rene|Richard|Rita|Robert|Roland|Rolf|Ronald|Rosemarie|Rudolf|Sabine|Sabrina|Sandra|Sara|Sarah|Sascha|Sebastian|Silke|Silvia|Simon|Simone|Sonja|Stefan|Stefanie|Steffen|Stephanie|Susanne|Sven|Svenja|Sylvia|Tanja|Thomas|Thorsten|Tim|Timo|Tobias|Tom|Torsten|Udo|Ulrich|Ulrike|Ursula|Ute|Uwe|Vanessa|Vera|Verena|Veronica|Veronika|Viktor|Viktoria|Volker|Walter|Waltraud|Werner|Wilhelm|Wolfgang|Yvonne|Zoe)\\b";

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
    /^kontakt$/i
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
  const re_email = /([a-zA-Z0-9_.+-]+)(?:@|\s*[\(\[]\s*at\s*[\)\]]\s*)([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/gi;
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
        // Normalize (at) -> @
        const cleanEmail = email.replace(/\s*[\(\[]\s*at\s*[\)\]]\s*/i, '@');
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

        data.url.push({ type, value: cleanUrl });
      });
      line.isConsumed = true;
      line.type = 'URL';
    }
  });
};

const consumePhones = (lines: Line[], data: ParserData) => {
  lines.forEach(line => {
    if (line.isConsumed) return;

    // Use libphonenumber-js to find numbers in the line
    // We use 'DE' as default country, but it handles international numbers (+...) automatically
    const foundNumbers = findNumbers(line.clean, { defaultCountry: 'DE', v2: true });

    // Filter out Register numbers (HRA, HRB, Amtsgericht)
    if (/HR[AB]\s*\d+|Amtsgericht|Registergericht/i.test(line.clean)) {
      return;
    }

    if (foundNumbers && foundNumbers.length > 0) {
      let hasValidNumber = false;

      foundNumbers.forEach(res => {
        const numberObj = res.number; // E.164 format (e.g. +491711234567)
        const rawNumber = line.clean.substring(res.startsAt, res.endsAt);

        // REGRESSION FIX: Check if this "number" is actually a PLZ followed by a City
        // PLZ is 5 digits.
        const cleanRaw = rawNumber.replace(/\D/g, '');
        if (cleanRaw.length === 5) {
          // Check what comes AFTER this number
          const remainder = line.clean.substring(res.endsAt).trim();
          const cityRegex = new RegExp(`^(${CITIES_PATTERN})`, 'i');
          if (cityRegex.test(remainder)) {
            // It's a PLZ followed by a City! Ignore this as a phone number.
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

          if (cityFromPrefix) {
            // 2. Find ZIPs in text
            const zipMatches = lines.flatMap(l => l.clean.match(/\b\d{5}\b/g) || []);

            // 3. Check if any ZIP maps to the same City
            const isConfirmed = zipMatches.some(zip => {
              const cityFromZip = plzMap[zip as keyof typeof plzMap];
              // Fuzzy check: does one contain the other? (e.g. "Hamburg" vs "Hamburg-Mitte")
              return cityFromZip && (cityFromZip.includes(cityFromPrefix) || cityFromPrefix.includes(cityFromZip));
            });

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

      // Check if street is in the same line before ZIP
      const preZip = line.clean.substring(0, matchAnchor.index).trim();
      if (preZip.length > 3 && !/tel|fax|mail/i.test(preZip)) {
        street = preZip.replace(/,$/, '');
      }

      line.isConsumed = true;
      line.type = 'ADDRESS';
    }
    // 2. Try Generic Fallback
    else {
      const matchGeneric = line.clean.match(re_zip_generic);
      if (matchGeneric) {
        const prefix = matchGeneric[1] ? matchGeneric[1].toUpperCase().replace('-', '') : '';
        zip = matchGeneric[2];

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
            default:
              if (line.clean.includes('Schweiz')) country = 'Schweiz';
              else if (line.clean.includes('Österreich')) country = 'Österreich';
              else country = 'Deutschland';
          }
        }
      }
    }

    if (zip && city) {
      // If we haven't found the street yet, look at the line ABOVE
      if (!street && i > 0) {
        const prevLine = lines[i - 1];
        // Only if not consumed and looks like a street
        if (!prevLine.isConsumed) {
          // Try to parse with our new robust parser
          const addressResult = parseGermanAddress(prevLine.clean);

          if (addressResult.isValid) {
            street = prevLine.clean; // Keep original full string for vCard (Street + Number)
            prevLine.isConsumed = true;
            prevLine.type = 'ADDRESS';
          }
          // Fallback: Old heuristic (ends with digit) if parser was too strict but it looks okayish
          else if (/\d+$/.test(prevLine.clean) && prevLine.clean.length > 5) {
            street = prevLine.clean;
            prevLine.isConsumed = true;
            prevLine.type = 'ADDRESS';
          }
        }
      }

      data.adr.push({
        type: 'WORK',
        value: `;;${street};${city};;${zip};${country}`
      });

      // Stop after finding one main address (usually sufficient)
      break;
    }
  }
};

const consumeJobAndTax = (lines: Line[], data: ParserData) => {
  const re_job = /Geschäftsführerin|Geschäftsführung|Geschäftsführer|Inhaberin|Inhaber|Inh\.|Vorstand|Vorstände|Gesellschafter|Manager|Director|CEO|CTO|CFO|Founder|Gründer|Vertreten durch|Mittelstandsberater|Berater/i;
  const re_ustid = /((Ust|Umsatz)\S+(\s|:))(DE(\s)?.*\d{1,9})/i;
  const re_stnr = /(?:Steuer+[-\s|:.A-Za-z]*)\D(.*\d{1,9})/i;

  lines.forEach(line => {
    if (line.isConsumed) return;

    // Job Title
    const jobMatch = line.clean.match(re_job);
    if (jobMatch) {
      // If the line is JUST the job title, consume it. 
      // If it contains a name (e.g. "Geschäftsführer: Max Mustermann"), we extract the title but leave the name for the Name Extractor.
      if (line.clean.length < jobMatch[0].length + 10) {
        data.title = line.clean.replace(/:$/, '');
        line.isConsumed = true;
        line.type = 'JOB';
      } else {
        // It's likely "Title: Name". We'll handle this in Name extraction or split it here.
        // Let's just save the title for now.
        data.title = jobMatch[0].replace(/:$/, '');
        // Don't consume yet, let Name extractor handle the rest
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

const consumeCompany = (lines: Line[], data: ParserData) => {
  const re_legal_form = /(?:^|\s)(AG|SE|eG|e\.K\.|e\.Kfr\.|e\.V\.|GbR|gGmbH|GmbH|KGaA|KdöR|AöR|KG|OHG|PartG|PartG mbB|UG|Inc\.|Ltd\.|LLC|Corp\.|Limited)(?:$|\s|[.,])/i;

  lines.forEach(line => {
    if (line.isConsumed) return;

    if (re_legal_form.test(line.clean)) {
      data.org = line.clean;
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
  const re_context = /(?:Geschäftsführer|Inhaber|Vorstand|GF|CEO|Director)(?:\s*:\s*|\s+)([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+)+)(?:,|$)/i;

  for (const line of lines) {
    if (line.isConsumed && line.type !== 'JOB') continue;

    // Check if line contains any of the keywords
    if (/Geschäftsführer|Inhaber|Vorstand|GF|CEO|Director/i.test(line.clean)) {
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
      }
    }
  }

  // 2. Database Match
  const re_names = new RegExp(VORNAMEN_PATTERN, 'i');

  for (const line of lines) {
    if (line.isConsumed) continue;

    const match = line.clean.match(re_names);
    if (match) {
      // Found a firstname. Check if there is a lastname following.
      const nameIndex = match.index!;
      const remainder = line.clean.substring(nameIndex + match[0].length).trim();
      const nextWord = remainder.split(' ')[0];

      if (nextWord && /^[A-Z]/.test(nextWord)) {
        // Looks like a name!
        const vorname = match[0];
        const nachname = nextWord;
        data.fn = `${vorname} ${nachname}`;
        data.n = `${nachname};${vorname}`;

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

    // Heuristic: Exactly 2 words, both capitalized, no numbers, reasonable length
    const words = line.clean.split(/\s+/);
    if (words.length === 2) {
      const [first, last] = words;
      // Check capitalization (First char upper, rest lower is typical, but ALL CAPS is also possible)
      // Let's be strict: First char MUST be upper.
      const isName = /^[A-ZÀ-ÖØ-Þ]/.test(first) && /^[A-ZÀ-ÖØ-Þ]/.test(last) &&
        !/\d/.test(line.clean) && // No numbers
        !/[@:;]/.test(line.clean) && // No special chars
        line.clean.length < 40;

      if (isName) {
        data.fn = `${first} ${last}`;
        data.n = `${last};${first}`;
        line.isConsumed = true;
        line.type = 'NAME';
        return; // Found it
      }
    }
  }
};

const consumeLeftovers = (lines: Line[], data: ParserData) => {
  // If we still have no Company, take the first unconsumed line
  if (!data.org) {
    const firstUnconsumed = lines.find(l => !l.isConsumed && l.clean.length > 2);
    if (firstUnconsumed) {
      data.org = firstUnconsumed.clean;
      firstUnconsumed.isConsumed = true;
      firstUnconsumed.type = 'ORG';
    }
  }

  // If we still have no Name, take the NEXT unconsumed line (or the first if we just took org)
  if (!data.fn) {
    const nextUnconsumed = lines.find(l => !l.isConsumed && l.clean.length > 2);
    if (nextUnconsumed) {
      // Simple heuristic: If it has 2 words, it might be a name
      const parts = nextUnconsumed.clean.split(' ');
      if (parts.length >= 2) {
        data.fn = nextUnconsumed.clean;
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

export const parseImpressumToVCard = (text: string): string => {
  // 1. Prepare Lines
  const cleanText = sanitizeText(text);
  const rawLines = cleanText.split(/\r\n|\r|\n/);
  const lines: Line[] = rawLines
    .map(l => ({ original: l, clean: l.trim(), isConsumed: false }))
    .filter(l => l.clean.length > 0);

  // 2. Initialize Data
  // 2. Initialize Data
  const data: ParserData = {
    fn: "", n: "", org: "", title: "",
    tel: [], email: [], url: [], adr: [], note: []
  };

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
  consumeLeftovers(lines, data); // Fallbacks

  // 4. Construct vCard
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

  return vcard.join('\n');
};