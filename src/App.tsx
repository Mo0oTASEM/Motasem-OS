import React, { useCallback, useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { MotasemAI } from './components/MotasemAI';
import { ProjectManager } from './components/ProjectManager';
import { Work } from './components/Work';
import { FinanceManager } from './components/FinanceManager';
import { SecondBrain } from './components/SecondBrain';
import { FocusZone } from './components/FocusZone';
import { Health } from './features/health/Health';
import { Integrations } from './features/integrations/Integrations';
import { Planner } from './features/planner/Planner';
import { Character } from './features/character/Character';
import { readStoredJson, writeStoredJson } from './lib/uiPersistence';
import { LoadingState } from './components/system/States';
import { ErrorBoundary } from './components/ErrorBoundary';

import { AlertTriangle, Menu, Search, Terminal, Keyboard, X } from 'lucide-react';

const validViews = [
   'dashboard',
   'copilot',
   'projects',
   'crm',
   'finances',
    'wiki',
    'health',
   'integrations',
   'focus',
   'character',
   'quarter',
   'quarter-detail',
   'monthly',
   'monthly-detail',
   'week',
   'week-detail',
   'today',
   'planner',
   'planner-overview',
   'planner-quarter',
   'planner-month',
   'planner-week',
   'planner-today',
    'planner-calendar',
    'planner-reviews',
   'planner-insights'
  ] as const;

type ViewId = typeof validViews[number];

type AppShellState = {
  currentView: string;
  activeSection?: string;
  updatedAt?: string;
  routeSource?: 'hash' | 'localStorage' | 'sessionStorage' | 'fallback';
};

const APP_SHELL_STORAGE_KEY = 'nova_app_shell_state_v1';
const APP_SESSION_STORAGE_KEY = 'nova_app_session_state_v1';

const isValidView = (view: string | null | undefined): view is ViewId => Boolean(view && validViews.includes(view as ViewId));

const viewFromHash = () => {
  const match = window.location.hash.match(/^#\/([^/?#]+)/);
  return match?.[1] || '';
};

const initialViewState = () => {
  const hashView = viewFromHash();
  if (isValidView(hashView)) return { view: hashView, notice: '' };
  if (hashView) return { view: 'dashboard', notice: `Saved route "${hashView}" is unavailable.` };

  const sessionState = readStoredJson<AppShellState>(APP_SESSION_STORAGE_KEY, { currentView: '' }, 'session');
  if (isValidView(sessionState.currentView)) return { view: sessionState.currentView, notice: '' };

  const savedState = readStoredJson<AppShellState>(APP_SHELL_STORAGE_KEY, { currentView: '' });
  if (isValidView(savedState.currentView)) return { view: savedState.currentView, notice: '' };

  return { view: 'dashboard', notice: '' };
};

function AppContent() {
  const { user, sessionReady, dataStatus, setupRequired } = useApp();
  const [{ view: initialView, notice: initialNotice }] = useState(initialViewState);
  const [currentView, setCurrentView] = useState<string>(initialView);
  const [restoreNotice, setRestoreNotice] = useState<string>(initialNotice);
  const [showCmdPalette, setShowCmdPalette] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [cmdInput, setCmdInput] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const persistShellState = useCallback((view = currentView, source: AppShellState['routeSource'] = 'localStorage') => {
    const state: AppShellState = {
      currentView: view,
      activeSection: view,
      routeSource: source,
      updatedAt: new Date().toISOString()
    };
    writeStoredJson(APP_SHELL_STORAGE_KEY, state);
    writeStoredJson(APP_SESSION_STORAGE_KEY, state, 'session');
  }, [currentView]);

  const navigateToView = (view: string) => {
    if (!isValidView(view)) {
      setRestoreNotice(`The requested page "${view}" is unavailable.`);
      return;
    }
    setCurrentView(view);
    setRestoreNotice('');
  };

  useEffect(() => {
    if (!isValidView(currentView)) return;
    persistShellState(currentView);
    const nextHash = `#/${currentView}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, [currentView, persistShellState]);

  useEffect(() => {
    const restoreFromHash = () => {
      const nextView = viewFromHash();
      if (!nextView) return;
      if (isValidView(nextView)) {
        setCurrentView(nextView);
        setRestoreNotice('');
        persistShellState(nextView, 'hash');
      } else {
        setRestoreNotice(`Saved route "${nextView}" is unavailable.`);
      }
    };

    window.addEventListener('hashchange', restoreFromHash);
    return () => window.removeEventListener('hashchange', restoreFromHash);
  }, [persistShellState]);

  useEffect(() => {
    const saveCurrentSession = () => persistShellState(currentView, 'sessionStorage');
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') saveCurrentSession();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', saveCurrentSession);
    window.addEventListener('beforeunload', saveCurrentSession);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', saveCurrentSession);
      window.removeEventListener('beforeunload', saveCurrentSession);
    };
  }, [currentView, persistShellState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCmdPalette(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowCmdPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const viewOptions = [
    { label: 'Navigate to Dashboard', view: 'dashboard', description: 'Main KPI and widgets deck', shortcut: 'D' },
    { label: 'Navigate to Motasem AI', view: 'copilot', description: 'AI assistant prompt console', shortcut: 'N' },
    { label: 'Navigate to Project Hub', view: 'projects', description: 'Kanban boards and asset pipelines', shortcut: 'P' },
    { label: 'Navigate to Work', view: 'crm', description: 'Freelance business command center', shortcut: 'W' },
    { label: 'Navigate to Finance Ledger', view: 'finances', description: 'Income charts and software burns', shortcut: 'F' },
    { label: 'Navigate to Second Brain', view: 'wiki', description: 'Wiki notes and code references', shortcut: 'B' },
    { label: 'Navigate to Planner', view: 'planner', description: 'Daily, weekly, monthly, and quarterly planning', shortcut: 'M' },
    { label: 'Navigate to Health', view: 'health', description: 'Energy, sleep, and operating capacity', shortcut: 'H' },
    { label: 'Navigate to Integrations', view: 'integrations', description: 'Supabase, Gemini, and Google sync', shortcut: 'I' },
    { label: 'Navigate to Character', view: 'character', description: 'Traits, habits, challenges, and character development', shortcut: 'C' },
    { label: 'Navigate to Focus Chamber', view: 'focus', description: 'Stopwatch billing and Pomodoro rings', shortcut: 'L' }
  ];

  const filteredOptions = viewOptions.filter(opt =>
    opt.label.toLowerCase().includes(cmdInput.toLowerCase()) ||
    opt.view.toLowerCase().includes(cmdInput.toLowerCase())
  );

  const handleCommandRun = (view: string) => {
    navigateToView(view);
    setShowCmdPalette(false);
    setCmdInput('');
  };

  const handleSlashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdInput.startsWith('/')) {
      if (filteredOptions[selectedIndex]) {
        handleCommandRun(filteredOptions[selectedIndex].view);
      }
      return;
    }
    setCmdInput('');
    setShowCmdPalette(false);
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard setCurrentView={navigateToView} />;
      case 'copilot':
        return <ErrorBoundary name="AI Chat"><MotasemAI /></ErrorBoundary>;
      case 'projects':
        return <ErrorBoundary name="Projects"><ProjectManager /></ErrorBoundary>;
      case 'crm':
        return <ErrorBoundary name="Work"><Work /></ErrorBoundary>;
      case 'finances':
        return <ErrorBoundary name="Finance"><FinanceManager /></ErrorBoundary>;
      case 'wiki':
        return <ErrorBoundary name="Second Brain"><SecondBrain /></ErrorBoundary>;
      case 'focus':
        return <ErrorBoundary name="Focus"><FocusZone /></ErrorBoundary>;
      case 'health':
        return <ErrorBoundary name="Health"><Health /></ErrorBoundary>;
      case 'integrations':
        return <ErrorBoundary name="Integrations"><Integrations /></ErrorBoundary>;
      case 'character':
        return <ErrorBoundary name="Character"><Character /></ErrorBoundary>;
      case 'planner':
      case 'planner-overview':
      case 'planner-quarter':
      case 'planner-month':
      case 'planner-week':
      case 'planner-today':
      case 'planner-calendar':
      case 'planner-reviews':
      case 'planner-insights':
        return <ErrorBoundary name="Planner"><Planner subView={currentView} setCurrentView={navigateToView} /></ErrorBoundary>;
      default:
        return <Dashboard setCurrentView={navigateToView} />;
    }
  };

  // Auth guard: show loading while session is being checked
  if (!sessionReady) {
    return <LoadingState title="Initializing" message="Connecting to secure session..." />;
  }

  // Auth guard: show login if user is not authenticated
  if (!user && !setupRequired) {
    return <AuthScreen />;
  }

  // Setup required state
  if (setupRequired || dataStatus === 'setup_required') {
    return <AuthScreen />;
  }

  const activeViewLabel = viewOptions.find(opt => opt.view === currentView)?.label.replace('Navigate to ', '') ??
    (currentView.startsWith('planner') ? 'Planner' : 'Motasem OS');

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className={`app-container${sidebarOpen ? ' sidebar-open' : ''}`}>
        <Sidebar currentView={currentView} setCurrentView={navigateToView} onCloseSidebar={() => setSidebarOpen(false)} />

        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            role="presentation"
            aria-hidden="true"
          />
        )}

        <div className="app-main-shell">
          <header className="application-header">
            <button
              className="mobile-menu-btn glass-btn"
              onClick={() => setSidebarOpen(true)}
              title="Open navigation"
              type="button"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="application-header-title">
              <span className="mono" aria-hidden="true">MOTASEM</span>
              <strong id="page-title">{activeViewLabel}</strong>
            </div>
            <button
              onClick={() => setShowCmdPalette(true)}
              className="glass-btn app-command-btn"
              title="Open Command Center (Ctrl+K)"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={showCmdPalette}
            >
              <Search size={16} />
              <span>Command</span>
            </button>
          </header>

          <main className="main-content" id="main-content" aria-labelledby="page-title" role="main">
            {restoreNotice && (
              <div className="restore-notice glass-panel" role="alert">
                <AlertTriangle size={16} />
                <span>{restoreNotice}</span>
                <button className="glass-btn" type="button" onClick={() => setRestoreNotice('')}>
                  Dismiss
                </button>
              </div>
            )}

            {renderActiveView()}
          </main>
        </div>

        {showCmdPalette && (
          <div
            className="modal-overlay"
            onClick={() => setShowCmdPalette(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation command palette"
          >
            <div
              className="cmd-palette glass-panel"
              style={{ borderRadius: 'var(--radius-lg)', padding: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <form onSubmit={handleSlashSubmit} className="cmd-input-container" role="search">
                <Terminal size={18} className="text-cyan" aria-hidden="true" />
                <input
                  type="text"
                  className="cmd-input"
                  placeholder="Type a view name to navigate..."
                  value={cmdInput}
                  onChange={e => {
                    setCmdInput(e.target.value);
                    setSelectedIndex(0);
                  }}
                  autoFocus
                  aria-label="Search views"
                />
                <button
                  type="button"
                  className="glass-btn"
                  style={{ padding: '0.25rem', background: 'transparent', border: 'none' }}
                  onClick={() => setShowCmdPalette(false)}
                  aria-label="Close command palette"
                >
                  <X size={16} />
                </button>
              </form>

              <div className="cmd-results" role="listbox" aria-label="Navigation results">
                {filteredOptions.map((opt, idx) => (
                  <div
                    key={opt.view}
                    onClick={() => handleCommandRun(opt.view)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCommandRun(opt.view); }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`cmd-item ${idx === selectedIndex ? 'active' : ''}`}
                    role="option"
                    aria-selected={idx === selectedIndex}
                    tabIndex={0}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.02)'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
                        {opt.label}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {opt.description}
                      </span>
                    </div>
                    <span className="cmd-shortcut mono">
                      {opt.shortcut}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                padding: '0.75rem 1.25rem',
                borderTop: '1px solid var(--panel-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.7rem',
                color: 'var(--text-muted)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Keyboard size={12} aria-hidden="true" /> Use Arrow keys & Enter to select
                </span>
                <span>Press ESC to exit console</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
