import React from 'react';
import { Clock, Focus, Repeat } from 'lucide-react';
import { PageHeader, Panel } from '../../components/system/Layout';
import { useApp } from '../../context/useApp';

export const TimeIntelligence: React.FC = () => {
  const { timeBlocks } = useApp();
  const deepWork = timeBlocks.filter(block => block.category === 'deep_work');
  const admin = timeBlocks.filter(block => block.category === 'admin' || block.category === 'meetings');
  const avgFocus = Math.round(timeBlocks.reduce((sum, block) => sum + block.focusQuality, 0) / (timeBlocks.length || 1));

  return (
    <div>
      <PageHeader title="Time Intelligence" description="Find time leaks, context switching, deep work, and focus quality.">
        <span className="badge badge-purple">Focus {avgFocus}/10</span>
      </PageHeader>

      <div className="page-body os-grid-3">
        <div className="glass-card metric-card"><Focus /><span>{deepWork.length}</span><small>Deep work blocks</small></div>
        <div className="glass-card metric-card"><Repeat /><span>{admin.length}</span><small>Admin/meeting blocks</small></div>
        <div className="glass-card metric-card"><Clock /><span>{avgFocus}/10</span><small>Focus quality</small></div>
        <Panel title="AI Productivity Insight" className="os-span-3">
          <p className="os-readable">
            {admin.length > deepWork.length
              ? 'Admin and meetings are competing with deep work. Batch communication and reserve a protected morning block.'
              : 'Your time distribution supports meaningful execution. Keep deep work before reactive work.'}
          </p>
          <div className="timeline-list">
            {timeBlocks.map(block => (
              <div className="timeline-item" key={block.id}>
                <strong>{new Date(block.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                <div><h3>{block.title}</h3><p>{block.category} · focus {block.focusQuality}/10</p></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};
