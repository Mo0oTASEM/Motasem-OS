import React from 'react';
import { CalendarClock, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { buildIdealSchedule, getImportantTasks, getUpcomingMeetings } from '../../lib/ai/intelligence';

export const DailyPlanner: React.FC = () => {
  const { plannerTasks, calendarEvents, healthEntries, updatePlannerTask } = useApp();
  const schedule = buildIdealSchedule(plannerTasks, calendarEvents, healthEntries);
  const meetings = getUpcomingMeetings(calendarEvents);
  const tasks = getImportantTasks(plannerTasks);

  return (
    <div>
      <header className="page-header">
        <div>
          <h2>Daily Planner</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>AI schedule from calendar, tasks, deadlines, and energy.</p>
        </div>
        <span className="badge badge-purple"><Sparkles size={12} /> Optimized today</span>
      </header>

      <div className="page-body os-grid-3">
        <section className="glass-panel os-section os-span-2">
          <div className="os-section-title"><CalendarClock size={18} /> Ideal Day</div>
          <div className="timeline-list">
            {schedule.map(block => (
              <div className="timeline-item" key={`${block.time}-${block.title}`}>
                <strong>{block.time}</strong>
                <div>
                  <h3>{block.title}</h3>
                  <p>{block.mode}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="os-stack">
          <section className="glass-panel os-section">
            <div className="os-section-title"><CheckCircle2 size={18} /> Priority Queue</div>
            {tasks.map(task => (
              <button className="signal-row" key={task.id} onClick={() => updatePlannerTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}>
                <span>{task.title}</span>
                <small>{task.priority} · {task.estimatedMinutes}m</small>
              </button>
            ))}
          </section>

          <section className="glass-panel os-section">
            <div className="os-section-title"><Clock size={18} /> Meetings</div>
            {meetings.map(event => (
              <div className="signal-row" key={event.id}>
                <span>{event.title}</span>
                <small>{new Date(event.start).toLocaleString()}</small>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
};
