import React, { useEffect, useState } from 'react';
import { getTestContacts, TestContact } from '../utils/loadTestContacts';
import { parseImpressumToVCard } from '../utils/regexParser';
import { parseVCardString } from '../utils/vcardUtils';
import { VCardData } from '../types';
import { Check, X, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

interface TestResult {
    contact: TestContact;
    parsed: VCardData;
    passed: boolean;
    diff: string[];
}

export const RegexDebugger: React.FC = () => {
    const [results, setResults] = useState<TestResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const runTests = async () => {
        setLoading(true);
        const contacts = await getTestContacts();

        const newResults = contacts.map(contact => {
            const vcard = parseImpressumToVCard(contact.text);
            const parsed = parseVCardString(vcard).data;

            const diff: string[] = [];
            let passed = true;

            // Compare expected fields
            for (const [key, expectedValue] of Object.entries(contact.expected)) {
                let actualValue: any = undefined;

                // Map expected keys to VCardData keys
                if (key === 'fn') actualValue = parsed.fn;
                else if (key === 'n') actualValue = parsed.n;
                else if (key === 'org') actualValue = parsed.org;
                else if (key === 'title') actualValue = parsed.title;
                else if (key === 'email') {
                    // Check if expected email is in the list
                    const emails = parsed.email?.map(e => e.value) || [];
                    actualValue = emails.includes(expectedValue) ? expectedValue : emails.join(', ');
                }
                else if (key === 'url') {
                    const urls = parsed.url?.map(u => u.value) || [];
                    // Fuzzy check: does any URL contain the expected string?
                    actualValue = urls.find(u => u.includes(expectedValue)) || urls.join(', ');
                }
                else if (key === 'fax') {
                    const faxes = parsed.tel?.filter(t => t.type === 'FAX').map(t => t.value) || [];
                    actualValue = faxes.includes(expectedValue) ? expectedValue : faxes.join(', ');
                }
                else if (key === 'cell') {
                    const cells = parsed.tel?.filter(t => t.type === 'CELL').map(t => t.value) || [];
                    // If expected is empty string, we expect NO cell numbers
                    if (expectedValue === "") {
                        actualValue = cells.length === 0 ? "" : cells.join(', ');
                    } else {
                        actualValue = cells.includes(expectedValue) ? expectedValue : cells.join(', ');
                    }
                }
                else if (key === 'adr') {
                    // Construct address string from parsed data for comparison
                    const adrs = parsed.adr?.map(a => {
                        const parts = [a.value.street, a.value.zip, a.value.city].filter(p => p);
                        return parts.join(', '); // Simple "Street, ZIP City" format
                    }) || [];

                    // Check if any constructed address matches expected
                    // Expected format in test: "Street, ZIP City"
                    // We might need to be flexible here.
                    const match = adrs.find(a => a.includes(expectedValue) || expectedValue.includes(a));
                    actualValue = match || adrs.join(' | ');
                }
                // Add more mappings as needed

                if (actualValue !== expectedValue) {
                    passed = false;
                    diff.push(`${key}: Expected "${expectedValue}", got "${actualValue}"`);
                }
            }

            return { contact, parsed, passed, diff };
        });

        setResults(newResults);
        setLoading(false);
    };

    useEffect(() => {
        runTests();
    }, []);

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    if (!isOpen) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-slate-700 transition-colors"
                >
                    <span className={passedCount === totalCount ? "text-green-400" : "text-red-400"}>
                        ●
                    </span>
                    Regex Debugger ({passedCount}/{totalCount})
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-x-0 bottom-0 z-50 h-[50vh] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-slate-800 dark:text-white">Regex Debugger</h3>
                    <span className={`text-sm font-mono px-2 py-0.5 rounded ${passedCount === totalCount ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {passedCount} / {totalCount} Passed
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={runTests} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Rerun Tests">
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                        <ChevronDown size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                        <tr>
                            <th className="p-2 border border-slate-200 dark:border-slate-700 w-1/3">Input</th>
                            <th className="p-2 border border-slate-200 dark:border-slate-700 w-1/3">Result (JSON)</th>
                            <th className="p-2 border border-slate-200 dark:border-slate-700 w-1/3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((res) => (
                            <tr key={res.contact.id} className={res.passed ? "bg-green-50/50 dark:bg-green-900/10" : "bg-red-50/50 dark:bg-red-900/10"}>
                                <td className="p-2 border border-slate-200 dark:border-slate-700 align-top font-mono text-xs whitespace-pre-wrap">
                                    {res.contact.text}
                                </td>
                                <td className="p-2 border border-slate-200 dark:border-slate-700 align-top font-mono text-xs">
                                    <pre className="whitespace-pre-wrap max-h-40 overflow-auto">
                                        {JSON.stringify(res.parsed, null, 2)}
                                    </pre>
                                </td>
                                <td className="p-2 border border-slate-200 dark:border-slate-700 align-top">
                                    <div className="flex items-center gap-2 mb-2">
                                        {res.passed ? (
                                            <span className="flex items-center gap-1 text-green-600 font-bold">
                                                <Check size={16} /> Passed
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-red-600 font-bold">
                                                <X size={16} /> Failed
                                            </span>
                                        )}
                                    </div>
                                    {res.diff.length > 0 && (
                                        <ul className="list-disc list-inside text-red-600 text-xs space-y-1">
                                            {res.diff.map((d, i) => <li key={i}>{d}</li>)}
                                        </ul>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
