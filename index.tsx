import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { ErrorBoundary } from './components/ErrorBoundary';

import { GoogleOAuthProvider } from '@react-oauth/google';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!clientId) {
  console.warn("Google Client ID is missing. Google Auth will be disabled.");
}

import { GoogleContactsProvider } from './auth/GoogleContactsContext';
import { LoggerProvider } from './components/LoggerProvider';

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {clientId ? (
        <GoogleOAuthProvider clientId={clientId}>
          <GoogleContactsProvider>
            <LoggerProvider>
              <App />
            </LoggerProvider>
          </GoogleContactsProvider>
        </GoogleOAuthProvider>
      ) : (
        <LoggerProvider>
          <App />
        </LoggerProvider>
      )}
    </ErrorBoundary>
  </React.StrictMode>
);