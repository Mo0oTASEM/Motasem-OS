import React from 'react';
import { AlertCircle, CalendarDays, Loader2, Search } from 'lucide-react';

type IconComponent = React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;

export const PlannerPageHeader: React.FC<{
  title: string;
  eyebrow?: string;
  description?: string;
  icon?: IconComponent;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, eyebrow, description, icon: Icon = CalendarDays, meta, actions }) => (
  <header className="planner-page-header glass-panel">
    <div className="planner-page-title-block">
      <div className="planner-page-eyebrow">
        <Icon size={15} />
        <span>{eyebrow ?? 'Planner'}</span>
      </div>
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {meta && <div className="planner-page-meta">{meta}</div>}
    </div>
    {actions && <div className="planner-toolbar">{actions}</div>}
  </header>
);

export const PlannerTabs: React.FC<{
  items: Array<{ id: string; label: string; icon?: IconComponent }>;
  activeId: string;
  onChange: (id: string) => void;
}> = ({ items, activeId, onChange }) => (
  <div className="planner-tabs" role="tablist" aria-label="Planner views">
    {items.map(item => {
      const Icon = item.icon;
      const active = item.id === activeId;
      return (
        <button
          key={item.id}
          type="button"
          className={`planner-tab ${active ? 'active' : ''}`}
          role="tab"
          aria-selected={active}
          onClick={() => onChange(item.id)}
        >
          {Icon && <Icon size={14} />}
          <span>{item.label}</span>
        </button>
      );
    })}
  </div>
);

export const PlannerToolbar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="planner-toolbar">{children}</div>
);

export const PlannerSearch: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <label className={`planner-search ${className}`}>
    <Search size={14} />
    <input {...props} />
  </label>
);

export const PlannerSectionCard: React.FC<{
  title?: string;
  icon?: IconComponent;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon: Icon, action, children, className = '' }) => (
  <section className={`planner-section-card glass-panel ${className}`}>
    {(title || action) && (
      <div className="planner-section-card-head">
        <div>
          {title && (
            <h3>
              {Icon && <Icon size={16} />}
              {title}
            </h3>
          )}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const PlannerTaskCard: React.FC<{
  title: string;
  meta?: React.ReactNode;
  status?: string;
  priority?: string;
  completed?: boolean;
  actions?: React.ReactNode;
  onClick?: () => void;
}> = ({ title, meta, status, priority, completed, actions, onClick }) => (
  <article className={`planner-task-card ${completed ? 'completed' : ''}`} onClick={onClick}>
    <div className="planner-task-card-main">
      <strong title={title}>{title}</strong>
      {meta && <div className="planner-task-card-meta">{meta}</div>}
    </div>
    <div className="planner-task-card-side">
      {priority && <span className="planner-chip">{priority}</span>}
      {status && <span className="planner-chip muted">{status}</span>}
      {actions}
    </div>
  </article>
);

export const PlannerEventCard: React.FC<{
  title: string;
  time?: string;
  source?: string;
}> = ({ title, time, source }) => (
  <article className="planner-event-card">
    <strong title={title}>{title}</strong>
    <span>{[time, source].filter(Boolean).join(' · ')}</span>
  </article>
);

export const PlannerEmptyState: React.FC<{
  title: string;
  message?: string;
  icon?: IconComponent;
  action?: React.ReactNode;
}> = ({ title, message, icon: Icon = CalendarDays, action }) => (
  <div className="planner-state planner-state-empty">
    <Icon size={28} />
    <strong>{title}</strong>
    {message && <span>{message}</span>}
    {action}
  </div>
);

export const PlannerLoadingState: React.FC<{ message?: string }> = ({ message = 'Loading planner data...' }) => (
  <div className="planner-state">
    <Loader2 size={24} className="spin" />
    <span>{message}</span>
  </div>
);

export const PlannerErrorState: React.FC<{ title?: string; message: string; action?: React.ReactNode }> = ({
  title = 'Planner data could not load',
  message,
  action
}) => (
  <div className="planner-state planner-state-error">
    <AlertCircle size={28} />
    <strong>{title}</strong>
    <span>{message}</span>
    {action}
  </div>
);

export const PlannerSyncStatus: React.FC<{ status?: string; label?: string }> = ({ status = 'local_only', label }) => (
  <span className={`planner-sync-status planner-sync-status--${status}`}>
    {label ?? status.replace(/_/g, ' ')}
  </span>
);
