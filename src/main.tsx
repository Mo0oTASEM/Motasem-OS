import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import OAuthConsent from './pages/OAuthConsent'
import { ErrorBoundary } from './components/ErrorBoundary'

const path = window.location.pathname.replace(/\/+/g, '/').replace(/\/$/, '');
const isOauthConsent = path === '/oauth/consent' || path.endsWith('/oauth/consent');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isOauthConsent ? <OAuthConsent /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
)
