import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import type { CalendarEvent, Task } from '../types';
import { PlannerEmptyState, PlannerErrorState, PlannerEventCard, PlannerLoadingState, PlannerSectionCard, PlannerSyncStatus, PlannerTaskCard } from './PlannerPrimitives';
import { taskDateKey, toLocalDateKey } from '../utils/date';

interface CalendarViewProps {
  workspaceId: string;
}

const monthRange = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toLocalDateKey(start), end: toLocalDateKey(end) };
};

const eventDateKey = (event: CalendarEvent) => toLocalDateKey(new Date(event.startTime));

const eventTime = (event: CalendarEvent) => {
  if (event.isAllDay) return 'All day';
  const start = new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const end = new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${start} - ${end}`;
};

export const CalendarView: React.FC<CalendarViewProps> = ({ workspaceId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const { start, end } = useMemo(() => monthRange(currentDate), [currentDate]);

  const loadCalendar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [taskRes, eventRes] = await Promise.all([
        cloudRunClient.plannerApi.listTasks(workspaceId),
        cloudRunClient.plannerApi.listCalendarEvents(workspaceId, start, end)
      ]);
      setTasks((taskRes.tasks || []) as unknown as Task[]);
      setEvents((eventRes.events || []) as unknown as CalendarEvent[]);
    } catch (err) {
      setError((err as Error).message || 'Calendar data could not load.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, start, end]);

  useEffect(() => {
    let active = true;
    const trigger = async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (active) {
        loadCalendar();
      }
    };
    trigger();
    return () => { active = false; };
  }, [loadCalendar]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i += 1) days.push(null);
    for (let day = 1; day <= lastDay.getDate(); day += 1) days.push(new Date(year, month, day));

    return days;
  }, [year, month]);

  const selectedTasks = useMemo(
    () => tasks.filter(task => selectedDateKey && taskDateKey(task) === selectedDateKey),
    [tasks, selectedDateKey]
  );

  const selectedEvents = useMemo(
    () => events.filter(event => selectedDateKey && eventDateKey(event) === selectedDateKey),
    [events, selectedDateKey]
  );

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) return <PlannerLoadingState message="Loading planner calendar..." />;

  if (error) {
    return (
      <PlannerErrorState
        message={error}
        action={<button className="glass-btn btn-cyan" type="button" onClick={loadCalendar}>Retry</button>}
      />
    );
  }

  return (
    <div className="planner-calendar-shell">
      <PlannerSectionCard
        title={currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        icon={CalendarIcon}
        action={
          <div className="planner-calendar-actions">
            <PlannerSyncStatus status={events.some(event => event.source === 'google') ? 'synced' : 'local_only'} label={events.some(event => event.source === 'google') ? 'Google events loaded' : 'Local planner data'} />
            <button className="glass-btn" type="button" aria-label="Previous month" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
              <ChevronLeft size={16} />
            </button>
            <button className="glass-btn" type="button" aria-label="Next month" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
              <ChevronRight size={16} />
            </button>
          </div>
        }
        className="planner-calendar-card"
      >
        <div className="planner-calendar-weekdays">
          {dayNames.map(name => <span key={name}>{name}</span>)}
        </div>

        <div className="planner-calendar-grid">
          {monthDays.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="planner-calendar-cell is-empty" />;

            const dateKey = toLocalDateKey(day);
            const dayTasks = tasks.filter(task => taskDateKey(task) === dateKey);
            const dayEvents = events.filter(event => eventDateKey(event) === dateKey);
            const isToday = toLocalDateKey(new Date()) === dateKey;
            const isSelected = selectedDateKey === dateKey;

            return (
              <button
                key={dateKey}
                type="button"
                className={`planner-calendar-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setSelectedDateKey(dateKey)}
              >
                <span className="planner-calendar-day-number">{day.getDate()}</span>
                <div className="planner-calendar-markers">
                  {dayEvents.slice(0, 2).map(event => (
                    <span key={event.id} className="planner-calendar-pill event" title={event.title}>{event.title}</span>
                  ))}
                  {dayTasks.slice(0, 2).map(task => (
                    <span key={task.id} className="planner-calendar-pill task" title={task.title}>{task.title}</span>
                  ))}
                  {dayEvents.length + dayTasks.length > 4 && (
                    <span className="planner-calendar-more">+{dayEvents.length + dayTasks.length - 4}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </PlannerSectionCard>

      <PlannerSectionCard title={selectedDateKey ? new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a Day'} icon={Clock} className="planner-calendar-detail">
        {!selectedDateKey ? (
          <PlannerEmptyState title="No day selected" message="Choose a date to inspect persisted events and tasks." icon={CalendarIcon} />
        ) : selectedEvents.length === 0 && selectedTasks.length === 0 ? (
          <PlannerEmptyState title="Nothing scheduled" message="No local or synced planner items exist for this date." />
        ) : (
          <div className="planner-calendar-detail-list">
            {selectedEvents.map(event => (
              <PlannerEventCard key={event.id} title={event.title} time={eventTime(event)} source={event.source === 'google' ? 'Google Calendar' : 'Local'} />
            ))}
            {selectedTasks.map(task => (
              <PlannerTaskCard
                key={task.id}
                title={task.title}
                status={task.status}
                priority={task.priority}
                completed={task.status === 'completed'}
                meta={task.scheduledStart ? new Date(task.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Task due'}
              />
            ))}
          </div>
        )}
      </PlannerSectionCard>
    </div>
  );
};
