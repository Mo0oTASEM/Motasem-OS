import React, { useState } from 'react';
import { useApp } from '../context/useApp';
import {
  LayoutDashboard, 
  Cpu, 
  Briefcase, 
  FolderGit2, 
  LineChart, 
  Brain, 
  Timer, 
  Target,
  HeartPulse,
  Cloud,
  Gamepad2,
  Settings, 
  X, 
  Save
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onCloseSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, onCloseSidebar }) => {
  const { projects, focusSession, aiConfig, updateAIConfig } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  
  const [name, setName] = useState(aiConfig.userName);
  const [role, setRole] = useState(aiConfig.userRole);
  const [prompt, setPrompt] = useState(aiConfig.systemPrompt);

  const activeProjectsCount = projects.filter(p => p.status === 'in_progress').length;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateAIConfig({
      userName: name,
      userRole: role,
      systemPrompt: prompt
    });
    setShowSettings(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'copilot', label: 'Motasem AI', icon: Cpu, badge: 'SERVER' },
    { id: 'projects', label: 'Project Hub', icon: FolderGit2, count: activeProjectsCount },
    { id: 'crm', label: 'Work', icon: Briefcase },
    { id: 'finances', label: 'Finance Ledger', icon: LineChart },
    { id: 'wiki', label: 'Second Brain', icon: Brain },
    { id: 'planner', label: 'Planner', icon: Target },
    { id: 'health', label: 'Health', icon: HeartPulse },
    { id: 'character', label: 'Character', icon: Gamepad2 },
    { id: 'integrations', label: 'Integrations', icon: Cloud },
    { id: 'focus', label: 'Focus Chamber', icon: Timer, status: focusSession.isActive ? 'ACTIVE' : null }
  ];

  return (
    <div className="glass-panel" style={{
      borderRight: '1px solid var(--panel-border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'relative',
      zIndex: 20
    }}>
      <div style={{
        padding: '2rem 1.5rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid var(--panel-border)'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
          boxShadow: 'var(--shadow-neon)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse-glow 3s infinite'
        }}>
          <Cpu size={16} className="text-primary" style={{ color: '#000' }} />
        </div>
        <div>
          <h1 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 700, 
            letterSpacing: '0.05em',
            background: 'linear-gradient(90deg, #fff, var(--text-secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>MOTASEM // OS</h1>
          <p className="mono" style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-cyan)',
              display: 'inline-block',
              boxShadow: '0 0 5px var(--accent-cyan)'
            }}></span>
            KERNEL ONLINE v1.0.0
          </p>
        </div>
        {onCloseSidebar && (
          <button className="sidebar-close-btn" onClick={onCloseSidebar} title="Close navigation">
            <X size={18} />
          </button>
        )}
      </div>

      <nav style={{
        flexGrow: 1,
        padding: '1.5rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem'
      }}>
        {navItems.map(item => {
          const IconComponent = item.icon;
          const isPlannerActive = currentView === 'planner' || currentView.startsWith('planner-');
          const isMainActive = item.id === 'planner' ? isPlannerActive : (currentView === item.id);
          const showSubItems = item.id === 'planner' && isPlannerActive;

          const plannerSubItems = [
            { id: 'planner-overview', label: 'Overview' },
            { id: 'planner-quarter', label: 'Quarter' },
            { id: 'planner-month', label: 'Month' },
            { id: 'planner-week', label: 'Week' },
            { id: 'planner-today', label: 'Today' },
            { id: 'planner-calendar', label: 'Calendar' },
            { id: 'planner-reviews', label: 'Reviews' },
            { id: 'planner-insights', label: 'Insights' }
          ];

          return (
            <React.Fragment key={item.id}>
              <button
                onClick={() => {
                  if (item.id === 'planner') {
                    setCurrentView('planner-overview');
                  } else {
                    setCurrentView(item.id);
                  }
                }}
                className="glass-btn"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '0.85rem 1rem',
                  border: '1px solid transparent',
                  borderRadius: 'var(--radius-md)',
                  background: isMainActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  borderColor: isMainActive ? 'rgba(0, 240, 255, 0.25)' : 'transparent',
                  boxShadow: isMainActive ? '0 0 10px rgba(0, 240, 255, 0.05)' : 'none',
                  color: isMainActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                <IconComponent size={18} style={{ 
                  color: isMainActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  filter: isMainActive ? 'drop-shadow(0 0 4px var(--accent-cyan-glow))' : 'none'
                }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.label}</span>
                
                {item.count !== undefined && item.count > 0 && (
                  <span className="badge badge-cyan" style={{ marginLeft: 'auto', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                    {item.count}
                  </span>
                )}
                {item.badge && (
                  <span className={`badge ${item.badge === 'LIVE' ? 'badge-teal' : 'badge-purple'}`} style={{ marginLeft: 'auto', fontSize: '0.6rem', padding: '0.05rem 0.25rem' }}>
                    {item.badge}
                  </span>
                )}
                {item.status && (
                  <span className="badge badge-magenta" style={{ marginLeft: 'auto', fontSize: '0.6rem', padding: '0.05rem 0.25rem', animation: 'pulse-cyan 1.5s infinite' }}>
                    {item.status}
                  </span>
                )}
              </button>

              {showSubItems && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                  paddingLeft: '1.25rem',
                  marginTop: '0.2rem',
                  marginBottom: '0.4rem',
                  borderLeft: '1px solid rgba(0, 240, 255, 0.15)',
                  marginLeft: '1.5rem'
                }}>
                  {plannerSubItems.map(subItem => {
                    const isSubActive = currentView === subItem.id;
                    return (
                      <button
                        key={subItem.id}
                        onClick={() => setCurrentView(subItem.id)}
                        className="glass-btn sub-nav-btn"
                        style={{
                          width: '100%',
                          justifyContent: 'flex-start',
                          padding: '0.35rem 0.5rem',
                          background: isSubActive ? 'rgba(0, 240, 255, 0.05)' : 'transparent',
                          border: 'none',
                          color: isSubActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                          fontSize: '0.8rem',
                          fontWeight: isSubActive ? 600 : 400,
                          textAlign: 'left'
                        }}
                      >
                        <span>{subItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <div style={{
        padding: '1.25rem',
        borderTop: '1px solid var(--panel-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(45deg, var(--accent-purple), var(--accent-magenta))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {aiConfig.userName.split(' ').map(n => n[0]).join('')}
          </div>
          <div style={{ maxWidth: '140px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {aiConfig.userName}
            </p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {aiConfig.userRole}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="glass-btn" 
          style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'transparent' }}
          title="OS System Settings"
        >
          <Settings size={16} className="text-secondary" />
        </button>
      </div>

      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ padding: '2rem', border: '1px solid var(--panel-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={20} className="text-cyan" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>OS System Settings</h2>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="glass-btn" 
                style={{ padding: '0.4rem', background: 'transparent' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Operator Name</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Operator Role</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    value={role} 
                    onChange={e => setRole(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>AI Core System Instructions</label>
                <textarea 
                  className="glass-input" 
                  style={{ minHeight: '80px', resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-purple)' }}>API Integrations</h3>
                </div>
                
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  AI and integration keys are server-managed only. Configure Gemini, Hermes, Google, Firebase Admin, and Telegram in backend environment variables.
                </p>

                <div className="glass-panel" style={{ borderRadius: 'var(--radius-sm)', padding: '0.85rem', background: 'rgba(255,255,255,0.03)' }}>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Legacy browser key entry is disabled to prevent API keys from being stored in localStorage. Use Vercel/server env vars instead.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowSettings(false)} 
                  className="glass-btn"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="glass-btn btn-cyan"
                >
                  <Save size={16} /> Save Configurations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};