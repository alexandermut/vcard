
const re_zip_generic = /(?:\s|^)(A-|CH-|D-|BE-|PL-|CZ-|NL-|FR-|IT-|ES-|DK-|SE-|NO-|FI-)?([0-9]{4,5})(?=\s|$)/i;

const tests = [
    "Wienzeile 5, A-1010 Wien",
    "D-12345 Musterstadt",
    "12345 Musterstadt",
    "CH-8000 Zürich"
];

tests.forEach(t => {
    const match = t.match(re_zip_generic);
    console.log(`"${t}" -> Match=${!!match}`);
    if (match) {
        console.log(`  Group 1: "${match[1]}"`);
        console.log(`  Group 2: "${match[2]}"`);
    }
});
