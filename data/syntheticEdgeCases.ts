export const syntheticEdgeCases = [
    // =================================================================
    // KATEGORIE 1: FORMAT-HÖLLE (Die Klassiker)
    // =================================================================
    {
        id: "synth_format_dots",
        text: `
      Dr. Dot Tester
      Tel.040.123.45.67
      M.0171.99.88.77.6
    `,
        expected: {
            fn: "Dr. Dot Tester",
            tel: "+49401234567",
            cell: "+491719988776"
        }
    },
    {
        id: "synth_format_slashes_mixed",
        text: `
      Slashy McSlashface
      T: +49 30 / 123 45 - 0
      F: +49 (0) 30 // 123 45 - 99
    `,
        expected: {
            fn: "Slashy McSlashface",
            tel: "+4930123450",
            fax: "+49301234599"
        }
    },
    {
        id: "synth_sticky_text",
        text: `
      KeinPlatz GmbH
      Kontakt:Tel:+4989123456Mail:info@keinplatz.de
    `,
        expected: {
            org: "KeinPlatz GmbH",
            tel: "+4989123456",
            email: "info@keinplatz.de"
        }
    },
    {
        id: "synth_pipe_separator",
        text: `
      Designer Studio • Berlin
      Max Kreativ | Art Director
      +49 171 555 666 | m.kreativ@design.studio | www.design.studio
      Holzmarktstr. 25 | 10243 Berlin
    `,
        expected: {
            fn: "Max Kreativ",
            title: "Art Director",
            org: "Designer Studio",
            cell: "+49171555666",
            email: "m.kreativ@design.studio",
            url: "design.studio",
            adr: "Holzmarktstr. 25, 10243 Berlin"
        }
    },
    {
        id: "syn_sticky_text_v2",
        text: `
      MaxMustermann
      Musterstraße1
      10115Berlin
      Tel:030123456
      `,
        expected: {
            fn: "Max Mustermann",
            adr: "Musterstraße 1, 10115 Berlin",
            tel: "+4930123456"
        }
    },
    {
        id: "syn_newlines_mess",
        text: `Max Mustermann | CEO | Musterfirma
      Musterstr. 1 | 12345 Musterstadt
      max@muster.de | 0171 1234567`,
        expected: {
            fn: "Max Mustermann",
            title: "CEO",
            org: "Musterfirma",
            adr: "Musterstr. 1, 12345 Musterstadt",
            email: "max@muster.de",
            cell: "+491711234567"
        }
    },

    // =================================================================
    // KATEGORIE 2: OCR-FEHLER & TYPOS (Der Endgegner)
    // =================================================================
    {
        id: "synth_ocr_l_for_1",
        text: `
      0CR Victim
      TeI: 040 / l23 456
      MobiI: 0l70 / 555 666
    `,
        expected: {
            fn: "OCR Victim",
            tel: "+4940123456",
            cell: "+49170555666"
        }
    },
    {
        id: "synth_ocr_o_for_0",
        text: `
      Bad Scan AG
      T: O3O / 123456
      M: O176 / 987654
    `,
        expected: {
            org: "Bad Scan AG",
            tel: "+4930123456",
            cell: "+49176987654"
        }
    },
    {
        id: "syn_ocr_errors_v2",
        text: `
      M4x Mustermann
      Emai1: max@example.c0m
      Te1: 0171 l234567
      `,
        expected: {
            fn: "Max Mustermann",
            email: "max@example.com",
            cell: "+491711234567"
        }
    },
    {
        id: "syn_typo_labels",
        text: `
      Lisa Müller
      Emial: lisa@mueller.de
      Telephon: 030 999999
      Webseite: www.mueller.de
      `,
        expected: {
            fn: "Lisa Müller",
            email: "lisa@mueller.de",
            tel: "+4930999999",
            url: "www.mueller.de"
        }
    },
    {
        id: "synth_ocr_spaces_in_numbers",
        text: `
      Ghost Spacer
      T: + 4 9 ( 0 ) 4 0 1 2 3
    `,
        expected: {
            fn: "Ghost Spacer",
            tel: "+4940123"
        }
    },

    // =================================================================
    // KATEGORIE 3: ROLLEN, TITEL & NAMEN
    // =================================================================
    {
        id: "synth_role_bottom",
        text: `
      Die Firma GmbH
      Musterstraße 1
      12345 Berlin
      
      Vertreten durch den Geschäftsführer:
      Hans Guckindieluft
    `,
        expected: {
            org: "Die Firma GmbH",
            fn: "Hans Guckindieluft",
            title: "Geschäftsführer",
            adr: "Musterstraße 1, 12345 Berlin"
        }
    },
    {
        id: "synth_multi_role",
        text: `
      MegaCorp AG
      Vorstand: Dr. Boss (Vorsitz), Max Knecht (Stellv.)
      Aufsichtsrat: Lisa Wichtig
    `,
        expected: {
            org: "MegaCorp AG",
            fn: "Dr. Boss",
            title: "Vorstand"
        }
    },
    {
        id: "syn_multi_role_academic",
        text: `
      Prof. Dr. Dr. h.c. mult. Max Mustermann
      Vorstandsvorsitzender & CEO
      Universität Musterstadt
      `,
        expected: {
            fn: "Prof. Dr. Dr. h.c. mult. Max Mustermann",
            title: "Vorstandsvorsitzender & CEO",
            org: "Universität Musterstadt"
        }
    },
    {
        id: "syn_mixed_formats_doctor",
        text: `
      Dr. Med. Hans Wurst
      Tel. +49 (0) 30 / 123 45 - 67
      Fax: 030.123.45.68
      Mobile: 0171-1234567
      `,
        expected: {
            fn: "Dr. Med. Hans Wurst",
            title: "",
            org: "",
            fax: "+49301234568",
            cell: "+491711234567"
        }
    },

    // =================================================================
    // KATEGORIE 4: ADRESSEN & ORTE (Der Anker-Test)
    // =================================================================
    {
        id: "synth_anchor_match",
        text: `
      Hafenarbeiter GmbH
      20457 Hamburg
      Tel: 040 999 888
    `,
        expected: {
            org: "Hafenarbeiter GmbH",
            tel: "+4940999888",
            adr: "20457 Hamburg"
        }
    },
    {
        id: "synth_anchor_mismatch",
        text: `
      Remote Worker
      10115 Berlin
      Tel: 089 / 123 456 (Zentrale München)
    `,
        expected: {
            fn: "Remote Worker",
            tel: "+4989123456",
            adr: "10115 Berlin"
        }
    },
    {
        id: "syn_address_weird",
        text: `
      Firma GmbH
      Hinterhof 2. OG, Aufgang B
      Musterweg 7a
      D-12345 Musterstadt
      `,
        expected: {
            org: "Firma GmbH",
            adr: "Musterweg 7a, 12345 Musterstadt"
        }
    },
    {
        id: "synth_inline_address",
        text: `
      Besuchen Sie uns in der Hauptstraße 5, 50667 Köln zu unseren Öffnungszeiten.
      Ihr Team von Kölle Alaaf.
    `,
        expected: {
            org: "Kölle Alaaf",
            adr: "Hauptstraße 5, 50667 Köln"
        }
    },

    // =================================================================
    // KATEGORIE 5: HANDY ERKENNUNG
    // =================================================================
    {
        id: "synth_mobile_check_hard",
        text: `
      Daniel Roaming
      Festnetz: 0151 / 123 456 78
      (Erreichbar nur mobil)
    `,
        expected: {
            fn: "Daniel Roaming",
            tel: "",
            cell: "+4915112345678"
        }
    },
    {
        id: "synth_fake_mobile",
        text: `
      Fritz Festnetz
      Tel: 030 / 157 157
    `,
        expected: {
            fn: "Fritz Festnetz",
            tel: "+4930157157",
            cell: ""
        }
    },
    {
        id: "syn_no_name_service",
        text: `
      Info Service GmbH
      Kontaktieren Sie uns:
      info@service.de
      0800 123456
      `,
        expected: {
            org: "Info Service GmbH",
            email: "info@service.de",
            tel: "+49800123456"
        }
    },
    {
        id: "synth_no_labels",
        text: `
      Minimalist
      0176 12345678
      030 98765432
    `,
        expected: {
            org: "Minimalist",
            tel: "+493098765432",
            cell: "+4917612345678"
        }
    },

    // =================================================================
    // KATEGORIE 6: WEBSITE & EMAIL & NOISE
    // =================================================================
    {
        id: "synth_url_typo",
        text: `
      Typo GmbH
      Mail: info@typo-gmbh.de
      Web: www,typo-gmbh,de
    `,
        expected: {
            org: "Typo GmbH",
            email: "info@typo-gmbh.de",
            url: "typo-gmbh.de"
        }
    },
    {
        id: "syn_legal_disclaimer",
        text: `
      Max Mustermann
      CEO
      max@company.com
      
      This email is confidential. If you are not the intended recipient, please delete it.
      Geschäftsführer: Max Mustermann
      Amtsgericht Berlin HRB 12345
      `,
        expected: {
            fn: "Max Mustermann",
            title: "CEO",
            email: "max@company.com",
            org: "company.com"
        }
    },
    {
        id: "synth_email_spaced",
        text: `
      Anti Bot
      E-Mail: kontakt [at] anti-bot . com
    `,
        expected: {
            fn: "Anti Bot",
            email: "kontakt@anti-bot.com"
        }
    },
    {
        id: "synth_no_http",
        text: `
      Modern Startup
      visit us at modern-startup.io
    `,
        expected: {
            org: "Modern Startup",
            url: "modern-startup.io"
        }
    },

    // =================================================================
    // KATEGORIE 7: INTERNATIONAL (DACH & US)
    // =================================================================
    {
        id: "synth_swiss_format",
        text: `
      Grüezi AG
      Zürichstrasse 1
      CH-8000 Zürich
      Tel +41 44 123 45 67
      Natel +41 79 987 65 43
    `,
        expected: {
            org: "Grüezi AG",
            tel: "+41441234567",
            cell: "+41799876543",
            adr: "Zürichstrasse 1, 8000 Zürich, Schweiz"
        }
    },
    {
        id: "synth_austria_format",
        text: `
      Servus GmbH
      Wienzeile 5, A-1010 Wien
      T: +43 (0) 1 / 234 56 78
    `,
        expected: {
            org: "Servus GmbH",
            tel: "+4312345678",
            adr: "Wienzeile 5, 1010 Wien, Österreich"
        }
    },
    {
        id: "syn_international_us",
        text: `
      John Doe
      123 Main St
      New York, NY 10001
      USA
      Phone: +1 212 555 1234
      `,
        expected: {
            fn: "John Doe",
            tel: "+12125551234",
            adr: "123 Main St, New York"
        }
    },

    // =================================================================
    // KATEGORIE 8: IMPRESSUM CHAOS
    // =================================================================
    {
        id: "synth_impressum_nested",
        text: `
      Herausgeber:
      Medienhaus Nord
      Ein Unternehmen der Nord-Gruppe
      
      Anschrift:
      Nordstraße 1
      20095 Hamburg
      
      Geschäftsführung:
      Susi Sorglos, Peter Pan
      
      Kontakt Redaktion:
      Tel. 040-11111 (Durchwahl -20)
      Fax 040-11111-99
      redaktion@nord.de
    `,
        expected: {
            org: "Medienhaus Nord",
            fn: "Susi Sorglos",
            title: "Geschäftsführung",
            tel: "+49401111120",
            fax: "+49401111199",
            email: "redaktion@nord.de",
            adr: "Nordstraße 1, 20095 Hamburg"
        }
    },

    // =================================================================
    // KATEGORIE 9: FALSE POSITIVES (Dinge, die KEINE Nummern sind)
    // =================================================================
    {
        id: "synth_opening_hours_trap",
        text: `
      Friseur Salon Schnittig
      Termine unter: 040 123 456
      Öffnungszeiten:
      Mo - Fr: 09:00 - 18:00
      Sa: 10:00 - 14:00
    `,
        expected: {
            org: "Friseur Salon Schnittig",
            tel: "+4940123456",
            // WICHTIG: Die Zeiten dürfen NICHT als Nummern erkannt werden!
        }
    },
    {
        id: "synth_iban_trap",
        text: `
      Zahlung bitte an:
      Max Mustermann
      IBAN: DE89 3705 0198 1234 5678 00
      BIC: COBA DE FF XXX
      Tel bei Rückfragen: 0171 111 222 3
    `,
        expected: {
            fn: "Max Mustermann",
            cell: "+491711112223"
            // WICHTIG: Die IBAN darf NICHT als Telefonnummer erkannt werden.
        }
    },
    {
        id: "synth_date_trap",
        text: `
      Event-Planung
      Wir rufen zurück am 10.10.2025 um 14.00 Uhr.
      Hotline: 0800 555 666
    `,
        expected: {
            org: "Event-Planung",
            tel: "+49800555666"
        }
    },

    // =================================================================
    // KATEGORIE 10: KOMPLEXE NAMEN & ADRESSEN
    // =================================================================
    {
        id: "synth_noble_names",
        text: `
      Prof. Dr. Hans-Georg von der Wiese
      Schlossallee 1
      München
    `,
        expected: {
            fn: "Prof. Dr. Hans-Georg von der Wiese",
            adr: "Schlossallee 1, München"
        }
    },
    {
        id: "synth_postbox_co",
        text: `
      Geheimagentur GmbH
      c/o Briefkasten-Firma
      Postfach 12 34
      10115 Berlin
    `,
        expected: {
            org: "Geheimagentur GmbH",
            adr: "Postfach 12 34, 10115 Berlin"
        }
    },

    // =================================================================
    // KATEGORIE 11: SONDERNUMMERN & SERVICES
    // =================================================================
    {
        id: "synth_service_numbers",
        text: `
      Support Hotline
      Kostenlos: 0800 / 123 456 7
      Premium: 0900 - 666 666 (1,99€/Min)
      Service: 01805 . 123 123
    `,
        expected: {
            org: "Support Hotline",
            tel: "+498001234567"
        }
    },
    // =================================================================
    // KATEGORIE 12: RECHTSFORMEN & BRANCHEN (Der neue DB-Test)
    // =================================================================
    {
        id: "synth_complex_legal_forms_kg",
        text: `
      Musterfirma GmbH & Co. KG
      Industriestraße 1
      12345 Musterstadt
    `,
        expected: {
            org: "Musterfirma GmbH & Co. KG",
            adr: "Industriestraße 1, 12345 Musterstadt"
        }
    },
    {
        id: "synth_complex_legal_forms_ev",
        text: `
      Verein für Sport e.V.
      Sportplatz 1
      12345 Musterstadt
    `,
        expected: {
            org: "Verein für Sport e.V.",
            adr: "Sportplatz 1, 12345 Musterstadt"
        }
    },
    {
        id: "synth_industry_keywords_praxis",
        text: `
      Zahnarztpraxis Dr. Bohrer
      Behandlung von Karies
      Termine: 030 123456
    `,
        expected: {
            org: "Zahnarztpraxis Dr. Bohrer", // Should match via "Praxis"
            tel: "+4930123456"
        }
    },
    {
        id: "synth_industry_keywords_kanzlei",
        text: `
      Rechtsanwaltskanzlei Recht & Ordnung
      Anwaltstr. 1
      10115 Berlin
    `,
        expected: {
            org: "Rechtsanwaltskanzlei Recht & Ordnung", // Should match via "Kanzlei"
            adr: "Anwaltstr. 1, 10115 Berlin"
        }
    },
    {
        id: 'intl-us-address',
        text: `
      John Doe
      Acme Corp
      123 Main St
      New York, NY 10001
      USA
      Tel: +1 212 555 1234
    `,
        expected: {
            fn: 'John Doe',
            org: 'Acme Corp',
            tel: [{ value: '+12125551234', type: 'WORK' }],
            adr: [{ city: 'New York', zip: '10001', street: '123 Main St', country: 'USA' }]
        }
    },
    {
        id: 'intl-complex-name',
        text: `
      Prof. Dr. John Smith PhD
      University of Example
      Musterstr. 1
      12345 Berlin
    `,
        expected: {
            fn: 'Prof. Dr. John Smith',
            org: 'University of Example',
            adr: [{ city: 'Berlin', zip: '12345', street: 'Musterstr. 1' }]
        }
    },
    {
        id: 'user_report_title_newline',
        text: `
      Geschäftsleitung:

      Thomas Mau
    `,
        expected: {
            fn: 'Thomas Mau',
            title: 'Geschäftsleitung'
        }
    },
    {
        id: 'user_report_url_dupe',
        text: `
      Web: www.webseite.de
      URL: http://webseite.de
    `,
        expected: {
            url: 'https://www.webseite.de' // Expecting deduplication or at least one valid URL
        }
    }
];