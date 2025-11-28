import { useState, useCallback } from 'react';
import { useGoogleLogin, TokenResponse } from '@react-oauth/google';

interface GoogleAuth {
    login: () => void;
    token: string | null;
    isAuthenticated: boolean;
}

export const useGoogleContactsAuth = (): GoogleAuth => {
    const [token, setToken] = useState<string | null>(null);

    const login = useGoogleLogin({
        onSuccess: (tokenResponse: TokenResponse) => {
            console.log('Google Login Success:', tokenResponse);
            setToken(tokenResponse.access_token);
        },
        onError: (error) => {
            console.error('Google Login Error:', error);
        },
        scope: 'https://www.googleapis.com/auth/contacts',
        flow: 'implicit',
    });

    return {
        login,
        token,
        isAuthenticated: !!token,
    };
};
