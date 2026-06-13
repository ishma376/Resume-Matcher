import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import the provider at the root level
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Wrap your entire application structure here with your Client ID */}
    <GoogleOAuthProvider clientId="270761708295-vsassuqkfg4qv2l9mef8k7j2nll595q6.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);