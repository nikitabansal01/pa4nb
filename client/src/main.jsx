import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.jsx';
import { clerkAppearance, getClerkPublishableKey } from './clerk.js';
import './index.css';

const publishableKey = getClerkPublishableKey();

if (!publishableKey) {
  console.warn(
    'Missing Clerk publishable key. Set VITE_CLERK_PUBLISHABLE_KEY (or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from Vercel).',
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey} appearance={clerkAppearance}>
      <App />
    </ClerkProvider>
  </StrictMode>,
);
