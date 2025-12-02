import { parseImpressumToVCard } from './regexParser';

self.onmessage = (e: MessageEvent) => {
    const text = e.data;
    try {
        const vcard = parseImpressumToVCard(text);
        self.postMessage({ type: 'success', result: vcard });
    } catch (err) {
        self.postMessage({ type: 'error', error: (err as Error).message });
    }
};
