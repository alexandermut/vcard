import { initDB } from '../utils/db';
import { findDuplicates } from '../utils/deduplicationUtils';
import { HistoryItem } from '../types';

const STORE_NAME = 'history';

self.onmessage = async (e: MessageEvent) => {
    const { type } = e.data;

    if (type === 'findDuplicates') {
        try {
            // 1. Fetch all contacts from DB
            const db = await initDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            // Use getAll to fetch all items. For 20k items, this might be memory intensive but manageable in a worker.
            // Optimization: We could stream with cursor if findDuplicates was streaming-aware.
            // For now, we load all.
            const contacts = await tx.store.getAll();

            // 2. Run deduplication logic
            // This is the heavy O(n^2) part
            const groups = findDuplicates(contacts);

            // 3. Send back results
            self.postMessage({ type: 'results', groups });
        } catch (error: any) {
            self.postMessage({ type: 'error', error: error.message });
        }
    }
};
