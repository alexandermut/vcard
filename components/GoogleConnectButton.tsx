import React from 'react';
import { useGoogleContactsAuth } from '../auth/useGoogleContactsAuth';

export const GoogleConnectButton: React.FC = () => {
    const { login, isAuthenticated, token } = useGoogleContactsAuth();

    if (isAuthenticated) {
        console.log("Access Token:", token);
    }

    return (
        <button
            onClick={() => login()}
            disabled={isAuthenticated}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${isAuthenticated
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-default'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-200 dark:border-slate-700 dark:hover:bg-slate-700'
                }`}
        >
            {isAuthenticated ? 'Verbunden' : 'Mit Google verbinden'}
        </button>
    );
};
