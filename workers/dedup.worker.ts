import { initDB } from '../utils/db';
import { DedupIndexer } from '../utils/deduplicationUtils';

const STORE_NAME = 'history';

self.onmessage = async (e: MessageEvent) => {
    const { type } = e.data;

    if (type === 'findDuplicates') {
        try {
            // 1. Initialize DB and Indexer
            const db = await initDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const indexer = new DedupIndexer();

            // 2. Stream contacts using Cursor
            let cursor = await tx.store.openCursor();
            let count = 0;

            while (cursor) {
                indexer.add(cursor.value);
                count++;

                // Optional: Report progress every 1000 items
                if (count % 1000 === 0) {
                    // self.postMessage({ type: 'progress', count });
                }

                cursor = await cursor.continue();
            }

            // 3. Get Results
            const groups = indexer.getResults();

            // 4. Send back results
            self.postMessage({ type: 'results', groups });
        } catch (error: any) {
            self.postMessage({ type: 'error', error: error.message });
        }
    }
};
