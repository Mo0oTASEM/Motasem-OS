import React, { useEffect, useState } from 'react';
import { Cloud, Shield, Check, X, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { env } from '../lib/env/validate';
import { getSupabaseBrowserClient } from '../lib/supabase/client';

type ConsentState = 'loading_user' | 'ready' | 'submitting' | 'granted' | 'denied' | 'error';

const AUTHORIZE_URL = `${env.supabaseUrl}/auth/v1/oauth/authorize`;

function useSearchParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    clientId: params.get('client_id') || '',
    redirectUri: params.get('redirect_uri') || '',
    scope: params.get('scope') || '',
    state: params.get('state') || '',
    responseType: params.get('response_type') || 'code',
  };
}

type AppInfo = {
  name: string;
  icon: string;
};

function deriveAppInfo(clientId: string): AppInfo {
  const known: Record<string, AppInfo> = {};
  return known[clientId] || { name: clientId, icon: 'default' };
}

function prettyScope(scope: string): string[] {
  return scope
    .split(/[+\s]+/)
    .filter(Boolean)
    .map(s => {
      const labels: Record<string, string> = {
        openid: 'Sign in with your account',
        profile: 'View your profile information',
        email: 'View your email address',
      };
      return labels[s] || s;
    });
}

const OAuthConsent: React.FC = () => {
  const { clientId, redirectUri, scope, state, responseType } = useSearchParams();
  const [consentState, setConsentState] = useState<ConsentState>('loading_user');
  const [errorMsg, setErrorMsg] = useState('');

  const appInfo = deriveAppInfo(clientId);
  const scopes = prettyScope(scope);
  const redirectDisplay = (() => {
    try { return new URL(redirectUri).hostname; } catch { return redirectUri; }
  })();

  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setConsentState('error');
        setErrorMsg('Supabase is not configured. Cannot process OAuth consent.');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        window.location.href = `${AUTHORIZE_URL}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=${responseType}&state=${encodeURIComponent(state)}`;
        return;
      }
      setConsentState('ready');
    };
    checkSession();
    return () => { cancelled = true; };
  }, [clientId, redirectUri, scope, responseType, state]);

  const handleAllow = async () => {
    setConsentState('submitting');
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error('Supabase client not available');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const formBody = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        response_type: responseType,
        state,
        confirm: 'true',
      });

      const resp = await fetch(AUTHORIZE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formBody.toString(),
        redirect: 'manual',
      });

      if (resp.status === 302 || resp.status === 303) {
        const location = resp.headers.get('location');
        if (location) {
          setConsentState('granted');
          window.location.href = location;
          return;
        }
      }

      if (resp.ok) {
        const text = await resp.text();
        try {
          const data = JSON.parse(text);
          if (data.redirect_to || data.url) {
            setConsentState('granted');
            window.location.href = data.redirect_to || data.url;
            return;
          }
        } catch (e) {
          void e;
        }
      }

      const location = resp.headers.get('location');
      if (location) {
        setConsentState('granted');
        window.location.href = location;
        return;
      }

      throw new Error(`Unexpected response: ${resp.status}`);
    } catch (err) {
      setConsentState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Authorization request failed');
    }
  };

  const handleDeny = () => {
    setConsentState('denied');
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set('error', 'access_denied');
    errorUrl.searchParams.set('error_description', 'The user denied the authorization request');
    if (state) errorUrl.searchParams.set('state', state);
    window.location.href = errorUrl.toString();
  };

  if (consentState === 'loading_user' || consentState === 'submitting') {
    return (
      <div className="oauth-consent-container">
        <div className="oauth-consent-card glass-panel">
          <div className="oauth-consent-loading">
            <Loader2 size={28} className="spin" />
            <strong>
              {consentState === 'loading_user' ? 'Checking session...' : 'Completing authorization...'}
            </strong>
          </div>
        </div>
      </div>
    );
  }

  if (consentState === 'granted') {
    return (
      <div className="oauth-consent-container">
        <div className="oauth-consent-card glass-panel">
          <div className="oauth-consent-done">
            <Check size={32} className="oauth-icon-success" />
            <strong>Authorization granted</strong>
            <span>Redirecting you back to {redirectDisplay}...</span>
          </div>
        </div>
      </div>
    );
  }

  if (consentState === 'denied') {
    return (
      <div className="oauth-consent-container">
        <div className="oauth-consent-card glass-panel">
          <div className="oauth-consent-done">
            <X size={32} className="oauth-icon-denied" />
            <strong>Authorization denied</strong>
            <span>You denied the authorization request. Redirecting...</span>
          </div>
        </div>
      </div>
    );
  }

  if (consentState === 'error') {
    return (
      <div className="oauth-consent-container">
        <div className="oauth-consent-card glass-panel">
          <div className="oauth-consent-error">
            <AlertTriangle size={28} />
            <strong>Authorization error</strong>
            <span>{errorMsg || 'An error occurred while processing your request.'}</span>
            <button className="glass-btn btn-cyan" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="oauth-consent-container">
      <div className="oauth-consent-card glass-panel">
        <div className="oauth-consent-header">
          <Cloud size={28} className="oauth-logo-icon" />
          <h1>Motasem OS</h1>
          <span className="oauth-subtitle">Authorization</span>
        </div>

        <div className="oauth-consent-divider" />

        <div className="oauth-consent-body">
          <div className="oauth-consent-icon-wrap">
            <Shield size={24} />
          </div>

          <p className="oauth-consent-question">
            <strong>{appInfo.name}</strong> is requesting access to your account
          </p>

          {redirectDisplay && (
            <p className="oauth-consent-redirect">
              <ExternalLink size={12} />
              {redirectDisplay}
            </p>
          )}

          {scopes.length > 0 && (
            <div className="oauth-consent-scopes">
              <span className="oauth-consent-scopes-label">This will allow the application to:</span>
              <ul>
                {scopes.map((s, i) => (
                  <li key={i}>
                    <Check size={14} />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="oauth-consent-actions">
          <button className="glass-btn" onClick={handleDeny}>
            <X size={16} /> Deny
          </button>
          <button className="glass-btn btn-cyan" onClick={handleAllow}>
            <Check size={16} /> Allow
          </button>
        </div>
      </div>
    </div>
  );
};

export default OAuthConsent;
