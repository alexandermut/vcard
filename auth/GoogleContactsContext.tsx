import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useGoogleLogin, TokenResponse } from '@react-oauth/google';
import { toast } from 'sonner';

interface GoogleContactsContextType {
    login: () => void;
    token: string | null;
    isAuthenticated: boolean;
}

const GoogleContactsContext = createContext<GoogleContactsContextType | undefined>(undefined);

export const GoogleContactsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);

    const login = useGoogleLogin({
        onSuccess: (tokenResponse: TokenResponse) => {
            console.log('Google Login Success:', tokenResponse);
            setToken(tokenResponse.access_token);
        },
        onError: (errorResponse) => {
            console.error("Google Login Failed", errorResponse);

            if (errorResponse.error === 'popup_closed_by_user') {
                toast.info("Google Login abgebrochen.");
            } else if (errorResponse.error === 'access_denied') {
                toast.error("Zugriff verweigert. Bitte Domain in Google Cloud Console freigeben.");
            } else {
                toast.error(`Google Login fehlgeschlagen: ${errorResponse.error_description || errorResponse.error}`);
            }
        },
        scope: 'https://www.googleapis.com/auth/contacts',
        flow: 'implicit',
    });

    return (
        <GoogleContactsContext.Provider value={{ login, token, isAuthenticated: !!token }}>
            {children}
        </GoogleContactsContext.Provider>
    );
};

export const useGoogleContacts = () => {
    const context = useContext(GoogleContactsContext);
    if (context === undefined) {
        // Return a safe fallback instead of throwing to prevent app crash
        // when Google Client ID is missing or Provider is not mounted.
        return {
            login: () => {
                console.warn("Google Login attempted but Provider is missing (likely missing VITE_GOOGLE_CLIENT_ID).");
                toast.error("Google Integration ist nicht konfiguriert (fehlende Client ID).");
            },
            token: null,
            isAuthenticated: false
        };
    }
    return context;
};
