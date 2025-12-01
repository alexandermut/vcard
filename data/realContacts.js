export const difficultContacts = [

    {
        id: "case_abcfinance_wieland_full",
        text: `
abcfinance GmbH
Kamekestraße 2-8
50672 Köln
Telefon: (0221) 579 08-0
Telefax: (0221) 579 08-9126
E-Mail: info(at)abcfinance.de
Geschäftsführung:
Simon Wieland
  `,
        expected: {
            fn: "Simon Wieland",
            title: "Geschäftsführung",
            org: "abcfinance GmbH",
            email: "info@abcfinance.de",
            url: "abcfinance.de",           // NEU: Domain aus der E-Mail extrahiert
            tel: "0221579080",
            fax: "0221579089126",
            adr: "Kamekestraße 2-8, 50672 Köln"
        }
    },

    {
        id: "case_media_in_motion",
        text: `
Media in Motion e.K.
Bargkoppelweg 72
22145 Hamburg
Germany
​
Telefon    +49 40 2262111-60
Email      info(at)media-in-motion.com
Web        www.media-in-motion.com
​
Inhaber
Henning Heidmann
​
Sitz der Gesellschaft: Hamburg, Deutschland
Registergericht: Amtsgericht Hamburg HRA 104877
​
UST-ID-NR: DE304114555
  `,
        expected: {
            fn: "Henning Heidmann",
            title: "Inhaber",
            org: "Media in Motion e.K.",
            email: "info@media-in-motion.com", // (at) fix
            url: "www.media-in-motion.com",    // Explizite URL
            tel: "+4940226211160",             // Formatiert
            cell: "",                          // WICHTIG: Muss leer sein (Parser darf hier nichts erfinden)
            adr: "Bargkoppelweg 72, 22145 Hamburg, Germany"
        }
    },






    // Hier weitere echte Fälle reinkopieren...



];