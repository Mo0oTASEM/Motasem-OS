import React, { useEffect, useState, useCallback } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, Settings, ShieldAlert, AlertTriangle, AlertCircle, Clock, CheckSquare, Sparkles, Link as LinkIcon } from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';

interface Notification {
  id: string;
  workspaceId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  readAt?: string | null;
  dismissedAt?: string | null;
  createdAt: string;
}

interface NotificationsDrawerProps {
  workspaceId: string;
  onClose: () => void;
  setCurrentView: (view: string) => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'daily_planning_reminder':
    case 'weekly_planning_reminder':
      return <Clock size={16} style={{ color: 'var(--accent-purple)' }} />;
    case 'monthly_review_reminder':
    case 'quarterly_review_reminder':
      return <AlertCircle size={16} style={{ color: 'var(--accent-cyan)' }} />;
    case 'goal_behind':
      return <AlertTriangle size={16} style={{ color: 'var(--accent-amber, #f59e0b)' }} />;
    case 'deadline_risk':
      return <ShieldAlert size={16} style={{ color: 'var(--accent-magenta, #f43f5e)' }} />;
    case 'missing_alignment':
      return <AlertTriangle size={16} style={{ color: 'var(--accent-amber, #f59e0b)' }} />;
    case 'overloaded_day':
      return <ShieldAlert size={16} style={{ color: 'var(--accent-magenta, #f43f5e)' }} />;
    case 'blocked_task':
      return <ShieldAlert size={16} style={{ color: 'var(--accent-magenta, #f43f5e)' }} />;
    case 'key_result_update_due':
      return <Clock size={16} style={{ color: 'var(--accent-purple)' }} />;
    case 'ai_plan_ready':
      return <Sparkles size={16} style={{ color: 'var(--accent-cyan)' }} />;
    default:
      return <Bell size={16} style={{ color: 'var(--text-secondary)' }} />;
  }
};

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  workspaceId,
  onClose,
  setCurrentView
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    daily_planning_reminder: true,
    weekly_planning_reminder: true,
    monthly_review_reminder: true,
    quarterly_review_reminder: true,
    goal_behind: true,
    deadline_risk: true,
    missing_alignment: true,
    overloaded_day: true,
    blocked_task: true,
    key_result_update_due: true,
    ai_plan_ready: true
  });

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await cloudRunClient.plannerApi.listNotifications(workspaceId);
      setNotifications(res.notifications as unknown as Notification[]);
    } catch {
      // Silently handled
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const loadPreferences = useCallback(async () => {
    try {
      const supabase = (await import('../../../lib/supabase/client')).getSupabaseBrowserClient();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('nova_user_docs')
        .select('payload')
        .eq('user_id', user.id)
        .eq('collection_name', 'planning_preferences')
        .eq('doc_id', 'default')
        .maybeSingle();

      if (data && data.payload && typeof data.payload === 'object') {
        const payloadPref = (data.payload as { notification_types?: Record<string, boolean> }).notification_types;
        if (payloadPref) {
          setPreferences(prev => ({ ...prev, ...payloadPref }));
        }
      }
    } catch {
      // Silently handled
    }
  }, []);

  const savePreferences = async (newPrefs: Record<string, boolean>) => {
    try {
      const supabase = (await import('../../../lib/supabase/client')).getSupabaseBrowserClient();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('nova_user_docs')
        .upsert({
          user_id: user.id,
          collection_name: 'planning_preferences',
          doc_id: 'default',
          payload: { notification_types: newPrefs },
          updated_at: new Date().toISOString()
        });
      setPreferences(newPrefs);
    } catch {
      // Silently handled
    }
  };

  useEffect(() => {
    let active = true;
    const trigger = async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (active) {
        loadNotifications();
        loadPreferences();
      }
    };
    trigger();
    return () => { active = false; };
  }, [workspaceId, loadNotifications, loadPreferences]);

  const handleRead = async (id: string) => {
    try {
      await cloudRunClient.plannerApi.readNotification(id, workspaceId);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch {
      // Silently handled
    }
  };

  const handleReadAll = async () => {
    try {
      await cloudRunClient.plannerApi.readAllNotifications(workspaceId);
      setNotifications(prev =>
        prev.map(n => ({ ...n, readAt: new Date().toISOString() }))
      );
    } catch {
      // Silently handled
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await cloudRunClient.plannerApi.deleteNotification(id, workspaceId);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {
      // Silently handled
    }
  };

  const handleDismissAll = async () => {
    try {
      await cloudRunClient.plannerApi.dismissAllNotifications(workspaceId);
      setNotifications([]);
    } catch {
      // Silently handled
    }
  };

  const handleLinkClick = (type: string) => {
    onClose();
    if (type.includes('quarter')) {
      setCurrentView('planner-quarter');
    } else if (type.includes('monthly') || type.includes('outcome')) {
      setCurrentView('planner-month');
    } else if (type.includes('weekly') || type.includes('alignment')) {
      setCurrentView('planner-week');
    } else if (type.includes('daily') || type.includes('today') || type.includes('task') || type.includes('deadline') || type.includes('overloaded') || type.includes('blocked')) {
      setCurrentView('planner-today');
    } else {
      setCurrentView('planner-overview');
    }
  };

  const unread = notifications.filter(n => !n.readAt && preferences[n.type] !== false);
  const read = notifications.filter(n => !!n.readAt && preferences[n.type] !== false);

  return (
    <div className="glass-panel" style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '400px',
      height: '100vh',
      zIndex: 100,
      borderLeft: '1px solid var(--panel-border)',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(10, 15, 30, 0.95)',
      backdropFilter: 'blur(20px)',
      boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
      animation: 'slide-in 0.3s ease-out'
    }}>
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--panel-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={18} className="text-cyan" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>System Alerts</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`glass-btn ${showSettings ? 'text-cyan' : ''}`}
            style={{ padding: '0.4rem', background: 'transparent' }}
            title="Configure notifications"
            aria-label="Notification settings"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={onClose}
            className="glass-btn"
            style={{ padding: '0.4rem', background: 'transparent' }}
            title="Close drawer"
            aria-label="Close notification drawer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {showSettings ? (
        <div style={{ flexGrow: 1, padding: '1.5rem', overflowY: 'auto' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-purple)', marginBottom: '1rem' }}>Alert Preferences</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Choose which types of system notifications you want to receive. Unchecked triggers will be hidden.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.keys(preferences).map(key => {
              const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              return (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    onChange={(e) => {
                      const next = { ...preferences, [key]: e.target.checked };
                      savePreferences(next);
                    }}
                    style={{
                      accentColor: 'var(--accent-cyan)',
                      width: '15px',
                      height: '15px',
                      cursor: 'pointer'
                    }}
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>

          <button
            onClick={() => setShowSettings(false)}
            className="glass-btn btn-cyan"
            style={{ width: '100%', marginTop: '2rem' }}
          >
            Back to Notifications
          </button>
        </div>
      ) : (
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '0.75rem 1.5rem',
            borderBottom: '1px solid var(--panel-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {unread.length} unread alerts
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {unread.length > 0 && (
                <button
                  onClick={handleReadAll}
                  className="glass-btn text-cyan"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: 'transparent' }}
                  title="Mark all as read"
                >
                  <CheckCheck size={12} style={{ marginRight: '4px' }} /> Read All
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleDismissAll}
                  className="glass-btn text-muted"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: 'transparent' }}
                  title="Dismiss all notifications"
                >
                  <Trash2 size={12} style={{ marginRight: '4px' }} /> Clear All
                </button>
              )}
            </div>
          </div>

          <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1rem' }} className="custom-scrollbar">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px', color: 'var(--text-secondary)' }}>
                <Clock size={16} className="spin" style={{ marginRight: '6px' }} /> Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)' }}>
                <CheckSquare size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p style={{ fontSize: '0.85rem', margin: 0 }}>System clear. No pending alerts.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {unread.map(n => (
                  <div
                    key={n.id}
                    className="glass-panel"
                    style={{
                      padding: '0.85rem 1rem',
                      borderLeft: '3px solid var(--accent-cyan)',
                      background: 'rgba(0, 240, 255, 0.02)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', paddingRight: '1.5rem' }}>
                      <span style={{ marginTop: '2px' }}>{getIcon(n.type)}</span>
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
                          {n.title}
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                          {n.body}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => handleLinkClick(n.type)}
                            className="text-cyan-btn"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent-cyan)',
                              fontSize: '0.7rem',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                          >
                            <LinkIcon size={10} /> Take Action
                          </button>
                        </div>
                      </div>
                    </div>
                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '2px' }}>
                      <button
                        onClick={() => handleRead(n.id)}
                        className="icon-btn-tinted"
                        style={{ padding: '0.2rem', background: 'transparent', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}
                        title="Mark read"
                        aria-label="Mark notification read"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => handleDismiss(n.id)}
                        className="icon-btn-tinted"
                        style={{ padding: '0.2rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        title="Dismiss alert"
                        aria-label="Dismiss notification"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {read.length > 0 && (
                  <>
                    <h5 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', margin: '1rem 0 0.5rem 0' }}>
                      Recently Read
                    </h5>
                    {read.map(n => (
                      <div
                        key={n.id}
                        className="glass-panel"
                        style={{
                          padding: '0.85rem 1rem',
                          borderLeft: '3px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255, 255, 255, 0.01)',
                          opacity: 0.6,
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', paddingRight: '1.5rem' }}>
                          <span style={{ marginTop: '2px' }}>{getIcon(n.type)}</span>
                          <div>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 500, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
                              {n.title}
                            </h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                              {n.body}
                            </p>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                          <button
                            onClick={() => handleDismiss(n.id)}
                            className="icon-btn-tinted"
                            style={{ padding: '0.2rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            title="Dismiss alert"
                            aria-label="Dismiss notification"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
