import { useState, useEffect, useCallback } from 'react';
import { useGoogleContactsAuth } from '../auth/useGoogleContactsAuth';
import { searchGoogleContacts, GoogleContact } from '../services/googleContactsService';
import { searchLocalGoogleContacts } from '../utils/db';

export const useGoogleSearch = () => {
    const { token } = useGoogleContactsAuth();
    const [results, setResults] = useState<GoogleContact[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [localCount, setLocalCount] = useState(0);

    const search = useCallback(async (query: string) => {
        setIsSearching(true);

        try {
            // 1. Local Search (Fast)
            // Limit to 50 to prevent UI freezing with 25k+ contacts
            const localResults = await searchLocalGoogleContacts(query, 50);
            setLocalCount(localResults.length);

            // If query is short, just return local results to save API calls
            if (!query || query.length < 3) {
                setResults(localResults);
                setIsSearching(false);
                return;
            }

            // 2. Remote Search (Slow but complete)
            // Only if we have a token
            let remoteResults: GoogleContact[] = [];
            if (token) {
                remoteResults = await searchGoogleContacts(token, query);
            }

            // 3. Merge & Deduplicate
            // Prefer local data if available (might be fresher if we just synced? actually remote is fresher)
            // But remote search result object structure is same as connection object.

            const mergedMap = new Map<string, GoogleContact>();

            // Add local first
            localResults.forEach(c => mergedMap.set(c.resourceName, c));

            // Add/Overwrite with remote (remote is authority)
            remoteResults.forEach(c => mergedMap.set(c.resourceName, c));

            setResults(Array.from(mergedMap.values()));

        } catch (e) {
            console.error("Hybrid search failed", e);
            // Fallback to whatever we have locally
            const local = await searchLocalGoogleContacts(query);
            setResults(local);
        } finally {
            setIsSearching(false);
        }
    }, [token]);

    return {
        results,
        isSearching,
        localCount,
        search
    };
};
