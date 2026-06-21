import React from 'react';

export const PageHeader: React.FC<{
  title: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children?: React.ReactNode;
}> = ({ title, description, icon: Icon, children }) => (
  <header className="page-header">
    <div>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.45rem', fontWeight: 800 }}>
        {Icon && <Icon size={20} className="text-cyan" />}
        {title}
      </h2>
      {description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.2rem' }}>{description}</p>}
    </div>
    {children && <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>{children}</div>}
  </header>
);

export const Panel: React.FC<{
  title: string;
  icon?: React.ComponentType<{ size?: number }>;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, icon: Icon, action, children, className = '' }) => (
  <section className={`glass-panel os-section ${className}`}>
    <div className="os-section-title">
      {Icon && <Icon size={18} />}
      <span style={{ flex: 1 }}>{title}</span>
      {action}
    </div>
    {children}
  </section>
);
