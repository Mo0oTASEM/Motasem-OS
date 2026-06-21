import React from 'react';
import { Cloud, ShieldCheck } from 'lucide-react';
import { signInWithSupabaseGoogle, supabaseConfigStatus } from '../lib/supabase/client';

export const AuthScreen: React.FC = () => {
  const handleGoogleSignIn = async () => {
    try {
      await signInWithSupabaseGoogle();
    } catch (err) {
      console.error('Google sign-in failed:', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card glass-panel">
        <div className="auth-logo">
          <Cloud size={32} className="text-cyan" />
          <h1>Motasem OS</h1>
        </div>
        <p className="auth-tagline">Your AI Operating System</p>

        {!supabaseConfigStatus.hasSupabaseConfig ? (
          <div className="auth-setup-required">
            <ShieldCheck size={20} />
            <strong>Setup Required</strong>
            <p>
              Supabase is not configured. To use Motasem OS, add your Supabase URL and publishable key to the <code>.env</code> file:
            </p>
            <ul>
              {supabaseConfigStatus.missingKeys.map(key => (
                <li key={key}><code>{key}</code></li>
              ))}
            </ul>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            <button className="glass-btn btn-cyan auth-google-btn" onClick={handleGoogleSignIn}>
              Sign in with Google
            </button>
            {import.meta.env.DEV && (
              <button
                className="glass-btn"
                style={{ borderColor: 'var(--accent-purple)', color: 'var(--text-secondary)' }}
                onClick={() => {
                  const mockUser = {
                    id: 'eb53ed97-b0d6-4754-9ca3-2d02cd69f80b',
                    email: 'mo0otasem4321@gmail.com',
                    aud: 'authenticated',
                    role: 'authenticated',
                    created_at: new Date().toISOString()
                  };
                  localStorage.setItem('nova_dev_user_bypass', JSON.stringify(mockUser));
                  window.location.reload();
                }}
                type="button"
              >
                Bypass Auth (Dev Mode)
              </button>
            )}
          </div>
        )}

        <p className="auth-footer">
          Your data is stored securely in your Supabase project.
        </p>
      </div>
    </div>
  );
};
