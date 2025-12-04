export const LEGAL_FORMS = {
    kapitalgesellschaften: [
        'GmbH & Co. KGaA', 'GmbH & Co. KG', 'GmbH & Co. OHG', 'GmbH & Co.',
        'AG & Co. KG', 'UG & Co. KG', 'SE & Co. KG', 'Ltd. & Co. KG',
        'Stiftung & Co. KG', 'gGmbH', 'GmbH', 'UG (haftungsbeschränkt)',
        'UG', 'AG', 'SE', 'KGaA', 'Limited', 'Ltd.', 'Inc.', 'Corp.', 'LLC', 'S.A.', 'S.à r.l.', 'B.V.'
    ],
    personengesellschaften: [
        'e.K.', 'e.Kfr.', 'Inh.', 'GbR', 'OHG', 'KG', 'PartG mbB', 'PartG'
    ],
    nonprofit: [
        'e.V.', 'Stiftung', 'gAG'
    ],
    public: [
        'AöR', 'KöR', 'KdöR'
    ]
};

export const INDUSTRY_KEYWORDS = [
    'Praxis', 'Kanzlei', 'Agentur', 'Büro', 'Studio', 'Salon', 'Friseur',
    'Apotheke', 'Klinik', 'Zentrum', 'Institut', 'Werkstatt', 'Handwerk',
    'Bau', 'Architekt', 'Ingenieur', 'Steuerberater', 'Rechtsanwalt', 'Notar',
    'Consulting', 'Beratung', 'Service', 'Support', 'Hotline', 'Vertrieb',
    'Logistik', 'Transport', 'Immobilien', 'Makler', 'Verlag', 'Druckerei',
    'Restaurant', 'Hotel', 'Café', 'Bar', 'Bistro', 'Catering', 'Event',
    'Schule', 'Akademie', 'Universität', 'Hochschule', 'Kindergarten',
    'Verein', 'Verband', 'Stiftung', 'Genossenschaft', 'Gewerbe', 'Handel',
    'Shop', 'Store', 'Markt', 'Outlet', 'Boutique'
];

/**
 * Generates a regex pattern that matches any of the defined legal forms.
 * - LEGAL_FORMS are matched with strict word boundaries (to avoid "Beitrag" matching "AG").
 * - INDUSTRY_KEYWORDS are matched as suffixes (to allow "Zahnarztpraxis" matching "Praxis").
 */
export const getLegalFormsRegex = (): RegExp => {
    const legalForms = [
        ...LEGAL_FORMS.kapitalgesellschaften,
        ...LEGAL_FORMS.personengesellschaften,
        ...LEGAL_FORMS.nonprofit,
        ...LEGAL_FORMS.public
    ];

    const keywords = INDUSTRY_KEYWORDS;

    // Escape special regex characters
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const escapedLegalForms = legalForms.map(escape);
    const escapedKeywords = keywords.map(escape);

    // Sort by length descending
    escapedLegalForms.sort((a, b) => b.length - a.length);
    escapedKeywords.sort((a, b) => b.length - a.length);

    // Pattern 1: Strict Legal Forms (Word Boundary start)
    // (?:^|\s) -> Start of string or whitespace
    const patternLegal = `(?:^|\\s)(${escapedLegalForms.join('|')})`;

    // Pattern 2: Industry Keywords (Suffix allowed)
    // (?:^|[\s\w]*) -> Start, whitespace, or any word characters (compound nouns)
    // We use [a-zA-Zäöüß]* to allow German letters in compound parts
    const patternKeywords = `(?:^|[\\s]|(?<=[a-zA-Zäöüß]))(${escapedKeywords.join('|')})`;

    // Combine: (StrictForm)|(SuffixKeyword)
    // Followed by End or Separator
    // Note: We need to wrap the whole thing to ensure the suffix check works
    // But wait, regex OR `|` works.

    // Let's construct a single regex with two alternatives
    // Alt 1: Strict forms
    // Alt 2: Keywords (preceded by optional word chars)

    // We need to be careful about the "End" boundary.
    // Both should be followed by boundary or punctuation.
    const endBoundary = `(?:$|[\\s.,:;])`;

    return new RegExp(`(${patternLegal}|${patternKeywords})${endBoundary}`, 'i');
};
