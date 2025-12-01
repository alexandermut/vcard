import { generateBackupZip } from '../utils/zipUtils';
import { generateCSV, parseCSV, csvToVCard } from '../utils/csvUtils';
import { generateJSON } from '../utils/jsonUtils';
import { parseVCardString } from '../utils/vcardUtils';
import { HistoryItem } from '../types';

self.onmessage = async (e: MessageEvent) => {
    const { type, payload, id } = e.data;

    try {
        let result;

        switch (type) {
            case 'generateBackupZip':
                // payload: history items
                result = await generateBackupZip(payload);
                break;

            case 'generateCSV':
                // payload: history items
                result = generateCSV(payload);
                break;

            case 'generateJSON':
                // payload: history items
                result = await generateJSON(payload);
                break;

            case 'parseVCardFile':
                // payload: vcard string
                // We split and parse to ensure validity, but for import we often just need the strings
                // Actually, App.tsx logic splits by END:VCARD.
                // Let's move that logic here.
                const rawVcards = payload.split('END:VCARD')
                    .map((v: string) => v.trim() + '\nEND:VCARD')
                    .filter((v: string) => v.includes('BEGIN:VCARD'));
                result = rawVcards;
                break;

            case 'parseCSVFile':
                // payload: csv string
                const data = parseCSV(payload);
                result = csvToVCard(data);
                break;

            default:
                throw new Error(`Unknown message type: ${type}`);
        }

        self.postMessage({ type: 'success', id, result });

    } catch (error: any) {
        self.postMessage({ type: 'error', id, error: error.message });
    }
};
