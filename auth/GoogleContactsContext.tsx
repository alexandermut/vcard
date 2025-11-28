import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useGoogleLogin, TokenResponse } from '@react-oauth/google';

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
        onError: (error) => {
            console.error('Google Login Error:', error);
        },
        scope: 'https://www.googleapis.com/auth/contacts.readonly',
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
        throw new Error('useGoogleContacts must be used within a GoogleContactsProvider');
    }
    return context;
};
