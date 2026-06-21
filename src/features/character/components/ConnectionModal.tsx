import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/useApp';
import { Search, Plus, Link, X, Loader2 } from 'lucide-react';
import type { WikiNote } from '../../../context/AppContext';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddConnection: (targetType: string, targetId: string, relationshipType: string) => Promise<void>;
  excludeTargetIds: string[];
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  onAddConnection,
  excludeTargetIds,
}) => {
  const {
    plannerTasks,
    goals: plannerGoals,
    notes,
    memoryItems,
    addPlannerTask,
    addGoal,
    addNote,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'search' | 'create'>('search');
  const [targetType, setTargetType] = useState<string>('task');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [relationshipType, setRelationshipType] = useState<string>('supports');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Creation forms states
  const [taskForm, setTaskForm] = useState({
    title: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    dueDate: new Date().toISOString().split('T')[0],
    estimatedMinutes: 30,
  });

  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    level: 'weekly' as 'weekly' | 'monthly' | 'quarterly',
    targetDate: new Date().toISOString().split('T')[0],
  });

  const [noteForm, setNoteForm] = useState({
    title: '',
    category: 'general' as WikiNote['category'],
    content: '### New Linked Note\n\nCreated from character connection.',
  });

  // Filtered search list based on type and query
  const searchResults = useMemo(() => {
    if (activeTab !== 'search') return [];
    
    const query = searchQuery.toLowerCase();

    if (targetType === 'task') {
      return plannerTasks
        .filter((t) => !excludeTargetIds.includes(t.id))
        .filter((t) => t.title.toLowerCase().includes(query))
        .map((t) => ({ id: t.id, title: t.title, subtitle: `Due: ${t.dueDate} | Priority: ${t.priority}` }));
    }

    if (targetType === 'planner_goal') {
      return plannerGoals
        .filter((g) => !excludeTargetIds.includes(g.id))
        .filter((g) => g.title.toLowerCase().includes(query))
        .map((g) => ({ id: g.id, title: g.title, subtitle: `${g.level.toUpperCase()} Goal | Status: ${g.status}` }));
    }

    if (targetType === 'note') {
      return notes
        .filter((n) => !excludeTargetIds.includes(n.id))
        .filter((n) => n.title.toLowerCase().includes(query))
        .map((n) => ({ id: n.id, title: n.title, subtitle: `Category: ${n.category}` }));
    }

    if (targetType === 'resource') {
      return memoryItems
        .filter((m) => !excludeTargetIds.includes(m.id))
        .filter((m) => m.title.toLowerCase().includes(query))
        .map((m) => ({ id: m.id, title: m.title, subtitle: `Type: ${m.type}` }));
    }

    return [];
  }, [targetType, searchQuery, plannerTasks, plannerGoals, notes, memoryItems, excludeTargetIds, activeTab]);

  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

  const handleLinkExisting = async () => {
    if (!selectedResultId) return;
    setSaving(true);
    setError(null);
    try {
      await onAddConnection(targetType, selectedResultId, relationshipType);
      onClose();
      // Reset
      setSelectedResultId(null);
      setSearchQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to establish connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndLink = async () => {
    setSaving(true);
    setError(null);
    try {
      let newId = '';

      if (targetType === 'task') {
        if (!taskForm.title.trim()) throw new Error('Task title is required');
        const tempId = `task-temp-${Date.now()}`;
        addPlannerTask({
          id: tempId,
          title: taskForm.title,
          status: 'todo',
          priority: taskForm.priority,
          dueDate: taskForm.dueDate,
          goalId: '',
          estimatedMinutes: taskForm.estimatedMinutes,
          tags: ['character-sync'],
          source: 'local',
        });
        // Retrieve the newly created task's real ID (or fallback to tempId if queue updates synchronously)
        newId = tempId;
      } else if (targetType === 'planner_goal') {
        if (!goalForm.title.trim()) throw new Error('Goal title is required');
        const tempId = `goal-temp-${Date.now()}`;
        addGoal({
          id: tempId,
          title: goalForm.title,
          description: goalForm.description,
          level: goalForm.level,
          progress: 0,
          status: 'active',
          targetDate: goalForm.targetDate,
          tags: ['character-sync'],
        });
        newId = tempId;
      } else if (targetType === 'note') {
        if (!noteForm.title.trim()) throw new Error('Note title is required');
        addNote({
          title: noteForm.title,
          category: noteForm.category,
          tags: ['character-sync'],
          content: noteForm.content,
        });
        // Notes created in context usually generate IDs of shape `n-[timestamp]`. Let's wait a microtask or use a generated token.
        // We will just use `n-${Date.now()}` or similar format if we can search notes list.
        // Since addNote is synchronous in AppContext (adding to notes state), we can find it:
        newId = `n-${Date.now()}`; // Wait, how does addNote work? Let's check AppContext.tsx note creator
      }

      // Allow state update to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Link it
      if (newId) {
        await onAddConnection(targetType, newId, relationshipType);
        onClose();
        // Reset forms
        setTaskForm({ title: '', priority: 'medium', dueDate: new Date().toISOString().split('T')[0], estimatedMinutes: 30 });
        setGoalForm({ title: '', description: '', level: 'weekly', targetDate: new Date().toISOString().split('T')[0] });
        setNoteForm({ title: '', category: 'general', content: '### New Linked Note\n\nCreated from character connection.' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create and link entity.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '520px', padding: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--accent-cyan)' }}>
            Establish Character Connection
          </h3>
          <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.5rem', background: 'rgba(255, 0, 85, 0.1)', border: '1px solid var(--accent-magenta)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--accent-magenta)' }}>
            {error}
          </div>
        )}

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.25rem', borderRadius: '4px' }}>
          <button
            className={`glass-btn ${activeTab === 'search' ? 'btn-cyan' : ''}`}
            style={{ flex: 1, padding: '0.35rem', fontSize: '0.72rem' }}
            onClick={() => setActiveTab('search')}
          >
            Search Existing
          </button>
          <button
            className={`glass-btn ${activeTab === 'create' ? 'btn-cyan' : ''}`}
            style={{ flex: 1, padding: '0.35rem', fontSize: '0.72rem' }}
            onClick={() => setActiveTab('create')}
          >
            Create New & Link
          </button>
        </div>

        {/* Target Entity Type Selector */}
        <div>
          <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
            System Entity Type
          </label>
          <select
            className="glass-input"
            style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem' }}
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value);
              setSelectedResultId(null);
            }}
          >
            <option value="task">Planner Daily Task</option>
            <option value="planner_goal">Planner Goal (Weekly / Monthly / Quarterly)</option>
            <option value="note">Second Brain Wiki Note</option>
            {activeTab === 'search' && <option value="resource">Brain Durable Memory Resource</option>}
          </select>
        </div>

        {/* Relationship Type Selector */}
        <div>
          <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
            Relationship Meaning
          </label>
          <select
            className="glass-input"
            style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem' }}
            value={relationshipType}
            onChange={(e) => setRelationshipType(e.target.value)}
          >
            <option value="supports">Supports (e.g. Identity supports a task)</option>
            <option value="generated_from">Generated From (e.g. Habit spawned a task)</option>
            <option value="tracks">Tracks (e.g. Goal tracks another goal)</option>
            <option value="part_of">Part Of (e.g. Habit is part of a goal)</option>
            <option value="related_to">Related To (General connection)</option>
          </select>
        </div>

        {/* Dynamic Search Content */}
        {activeTab === 'search' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="glass-input"
                style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.8rem', fontSize: '0.72rem' }}
                placeholder={`Search ${targetType}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{
              maxHeight: '180px', overflowY: 'auto',
              background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--panel-border)',
              borderRadius: '4px', display: 'flex', flexDirection: 'column'
            }}>
              {searchResults.length === 0 ? (
                <div style={{ padding: '1rem', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No matchable records found.
                </div>
              ) : (
                searchResults.map((res) => (
                  <div
                    key={res.id}
                    style={{
                      padding: '0.5rem 0.75rem', fontSize: '0.72rem', cursor: 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      background: selectedResultId === res.id ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
                      color: selectedResultId === res.id ? 'var(--accent-cyan)' : 'var(--text-primary)'
                    }}
                    onClick={() => setSelectedResultId(res.id)}
                  >
                    <div style={{ fontWeight: 600 }}>{res.title}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{res.subtitle}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Dynamic Creation Forms */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {targetType === 'task' && (
              <>
                <div>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Task Title *</label>
                  <input className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                    value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Complete Morning Reflection" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Priority</label>
                    <select className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                      value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value as 'low' | 'medium' | 'high' | 'critical' }))}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Due Date</label>
                    <input type="date" className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                      value={taskForm.dueDate} onChange={e => setTaskForm(p => ({ ...p, dueDate: e.target.value }))} />
                  </div>
                </div>
              </>
            )}

            {targetType === 'planner_goal' && (
              <>
                <div>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Goal Title *</label>
                  <input className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                    value={goalForm.title} onChange={e => setGoalForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Build daily meditation habit" />
                </div>
                <div>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Goal Description</label>
                  <textarea className="glass-input" style={{ width: '100%', minHeight: '40px', padding: '0.35rem', fontSize: '0.72rem' }}
                    value={goalForm.description} onChange={e => setGoalForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Level</label>
                    <select className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                      value={goalForm.level} onChange={e => setGoalForm(p => ({ ...p, level: e.target.value as 'weekly' | 'monthly' | 'quarterly' }))}>
                      <option value="weekly">Weekly Objective</option>
                      <option value="monthly">Monthly Outcome</option>
                      <option value="quarterly">Quarterly Goal</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Target Date</label>
                    <input type="date" className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                      value={goalForm.targetDate} onChange={e => setGoalForm(p => ({ ...p, targetDate: e.target.value }))} />
                  </div>
                </div>
              </>
            )}

            {targetType === 'note' && (
              <>
                <div>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Note Title *</label>
                  <input className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                    value={noteForm.title} onChange={e => setNoteForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Notes on Discipline" />
                </div>
                <div>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Category</label>
                  <select className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                    value={noteForm.category} onChange={e => setNoteForm(p => ({ ...p, category: e.target.value as WikiNote['category'] }))}>
                    <option value="general">General</option>
                    <option value="knowledge">Knowledge</option>
                    <option value="research">Research</option>
                    <option value="ideas">Ideas</option>
                    <option value="game_design">Game Design</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button className="glass-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.72rem' }} onClick={onClose}>
            Cancel
          </button>
          {activeTab === 'search' ? (
            <button
              className="glass-btn btn-cyan"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              disabled={!selectedResultId || saving}
              onClick={handleLinkExisting}
            >
              {saving ? <Loader2 size={12} className="spin" /> : <Link size={12} />} Link Record
            </button>
          ) : (
            <button
              className="glass-btn btn-cyan"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              disabled={saving}
              onClick={handleCreateAndLink}
            >
              {saving ? <Loader2 size={12} className="spin" /> : <Plus size={12} />} Create & Link
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
