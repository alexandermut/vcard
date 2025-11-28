import { useGoogleContacts } from './GoogleContactsContext';

// Re-export for backward compatibility, but now using the shared context
export const useGoogleContactsAuth = () => {
    return useGoogleContacts();
};

