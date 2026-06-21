import React from 'react';
import { Activity, Moon, Salad, Weight } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { PageHeader, Panel } from '../../components/system/Layout';

export const Health: React.FC = () => {
  const { healthEntries } = useApp();
  const latest = healthEntries[0];
  const count = healthEntries.length;
  const avgEnergy = count > 0 ? Math.round(healthEntries.reduce((sum, entry) => sum + entry.energy, 0) / count) : 0;
  const avgSleep = count > 0 ? (healthEntries.reduce((sum, entry) => sum + entry.sleepHours, 0) / count).toFixed(1) : '0.0';

  return (
    <div>
      <PageHeader title="Health" description="Sleep, nutrition, workouts, weight, energy, and operating capacity.">
        <span className="badge badge-teal">Energy avg {avgEnergy}/10</span>
      </PageHeader>

      <div className="page-body os-grid-4">
        <div className="glass-card metric-card"><Moon /><span>{avgSleep}h</span><small>Average sleep</small></div>
        <div className="glass-card metric-card"><Activity /><span>{avgEnergy}/10</span><small>Energy</small></div>
        <div className="glass-card metric-card"><Salad /><span>{latest?.nutrition || 'No log'}</span><small>Nutrition</small></div>
        <div className="glass-card metric-card"><Weight /><span>{latest?.weight || '--'}kg</span><small>Weight</small></div>
        <Panel title="Health Insight" icon={Activity} className="os-span-4">
          <p className="os-readable">
            {avgEnergy >= 7
              ? 'Your energy supports an ambitious deep-work schedule. Put creative or technical work early in the day.'
              : 'Energy is constrained. Use shorter sprints, reduce meetings, and schedule recovery before strategic work.'}
          </p>
        </Panel>
      </div>
    </div>
  );
};
