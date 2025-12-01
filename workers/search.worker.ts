import { initDB } from '../utils/db';
import { HistoryItem } from '../types';

const STORE_NAME = 'history';

self.onmessage = async (e: MessageEvent) => {
    const { type, query } = e.data;

    if (type === 'search') {
        try {
            const results = await searchHistory(query);
            self.postMessage({ type: 'results', results });
        } catch (error: any) {
            self.postMessage({ type: 'error', error: error.message });
        }
    }
};

const searchHistory = async (query: string): Promise<HistoryItem[]> => {
    const db = await initDB();
    const terms = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);

    if (terms.length === 0) {
        // If empty query, return latest 50 items
        const tx = db.transaction(STORE_NAME, 'readonly');
        const index = tx.store.index('by-date');
        let cursor = await index.openCursor(null, 'prev');
        const results: HistoryItem[] = [];
        let count = 0;
        while (cursor && count < 50) {
            results.push(cursor.value);
            count++;
            cursor = await cursor.continue();
        }
        return results;
    }

    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('keywords');

    // Use first term for index range
    const firstTerm = terms[0];
    const range = IDBKeyRange.bound(firstTerm, firstTerm + '\uffff');

    const uniqueItems = new Map<string, HistoryItem>();
    let valueCursor = await index.openCursor(range);

    while (valueCursor && uniqueItems.size < 50) {
        const item = valueCursor.value;

        // Verify ALL terms match (in memory filter)
        const itemKeywords = item.keywords || [];
        const allTermsMatch = terms.every(term =>
            itemKeywords.some(k => k.startsWith(term))
        );

        if (allTermsMatch) {
            // Note: We do NOT create ObjectURLs here because they might not be valid in the main thread
            // or we want to let the main thread handle display logic.
            // However, Blobs are transferrable.
            // If we want to display images, we might need to convert them to ObjectURLs in the UI component.
            // For now, we pass the item as is.
            uniqueItems.set(item.id, item);
        }

        valueCursor = await valueCursor.continue();
    }

    return Array.from(uniqueItems.values());
};
