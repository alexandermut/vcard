import { VCardData, VCardAddress } from '../types';

interface VCardLine {
    group?: string;
    key: string;
    params: Record<string, string | string[]>;
    value: string;
}

export class VCardParser {
    public static parse(vcard: string): { data: VCardData; isValid: boolean } {
        const lines = this.unfoldLines(vcard);
        const parsedLines: VCardLine[] = [];

        let isValid = false;

        for (const line of lines) {
            if (!line.trim()) continue;

            // Check for BEGIN/END
            if (line.toUpperCase().trim() === 'BEGIN:VCARD') {
                isValid = true;
                continue;
            }
            if (line.toUpperCase().trim() === 'END:VCARD') continue;

            const parsed = this.parseLine(line);
            if (parsed) {
                parsedLines.push(parsed);
            }
        }

        const data = this.mapToData(parsedLines);
        return { data, isValid };
    }

    /**
     * Unfolds lines according to RFC 6350 (lines starting with space/tab are continuations)
     */
    private static unfoldLines(vcard: string): string[] {
        const lines = vcard.split(/\r\n|\r|\n/);
        const unfolded: string[] = [];

        for (const line of lines) {
            if (line.length === 0) continue;

            if (line.startsWith(' ') || line.startsWith('\t')) {
                // It's a continuation
                if (unfolded.length > 0) {
                    unfolded[unfolded.length - 1] += line.substring(1);
                }
            } else {
                unfolded.push(line);
            }
        }
        return unfolded;
    }

    /**
     * Parses a single line into key, params, and value
     * Format: [group.]key[;param=value...]:value
     */
    private static parseLine(line: string): VCardLine | null {
        // Find the first colon that is NOT inside a quoted parameter
        let colonIndex = -1;
        let inQuote = false;

        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') {
                inQuote = !inQuote;
            } else if (line[i] === ':' && !inQuote) {
                colonIndex = i;
                break;
            }
        }

        if (colonIndex === -1) return null;

        const keyPart = line.substring(0, colonIndex);
        let valuePart = line.substring(colonIndex + 1);

        // Parse Key and Params
        const keyParams = this.parseKeyAndParams(keyPart);

        // Decode Value if needed
        valuePart = this.decodeValue(valuePart, keyParams.params);

        return {
            group: keyParams.group,
            key: keyParams.key,
            params: keyParams.params,
            value: valuePart
        };
    }

    private static parseKeyAndParams(rawKey: string): { group?: string, key: string, params: Record<string, string | string[]> } {
        // Split by semicolon, respecting quotes
        const parts: string[] = [];
        let current = '';
        let inQuote = false;

        for (let i = 0; i < rawKey.length; i++) {
            const char = rawKey[i];
            if (char === '"') {
                inQuote = !inQuote;
                current += char;
            } else if (char === ';' && !inQuote) {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current);

        // First part is Group.Key or just Key
        let first = parts[0];
        let group: string | undefined;
        let key = first.toUpperCase();

        if (first.includes('.')) {
            const split = first.split('.');
            group = split[0];
            key = split[1].toUpperCase();
        }

        const params: Record<string, string | string[]> = {};

        // Process parameters
        for (let i = 1; i < parts.length; i++) {
            const param = parts[i];
            const eqIdx = param.indexOf('=');

            if (eqIdx > -1) {
                const pKey = param.substring(0, eqIdx).toUpperCase();
                let pVal = param.substring(eqIdx + 1);

                // Remove quotes
                pVal = pVal.replace(/^"|"$/g, '');

                // Handle multi-value params (comma separated)
                if (pVal.includes(',')) {
                    params[pKey] = pVal.split(',');
                } else {
                    params[pKey] = pVal;
                }
            } else {
                // Implicit parameter (e.g. TEL;WORK) -> TYPE=WORK
                // But we need to be careful. vCard 2.1 style.
                // Usually it maps to TYPE, unless it's known to be something else (like PREF).
                // For simplicity, we treat it as TYPE if it's not a known key=value pair.
                const pVal = param.replace(/^"|"$/g, '');
                if (!params['TYPE']) {
                    params['TYPE'] = [pVal];
                } else {
                    if (Array.isArray(params['TYPE'])) {
                        (params['TYPE'] as string[]).push(pVal);
                    } else {
                        params['TYPE'] = [params['TYPE'] as string, pVal];
                    }
                }
            }
        }

        return { group, key, params };
    }

    private static decodeValue(value: string, params: Record<string, string | string[]>): string {
        // 1. Handle Quoted-Printable
        const encoding = this.getParam(params, 'ENCODING');
        if (encoding === 'QUOTED-PRINTABLE') {
            return this.decodeQuotedPrintable(value);
        }

        // Note: We DO NOT unescape here anymore. 
        // Unescaping must happen AFTER splitting for structured fields.
        // For unstructured fields, we call unescape() explicitly in mapToData.
        return value.trim();
    }

    private static unescape(value: string): string {
        return value.replace(/\\n/gi, '\n')
            .replace(/\\,/g, ',')
            .replace(/\\;/g, ';')
            .replace(/\\\\/g, '\\');
    }

    /**
     * Splits a structured value by delimiter (usually ';') respecting escapes.
     */
    private static splitStructured(value: string, delimiter: string = ';'): string[] {
        const parts: string[] = [];
        let current = '';

        for (let i = 0; i < value.length; i++) {
            const char = value[i];
            if (char === '\\' && i + 1 < value.length) {
                // Escaped character, keep it for now (unescape later)
                current += char + value[i + 1];
                i++; // Skip next char
            } else if (char === delimiter) {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current);
        return parts;
    }

    private static normalizeDate(value: string): string {
        // Try to parse YYYYMMDD or YYYY-MM-DD
        const clean = value.replace(/-/g, '');
        if (clean.length === 8) {
            // YYYYMMDD -> YYYY-MM-DD
            return `${clean.substring(0, 4)}-${clean.substring(4, 6)}-${clean.substring(6, 8)}`;
        }
        return value;
    }

    private static decodeQuotedPrintable(input: string): string {
        // Remove soft breaks (=\n)
        let str = input.replace(/=\r?\n/g, '');

        // Decode =XX sequences
        try {
            // Use decodeURIComponent for UTF-8 bytes
            // Convert =C3=BC to %C3%BC
            str = str.replace(/=([0-9A-F]{2})/gi, '%$1');
            return decodeURIComponent(str);
        } catch (e) {
            // Fallback for non-UTF-8 or broken sequences
            return str.replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        }
    }

    private static getParam(params: Record<string, string | string[]>, key: string): string | undefined {
        const val = params[key];
        if (Array.isArray(val)) return val[0];
        return val;
    }

    private static mapToData(lines: VCardLine[]): VCardData {
        const data: VCardData = {
            email: [],
            tel: [],
            adr: [],
            url: [],
        };

        for (const line of lines) {
            const { key, value, params } = line;
            const type = this.getParam(params, 'TYPE') || 'Standard';

            // Safety check for [object Object]
            if (value.includes('[object Object]')) continue;

            switch (key) {
                case 'FN':
                    data.fn = this.unescape(value);
                    break;
                case 'N':
                    // Structured: Family;Given;Middle;Prefix;Suffix
                    const nParts = this.splitStructured(value, ';').map(p => this.unescape(p));
                    data.n = value;

                    if (!data.fn) {
                        const family = nParts[0] || '';
                        const given = nParts[1] || '';
                        const middle = nParts[2] || '';
                        const prefix = nParts[3] || '';
                        const suffix = nParts[4] || '';
                        data.fn = [prefix, given, middle, family, suffix].filter(p => p).join(' ').trim();
                    }
                    break;
                case 'ORG':
                    // Structured: Company;Unit
                    const orgParts = this.splitStructured(value, ';').map(p => this.unescape(p));
                    data.org = orgParts.join(' ').trim();
                    break;
                case 'TITLE':
                    data.title = this.unescape(value);
                    break;
                case 'ROLE':
                    data.role = this.unescape(value);
                    break;
                case 'EMAIL':
                    data.email?.push({ type: String(type), value: this.unescape(value) });
                    break;
                case 'TEL':
                    data.tel?.push({ type: String(type), value: this.unescape(value) });
                    break;
                case 'URL':
                    data.url?.push({ type: String(type), value: this.unescape(value) });
                    break;
                case 'ADR':
                    // Structured: PO;Ext;Street;City;Region;Zip;Country
                    const adrParts = this.splitStructured(value, ';').map(p => this.unescape(p));
                    const address: VCardAddress = {
                        street: adrParts[2] || '',
                        city: adrParts[3] || '',
                        region: adrParts[4] || '',
                        zip: adrParts[5] || '',
                        country: adrParts[6] || ''
                    };
                    data.adr?.push({ type: String(type), value: address });
                    break;
                case 'NOTE':
                    data.note = this.unescape(value);
                    break;
                case 'PHOTO':
                    data.photo = this.unescape(value);
                    break;
                case 'BDAY':
                    data.bday = this.normalizeDate(this.unescape(value));
                    break;
                case 'UID':
                    data.uid = this.unescape(value);
                    break;
            }
        }

        return data;
    }
}
