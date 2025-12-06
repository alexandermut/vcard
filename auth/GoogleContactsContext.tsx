import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useGoogleLogin, TokenResponse } from '@react-oauth/google';
import { toast } from 'sonner';

interface GoogleContactsContextType {
    login: () => void;
    logout: () => void;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const GoogleContactsContext = createContext<GoogleContactsContextType | undefined>(undefined);

export const GoogleContactsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const login = useGoogleLogin({
        onSuccess: (tokenResponse: TokenResponse) => {
            console.log('Google Login Success:', tokenResponse);
            setToken(tokenResponse.access_token);
            setIsLoading(false);
        },
        onError: (errorResponse) => {
            console.error("Google Login Failed", errorResponse);
            setIsLoading(false);

            const errorCode = (errorResponse as any).error; // Cast to any to avoid strict type mismatch if types are outdated
            if (errorCode === 'popup_closed_by_user') {
                toast.info("Google Login abgebrochen.");
            } else if (errorCode === 'access_denied') {
                toast.error("Zugriff verweigert. Bitte Domain in Google Cloud Console freigeben.");
            } else {
                toast.error(`Google Login fehlgeschlagen: ${errorResponse.error_description || errorCode}`);
            }
        },
        onNonOAuthError: () => {
            setIsLoading(false);
        },
        scope: 'https://www.googleapis.com/auth/contacts',
        flow: 'implicit',
    });

    const handleLogin = () => {
        setIsLoading(true);
        login();
    };

    const logout = () => {
        setToken(null);
        // googleLogout(); // Optional: if we want to fully revoke. For now just clear local state.
        toast.info("Abgemeldet.");
    };

    return (
        <GoogleContactsContext.Provider value={{ login: handleLogin, logout, token, isAuthenticated: !!token, isLoading }}>
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
            logout: () => { },
            token: null,
            isAuthenticated: false,
            isLoading: false
        };
    }
    return context;
};
