import React, { useState, useEffect, useCallback } from 'react';
import {
  Target, CalendarDays, Plus, Loader2, AlertCircle,
  ChevronRight, BarChart3, WifiOff, Bell
} from 'lucide-react';
import { usePlanner } from './hooks/usePlanner';
import { useQuarter } from './hooks/useQuarter';
import { useMonthlyPlan } from './hooks/useMonthlyPlan';
import { QuarterView } from './quarter/QuarterView';
import { MonthlyView } from './month/MonthlyView';
import { CreateQuarterModal } from './modals/CreateQuarterModal';
import { CreateMonthlyPlanModal } from './modals/CreateMonthlyPlanModal';
import { useApp } from '../../context/useApp';
import type { Quarter, MonthlyPlan, Notification } from './types';
import { cloudRunClient } from '../../lib/api/cloudRunClient';

// Sub-components
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { PlannerOverview } from './components/PlannerOverview';
import { PlannerInsights } from './components/PlannerInsights';
import { WeeklyPlanningView } from './components/WeeklyPlanningView';
import { DailyPlanningView } from './components/DailyPlanningView';
import { CalendarView } from './components/CalendarView';
import { ReviewsView } from './components/ReviewsView';
import { PlannerPageHeader, PlannerTabs, PlannerSyncStatus } from './components/PlannerPrimitives';


const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const statusDot: Record<string, string> = {
  draft: 'rgba(255,255,255,0.25)',
  active: 'var(--accent-cyan)',
  completed: 'var(--accent-teal, #2dd4bf)',
  archived: 'rgba(255,255,255,0.1)',
  cancelled: 'rgba(255,255,255,0.1)'
};

interface PlannerProps {
  subView?: string;
  setCurrentView?: (view: string) => void;
}

export const Planner: React.FC<PlannerProps> = ({ subView = 'planner-overview', setCurrentView = () => {} }) => {
  const { user } = useApp();
  const planner = usePlanner();

  const [showQuarterModal, setShowQuarterModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);

  // Derive selected IDs from UI state
  const selectedQuarterId = planner.ui.selectedQuarterId;
  const selectedMonthlyPlanId = planner.ui.selectedMonthlyPlanId;


  // Fetch detail data for the selected entity
  const { quarter, reviews: qReviews, loading: qLoading, refresh: refreshQuarter } = useQuarter(
    subView === 'planner-quarter' ? selectedQuarterId : null,
    planner.workspaceId
  );
  const { plan, reviews: mReviews, loading: mLoading, refresh: refreshMonth } = useMonthlyPlan(
    subView === 'planner-month' ? selectedMonthlyPlanId : null,
    planner.workspaceId
  );

  const fetchUnreadCount = useCallback(async () => {
    if (!planner.workspaceId) return;
    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      await cloudRunClient.plannerApi.triggerNotificationChecks(planner.workspaceId);
      const res = await cloudRunClient.plannerApi.listNotifications(planner.workspaceId);
      const list = (res.notifications || []) as unknown as Notification[];
      
      let userPref: Record<string, boolean> = {};
      try {
        const supabase = (await import('../../lib/supabase/client')).getSupabaseBrowserClient();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase
              .from('nova_user_docs')
              .select('payload')
              .eq('user_id', user.id)
              .eq('collection_name', 'planning_preferences')
              .eq('doc_id', 'default')
              .maybeSingle();
            if (data && data.payload && typeof data.payload === 'object') {
              userPref = (data.payload as { notification_types?: Record<string, boolean> }).notification_types || {};
            }
          }
        }
      } catch { /* ignore */ }

      const activeUnread = list.filter((n) => !n.readAt && userPref[n.type] !== false);
      setUnreadCount(activeUnread.length);
    } catch {
      // Non-critical background poll; errors are silently handled
    }
  }, [planner.workspaceId]);

  useEffect(() => {
    if (planner.workspaceId) {
      let active = true;
      const trigger = async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
        if (active) {
          fetchUnreadCount();
        }
      };
      trigger();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }
  }, [planner.workspaceId, fetchUnreadCount]);

  const handleQuarterCreated = (q: Quarter) => {
    setShowQuarterModal(false);
    planner.refreshQuarters();
    planner.setSelectedQuarter(q.id);
    setCurrentView('planner-quarter');
  };

  const handleMonthCreated = (m: MonthlyPlan) => {
    setShowMonthModal(false);
    planner.refreshMonthlyPlans();
    planner.setSelectedMonthlyPlan(m.id);
    setCurrentView('planner-month');
  };

  // ── Render: not authenticated ────────────────────────────────────────────
  if (!user) {
    return (
      <div className="planner-splash">
        <Target size={48} className="text-cyan" />
        <h2>Planner</h2>
        <p>Sign in to access your quarterly and monthly planning workspace.</p>
      </div>
    );
  }

  // ── Render: loading ──────────────────────────────────────────────────────
  if (planner.loading) {
    return (
      <div className="planner-splash">
        <Loader2 size={32} className="spin text-cyan" />
        <p>Loading your planner…</p>
      </div>
    );
  }

  // ── Render: error ────────────────────────────────────────────────────────
  if (planner.error) {
    return (
      <div className="planner-splash">
        <WifiOff size={36} style={{ color: 'var(--accent-magenta)' }} />
        <h3>Could not load planner</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{planner.error}</p>
        <button className="glass-btn btn-cyan" type="button" onClick={planner.refresh}>
          Retry
        </button>
      </div>
    );
  }

  const showInnerSidebar = subView === 'planner-quarter' || subView === 'planner-month';

  const subViewLabels: Record<string, string> = {
    'planner-overview': 'Overview',
    'planner-quarter': 'Quarter OKRs',
    'planner-month': 'Month Outcomes',
    'planner-week': 'Week Objectives',
    'planner-today': 'Today Schedule',
    'planner-calendar': 'Planner Calendar',
    'planner-reviews': 'Reviews Ledger',
    'planner-insights': 'Analytics Insights'
  };

  const plannerTabs = [
    { id: 'planner-overview', label: 'Overview' },
    { id: 'planner-quarter', label: 'Quarter' },
    { id: 'planner-month', label: 'Month' },
    { id: 'planner-week', label: 'Week' },
    { id: 'planner-today', label: 'Today' },
    { id: 'planner-calendar', label: 'Calendar' },
    { id: 'planner-reviews', label: 'Reviews' },
    { id: 'planner-insights', label: 'Insights' }
  ];

  // ── Main Render ───────────────────────────────────────────────────────────
  return (
    <div className={`planner-layout ${showInnerSidebar ? 'planner-layout--with-sidebar' : 'planner-layout--full'}`}>
      {/* ── Left sidebar (Only visible for quarter / monthly lists) ────── */}
      {showInnerSidebar && (
        <aside className="planner-sidebar glass-panel">
          <div className="planner-sidebar-header">
            <Target size={16} className="text-cyan" />
            <span>Planner</span>
            <span style={{
              marginLeft: 'auto', width: '7px', height: '7px',
              borderRadius: '50%', background: planner.apiAvailable ? 'var(--accent-teal, #2dd4bf)' : 'var(--accent-magenta)',
              flexShrink: 0
            }} title={planner.apiAvailable ? 'Connected' : 'Disconnected'} />
          </div>

          {subView === 'planner-quarter' && (
            <div className="planner-sidebar-section">
              <div className="planner-sidebar-section-head">
                <span>Quarters</span>
                <button className="planner-sidebar-add-btn" type="button" onClick={() => setShowQuarterModal(true)}>
                  <Plus size={12} />
                </button>
              </div>
              {planner.quarters.length === 0 ? (
                <button
                  className="planner-sidebar-empty-btn"
                  type="button"
                  onClick={() => setShowQuarterModal(true)}
                >
                  <Plus size={12} /> Create first quarter
                </button>
              ) : (
                planner.quarters.map(q => (
                  <button
                    key={q.id}
                    className={`planner-sidebar-item ${selectedQuarterId === q.id ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      planner.setSelectedQuarter(q.id);
                    }}
                  >
                    <span className="planner-sidebar-dot" style={{ background: statusDot[q.status] }} />
                    <span className="planner-sidebar-label">Q{q.quarterNumber} {q.year}</span>
                    <ChevronRight size={11} className="planner-sidebar-chevron" />
                  </button>
                ))
              )}
            </div>
          )}

          {subView === 'planner-month' && (
            <div className="planner-sidebar-section">
              <div className="planner-sidebar-section-head">
                <span>Monthly Plans</span>
                <button className="planner-sidebar-add-btn" type="button" onClick={() => setShowMonthModal(true)}>
                  <Plus size={12} />
                </button>
              </div>
              {planner.monthlyPlans.length === 0 ? (
                <button
                  className="planner-sidebar-empty-btn"
                  type="button"
                  onClick={() => setShowMonthModal(true)}
                >
                  <Plus size={12} /> Create first monthly plan
                </button>
              ) : (
                planner.monthlyPlans.slice(0, 12).map(m => (
                  <button
                    key={m.id}
                    className={`planner-sidebar-item ${selectedMonthlyPlanId === m.id ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      planner.setSelectedMonthlyPlan(m.id);
                    }}
                  >
                    <span className="planner-sidebar-dot" style={{ background: statusDot[m.status] }} />
                    <span className="planner-sidebar-label">{MONTH_NAMES[m.monthNumber]} {m.year}</span>
                    <ChevronRight size={11} className="planner-sidebar-chevron" />
                  </button>
                ))
              )}
            </div>
          )}

          <div className="planner-sidebar-footer">
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="planner-stat-badge">
                <BarChart3 size={10} /> {planner.quarters.filter(q => q.status === 'active').length} active Q
              </span>
              <span className="planner-stat-badge">
                <CalendarDays size={10} /> {planner.monthlyPlans.filter(m => m.status === 'active').length} active M
              </span>
            </div>
          </div>
        </aside>
      )}

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="planner-main">
        
        {/* Shared Sub-view Header */}
        <PlannerPageHeader
          title={subViewLabels[subView] || 'Planner'}
          eyebrow="Planning system"
          description="Quarterly strategy, monthly outcomes, weekly capacity, daily execution, and calendar work in one flow."
          icon={Target}
          meta={<PlannerSyncStatus status={planner.apiAvailable ? 'synced' : 'error'} label={planner.apiAvailable ? 'API connected' : 'API disconnected'} />}
          actions={
            <>
              <PlannerTabs items={plannerTabs} activeId={subView} onChange={setCurrentView} />
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowAlerts(!showAlerts)}
                  className="glass-btn"
                  style={{
                    padding: '0.45rem',
                    borderRadius: '50%',
                    background: 'transparent',
                    borderColor: unreadCount > 0 ? 'rgba(0, 240, 255, 0.3)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="System Notifications"
                  aria-label="Toggle notifications panel"
                >
                  <Bell size={16} style={{ color: unreadCount > 0 ? 'var(--accent-cyan)' : 'var(--text-secondary)' }} />
                  {unreadCount > 0 && (
                    <span className="badge badge-magenta" style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      fontSize: '0.55rem',
                      padding: '0.05rem 0.25rem',
                      borderRadius: '50%'
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </>
          }
        />

        {/* Nested views router */}
        <div className="planner-page-content">
          {subView === 'planner-overview' && planner.workspaceId && (
            <PlannerOverview workspaceId={planner.workspaceId} setCurrentView={setCurrentView} />
          )}

          {subView === 'planner-quarter' && selectedQuarterId && (
            qLoading ? (
              <div className="planner-splash">
                <Loader2 size={24} className="spin text-cyan" />
                <p>Loading quarter…</p>
              </div>
            ) : quarter ? (
              <QuarterView
                quarter={quarter}
                workspaceId={planner.workspaceId!}
                userId={user.id}
                reviews={qReviews}
                onQuarterUpdated={() => {
                  refreshQuarter();
                  planner.refreshQuarters();
                }}
                onQuarterDeleted={async (id) => {
                  await planner.deleteQuarter(id);
                  setCurrentView('planner-overview');
                }}
              />
            ) : (
              <div className="planner-splash">
                <AlertCircle size={28} style={{ color: 'var(--accent-magenta)' }} />
                <p>Quarter not found.</p>
              </div>
            )
          )}

          {subView === 'planner-month' && selectedMonthlyPlanId && (
            mLoading ? (
              <div className="planner-splash">
                <Loader2 size={24} className="spin text-cyan" />
                <p>Loading monthly plan…</p>
              </div>
            ) : plan ? (
              <MonthlyView
                plan={plan}
                workspaceId={planner.workspaceId!}
                userId={user.id}
                linkedGoals={quarter?.goals ?? []}
                reviews={mReviews}
                onPlanUpdated={() => {
                  refreshMonth();
                  planner.refreshMonthlyPlans();
                }}
                onPlanDeleted={async (id) => {
                  await planner.deleteMonthlyPlan(id);
                  setCurrentView('planner-overview');
                }}
              />
            ) : (
              <div className="planner-splash">
                <AlertCircle size={28} style={{ color: 'var(--accent-magenta)' }} />
                <p>Monthly plan not found.</p>
              </div>
            )
          )}

          {subView === 'planner-week' && planner.workspaceId && (
            <WeeklyPlanningView workspaceId={planner.workspaceId} userId={user.id} />
          )}

          {subView === 'planner-today' && planner.workspaceId && (
            <DailyPlanningView workspaceId={planner.workspaceId} userId={user.id} setCurrentView={setCurrentView} />
          )}

          {subView === 'planner-calendar' && planner.workspaceId && (
            <CalendarView workspaceId={planner.workspaceId} />
          )}

          {subView === 'planner-reviews' && planner.workspaceId && (
            <ReviewsView workspaceId={planner.workspaceId} userId={user.id} />
          )}

          {subView === 'planner-insights' && planner.workspaceId && (
            <PlannerInsights workspaceId={planner.workspaceId} setCurrentView={setCurrentView} />
          )}

          {/* Empty state handles */}
          {subView === 'planner-quarter' && !selectedQuarterId && (
            <div className="planner-splash">
              <Target size={48} className="text-cyan" style={{ marginBottom: '1rem' }} />
              <h2>No Quarter Selected</h2>
              <button className="glass-btn btn-cyan" onClick={() => setShowQuarterModal(true)}>
                + New Quarter
              </button>
            </div>
          )}

          {subView === 'planner-month' && !selectedMonthlyPlanId && (
            <div className="planner-splash">
              <Target size={48} className="text-cyan" style={{ marginBottom: '1rem' }} />
              <h2>No Monthly Plan Selected</h2>
              <button className="glass-btn btn-cyan" onClick={() => setShowMonthModal(true)}>
                + New Monthly Plan
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Notifications Slideout Drawer */}
      {showAlerts && planner.workspaceId && (
        <NotificationsDrawer
          workspaceId={planner.workspaceId}
          onClose={() => {
            setShowAlerts(false);
            fetchUnreadCount();
          }}
          setCurrentView={setCurrentView}
        />
      )}

      {/* Modals */}
      {showQuarterModal && planner.workspaceId && (
        <CreateQuarterModal
          workspaceId={planner.workspaceId}
          userId={user.id}
          onCreated={handleQuarterCreated}
          onClose={() => setShowQuarterModal(false)}
        />
      )}
      {showMonthModal && planner.workspaceId && (
        <CreateMonthlyPlanModal
          workspaceId={planner.workspaceId}
          userId={user.id}
          quarters={planner.quarters}
          onCreated={handleMonthCreated}
          onClose={() => setShowMonthModal(false)}
        />
      )}
    </div>
  );
};
