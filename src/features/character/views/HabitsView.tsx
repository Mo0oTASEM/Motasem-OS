import React, { useState } from 'react';
import { 
  Target, Plus, Search, Eye, EyeOff, 
  Trash2, Edit2, Zap, Skull, Brain, X
} from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import { StreakDisplay } from '../components/StreakDisplay';
import { CharacterConnections } from '../components/CharacterConnections';
import type { 
  CharacterHabit, CharacterTrait, CharacterConnection, 
  CharacterBadGuy, CharacterPowerUp, CharacterIfThenRule 
} from '../types';

interface HabitsViewProps {
  habits: CharacterHabit[];
  traits: CharacterTrait[];
  connections: CharacterConnection[];
  onAddConnection: (conn: Omit<CharacterConnection, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  onDeleteConnection: (id: string) => Promise<void>;
  onCompleteHabit: (id: string) => Promise<void>;
  onAddHabit: (habit: Omit<CharacterHabit, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentStreak' | 'maxStreak' | 'lastCompletedDate'>) => Promise<void>;
  onUpdateHabit: (id: string, updates: Partial<CharacterHabit>) => Promise<void>;
  onDeleteHabit: (id: string) => Promise<void>;
  saving?: boolean;

  // Bad guys
  badGuys: CharacterBadGuy[];
  onAddBadGuy: (badGuy: Omit<CharacterBadGuy, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateBadGuy: (id: string, updates: Partial<CharacterBadGuy>) => Promise<void>;
  onDeleteBadGuy: (id: string) => Promise<void>;
  onResistBadGuy: (id: string) => Promise<void>;
  onGiveInBadGuy: (id: string) => Promise<void>;

  // Power ups
  powerUps: CharacterPowerUp[];
  onAddPowerUp: (powerUp: Omit<CharacterPowerUp, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdatePowerUp: (id: string, updates: Partial<CharacterPowerUp>) => Promise<void>;
  onDeletePowerUp: (id: string) => Promise<void>;
  onUsePowerUp: (id: string) => Promise<void>;

  // If-then rules
  ifThenRules: CharacterIfThenRule[];
  onAddIfThenRule: (rule: Omit<CharacterIfThenRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateIfThenRule: (id: string, updates: Partial<CharacterIfThenRule>) => Promise<void>;
  onDeleteIfThenRule: (id: string) => Promise<void>;
  onTriggerRule: (id: string, followed: boolean) => Promise<void>;
}

export const HabitsView: React.FC<HabitsViewProps> = ({
  habits, traits, connections, onAddConnection, onDeleteConnection, onCompleteHabit, onAddHabit, onUpdateHabit, onDeleteHabit, saving,
  badGuys, onAddBadGuy, onUpdateBadGuy, onDeleteBadGuy, onResistBadGuy, onGiveInBadGuy,
  powerUps, onAddPowerUp, onUpdatePowerUp, onDeletePowerUp, onUsePowerUp,
  ifThenRules, onAddIfThenRule, onUpdateIfThenRule, onDeleteIfThenRule, onTriggerRule
}) => {
  const [subTab, setSubTab] = useState<'habits' | 'badguys' | 'powerups' | 'ifthen'>('habits');
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState(true);

  // Modals visibility states
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);

  const [showBadGuyModal, setShowBadGuyModal] = useState(false);
  const [editingBadGuyId, setEditingBadGuyId] = useState<string | null>(null);

  const [showPowerUpModal, setShowPowerUpModal] = useState(false);
  const [editingPowerUpId, setEditingPowerUpId] = useState<string | null>(null);

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Forms state
  const [habitForm, setHabitForm] = useState({
    title: '', description: '', linkedTraitId: '', habitType: 'build' as 'build' | 'break' | 'never_do' | 'reduce' | 'quit',
    cue: '', expectedResponse: '', replacementBehavior: '', frequency: 'daily',
    difficulty: 3, baseXp: 10, isActive: true, category: '', targetValue: 1, unit: 'times',
    priority: 'medium', notes: '', scheduledDays: [] as number[], reminderEnabled: false, reminderTime: ''
  });

  const [badGuyForm, setBadGuyForm] = useState({
    title: '', triggerDescription: '', warningSigns: '', usualBehavior: '',
    costConsequence: '', replacementResponse: '', severity: 5, isActive: true
  });

  const [powerUpForm, setPowerUpForm] = useState({
    title: '', description: '', durationMinutes: 5, category: 'reset',
    instructions: '', isFavorite: false
  });

  const [ruleForm, setRuleForm] = useState({
    triggerCondition: '', responseAction: '', linkedTraitId: '', linkedBadGuyId: '', isActive: true
  });

  // Filters & Search
  const filteredHabits = habits.filter(h => {
    if (search && !h.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterActive && !h.isActive) return false;
    return true;
  });

  const filteredBadGuys = badGuys.filter(bg => {
    if (search && !bg.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterActive && !bg.isActive) return false;
    return true;
  });

  const filteredPowerUps = powerUps.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredRules = ifThenRules.filter(r => {
    if (search && !r.triggerCondition.toLowerCase().includes(search.toLowerCase()) && !r.responseAction.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterActive && !r.isActive) return false;
    return true;
  });

  // Modal Open Handlers
  const handleOpenHabitModal = (habit?: CharacterHabit) => {
    if (habit) {
      setHabitForm({
        title: habit.title,
        description: habit.description || '',
        linkedTraitId: habit.linkedTraitId || '',
        habitType: habit.habitType,
        cue: habit.cue || '',
        expectedResponse: habit.expectedResponse || '',
        replacementBehavior: habit.replacementBehavior || '',
        frequency: habit.frequency || 'daily',
        difficulty: habit.difficulty || 3,
        baseXp: habit.baseXp || 10,
        isActive: habit.isActive,
        category: habit.category || '',
        targetValue: habit.targetValue || 1,
        unit: habit.unit || 'times',
        priority: habit.priority || 'medium',
        notes: habit.notes || '',
        scheduledDays: habit.scheduledDays || [],
        reminderEnabled: habit.reminderEnabled || false,
        reminderTime: habit.reminderTime || ''
      });
      setEditingHabitId(habit.id);
    } else {
      setHabitForm({
        title: '', description: '', linkedTraitId: '', habitType: 'build',
        cue: '', expectedResponse: '', replacementBehavior: '', frequency: 'daily',
        difficulty: 3, baseXp: 10, isActive: true, category: '', targetValue: 1, unit: 'times',
        priority: 'medium', notes: '', scheduledDays: [], reminderEnabled: false, reminderTime: ''
      });
      setEditingHabitId(null);
    }
    setShowHabitModal(true);
  };

  const handleOpenBadGuyModal = (bg?: CharacterBadGuy) => {
    if (bg) {
      setBadGuyForm({
        title: bg.title,
        triggerDescription: bg.triggerDescription || '',
        warningSigns: bg.warningSigns || '',
        usualBehavior: bg.usualBehavior || '',
        costConsequence: bg.costConsequence || '',
        replacementResponse: bg.replacementResponse || '',
        severity: bg.severity || 5,
        isActive: bg.isActive
      });
      setEditingBadGuyId(bg.id);
    } else {
      setBadGuyForm({
        title: '', triggerDescription: '', warningSigns: '', usualBehavior: '',
        costConsequence: '', replacementResponse: '', severity: 5, isActive: true
      });
      setEditingBadGuyId(null);
    }
    setShowBadGuyModal(true);
  };

  const handleOpenPowerUpModal = (p?: CharacterPowerUp) => {
    if (p) {
      setPowerUpForm({
        title: p.title,
        description: p.description || '',
        durationMinutes: p.durationMinutes || 5,
        category: p.category || 'reset',
        instructions: p.instructions || '',
        isFavorite: p.isFavorite || false
      });
      setEditingPowerUpId(p.id);
    } else {
      setPowerUpForm({
        title: '', description: '', durationMinutes: 5, category: 'reset',
        instructions: '', isFavorite: false
      });
      setEditingPowerUpId(null);
    }
    setShowPowerUpModal(true);
  };

  const handleOpenRuleModal = (r?: CharacterIfThenRule) => {
    if (r) {
      setRuleForm({
        triggerCondition: r.triggerCondition,
        responseAction: r.responseAction,
        linkedTraitId: r.linkedTraitId || '',
        linkedBadGuyId: r.linkedBadGuyId || '',
        isActive: r.isActive
      });
      setEditingRuleId(r.id);
    } else {
      setRuleForm({
        triggerCondition: '', responseAction: '', linkedTraitId: '', linkedBadGuyId: '', isActive: true
      });
      setEditingRuleId(null);
    }
    setShowRuleModal(true);
  };

  // Submit Mutations
  const handleSaveHabit = async () => {
    const payload = {
      ...habitForm,
      linkedTraitId: habitForm.linkedTraitId || null,
      scheduledDays: habitForm.scheduledDays.length > 0 ? habitForm.scheduledDays : null,
      reminderTime: habitForm.reminderTime || null
    };
    if (editingHabitId) {
      await onUpdateHabit(editingHabitId, payload);
    } else {
      await onAddHabit({
        ...payload,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: null,
        preferredTime: null,
        selectedWeekdays: null,
        targetCount: 1,
        plannerTaskId: null,
        reminderSettings: {},
        archiveStatus: false
      });
    }
    setShowHabitModal(false);
  };

  const handleSaveBadGuy = async () => {
    const payload = {
      ...badGuyForm,
      linkedRuleId: null,
      occurrenceCount: 0,
      defeatedCount: 0,
      lastOccurrenceAt: null
    };
    if (editingBadGuyId) {
      await onUpdateBadGuy(editingBadGuyId, payload);
    } else {
      await onAddBadGuy(payload);
    }
    setShowBadGuyModal(false);
  };

  const handleSavePowerUp = async () => {
    const payload = {
      ...powerUpForm,
      linkedBadGuyIds: [],
      usageCount: 0,
      effectivenessRating: 0
    };
    if (editingPowerUpId) {
      await onUpdatePowerUp(editingPowerUpId, payload);
    } else {
      await onAddPowerUp(payload);
    }
    setShowPowerUpModal(false);
  };

  const handleSaveRule = async () => {
    const payload = {
      triggerCondition: ruleForm.triggerCondition,
      responseAction: ruleForm.responseAction,
      linkedTraitId: ruleForm.linkedTraitId || null,
      linkedBadGuyId: ruleForm.linkedBadGuyId || null,
      isActive: ruleForm.isActive,
      successCount: 0,
      failureCount: 0,
      effectivenessScore: 0
    };
    if (editingRuleId) {
      await onUpdateIfThenRule(editingRuleId, payload);
    } else {
      await onAddIfThenRule(payload);
    }
    setShowRuleModal(false);
  };

  const handleDeleteHabit = async (id: string) => {
    if (window.confirm("Delete this habit permanently? Streak logs will be detached.")) {
      await onDeleteHabit(id);
    }
  };

  const handleDeleteBadGuy = async (id: string) => {
    if (window.confirm("Delete this saboteur pattern?")) {
      await onDeleteBadGuy(id);
    }
  };

  const handleDeletePowerUp = async (id: string) => {
    if (window.confirm("Remove this power-up reset?")) {
      await onDeletePowerUp(id);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (window.confirm("Delete If-Then trigger rule?")) {
      await onDeleteIfThenRule(id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── Sub tab navigation ── */}
      <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button className={`glass-btn ${subTab === 'habits' ? 'btn-cyan' : ''}`} style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => setSubTab('habits')}>
          <Target size={13} /> Essential Habits
        </button>
        <button className={`glass-btn ${subTab === 'badguys' ? 'btn-cyan' : ''}`} style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => setSubTab('badguys')}>
          <Skull size={13} /> Saboteurs (Bad Guys)
        </button>
        <button className={`glass-btn ${subTab === 'powerups' ? 'btn-cyan' : ''}`} style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => setSubTab('powerups')}>
          <Zap size={13} /> Power-Ups
        </button>
        <button className={`glass-btn ${subTab === 'ifthen' ? 'btn-cyan' : ''}`} style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => setSubTab('ifthen')}>
          <Brain size={13} /> If-Then Rules
        </button>
      </div>

      {/* ── Search and Filter Header ── */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '150px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="glass-input" style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.8rem', fontSize: '0.72rem' }}
            placeholder={`Search ${subTab}...`} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        
        {subTab !== 'powerups' && (
          <button className="glass-btn" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            onClick={() => setFilterActive(!filterActive)}>
            {filterActive ? <Eye size={14} /> : <EyeOff size={14} />}
            {filterActive ? 'Active' : 'All'}
          </button>
        )}

        <button className="glass-btn btn-cyan" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          onClick={() => {
            if (subTab === 'habits') handleOpenHabitModal();
            if (subTab === 'badguys') handleOpenBadGuyModal();
            if (subTab === 'powerups') handleOpenPowerUpModal();
            if (subTab === 'ifthen') handleOpenRuleModal();
          }}>
          <Plus size={14} /> Add {subTab === 'habits' ? 'Habit' : subTab === 'badguys' ? 'Saboteur' : subTab === 'powerups' ? 'Power-Up' : 'Rule'}
        </button>
      </div>

      {/* ── Sub-tab contents ── */}

      {/* ── Tab: Habits ── */}
      {subTab === 'habits' && (
        <Panel title="Essential Habits" icon={Target} className="os-span-4">
          {filteredHabits.length === 0 ? (
            <EmptyState title="No habits" message="Create daily habits to establish consistent progress." />
          ) : (
            <div className="os-grid-2">
              {filteredHabits.map(habit => {
                const today = new Date().toISOString().split('T')[0];
                const done = habit.lastCompletedDate?.split('T')[0] === today;
                return (
                  <div key={habit.id} className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: `3px solid ${done ? 'var(--accent-teal)' : 'var(--accent-cyan)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.85rem' }}>{habit.title}</strong>
                        {habit.category && <span className="badge badge-neutral" style={{ fontSize: '0.55rem', marginLeft: '0.35rem' }}>{habit.category}</span>}
                      </div>
                      <span className="badge badge-cyan" style={{ fontSize: '0.58rem' }}>+{habit.baseXp} XP</span>
                    </div>

                    {habit.cue && <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--accent-purple)' }}>When:</strong> {habit.cue}</div>}
                    {habit.replacementBehavior && <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--accent-teal)' }}>Then:</strong> {habit.replacementBehavior}</div>}
                    
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      <span>Schedule: {habit.frequency}</span>
                      <span>Difficulty: {habit.difficulty}/10</span>
                      <StreakDisplay current={habit.currentStreak} max={habit.maxStreak} />
                    </div>

                    <CharacterConnections
                      sourceEntityType="habit"
                      sourceEntityId={habit.id}
                      connections={connections}
                      onAddConnection={onAddConnection}
                      onDeleteConnection={onDeleteConnection}
                    />

                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.5rem' }}>
                      <button className={`glass-btn ${done ? 'btn-cyan' : ''}`} style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }} onClick={() => onCompleteHabit(habit.id)} disabled={done || saving}>
                        {done ? 'Logged' : 'Complete'}
                      </button>
                      <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }} onClick={() => onUpdateHabit(habit.id, { isActive: !habit.isActive })}>
                        {habit.isActive ? 'Pause' : 'Activate'}
                      </button>
                      <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', marginLeft: 'auto' }} onClick={() => handleOpenHabitModal(habit)}>
                        <Edit2 size={10} /> Edit
                      </button>
                      <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', color: 'var(--text-danger)' }} onClick={() => handleDeleteHabit(habit.id)}>
                        <Trash2 size={10} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {/* ── Tab: Bad Guys ── */}
      {subTab === 'badguys' && (
        <Panel title="Saboteurs (Self-Sabotage Patterns)" icon={Skull} className="os-span-4">
          {filteredBadGuys.length === 0 ? (
            <EmptyState title="No saboteurs tracked" message="Track self-sabotage urges to study triggers and warnings." />
          ) : (
            <div className="os-grid-2">
              {filteredBadGuys.map(bg => {
                const resistPct = bg.occurrenceCount > 0 ? Math.round((bg.defeatedCount / bg.occurrenceCount) * 100) : 0;
                return (
                  <div key={bg.id} className="glass-card" style={{ padding: '1rem', borderLeft: `3px solid var(--accent-red)` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '0.85rem' }}><Skull size={13} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} className="text-magenta" /> {bg.title}</strong>
                      <span className="badge badge-neutral" style={{ fontSize: '0.58rem' }}>Resisted {bg.defeatedCount}/{bg.occurrenceCount} ({resistPct}%)</span>
                    </div>

                    {bg.triggerDescription && <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}><strong>Trigger:</strong> {bg.triggerDescription}</p>}
                    {bg.warningSigns && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}><strong>Warning signs:</strong> {bg.warningSigns}</p>}
                    {bg.replacementResponse && <p style={{ fontSize: '0.72rem', color: 'var(--accent-teal)' }}><strong>Alternative response:</strong> {bg.replacementResponse}</p>}

                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.75rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.5rem' }}>
                      <button className="glass-btn btn-cyan" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }} onClick={() => onResistBadGuy(bg.id)} disabled={saving}>
                        Resisted
                      </button>
                      <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }} onClick={() => onGiveInBadGuy(bg.id)} disabled={saving}>
                        Urge Encountered
                      </button>
                      <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', marginLeft: 'auto' }} onClick={() => handleOpenBadGuyModal(bg)}>
                        <Edit2 size={10} /> Edit
                      </button>
                      <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', color: 'var(--text-danger)' }} onClick={() => handleDeleteBadGuy(bg.id)}>
                        <Trash2 size={10} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {/* ── Tab: Power-Ups ── */}
      {subTab === 'powerups' && (
        <Panel title="Power-Ups & Resets" icon={Zap} className="os-span-4">
          {filteredPowerUps.length === 0 ? (
            <EmptyState title="No power-ups" message="Add immediate focus exercises or physical resets." />
          ) : (
            <div className="os-grid-2">
              {filteredPowerUps.map(p => (
                <div key={p.id} className="glass-card" style={{ padding: '1rem', borderLeft: '3px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem' }}><Zap size={13} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} className="text-cyan" /> {p.title}</strong>
                    <span className="badge badge-cyan" style={{ fontSize: '0.58rem' }}>{p.durationMinutes} min</span>
                  </div>

                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{p.description}</p>
                  {p.instructions && <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{p.instructions}</p>}

                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.75rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.5rem' }}>
                    <button className="glass-btn btn-cyan" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }} onClick={() => onUsePowerUp(p.id)} disabled={saving}>
                      Use Reset
                    </button>
                    <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', marginLeft: 'auto' }} onClick={() => handleOpenPowerUpModal(p)}>
                      <Edit2 size={10} /> Edit
                    </button>
                    <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', color: 'var(--text-danger)' }} onClick={() => handleDeletePowerUp(p.id)}>
                      <Trash2 size={10} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* ── Tab: If-Then Rules ── */}
      {subTab === 'ifthen' && (
        <Panel title="If-Then Trigger Rules" icon={Brain} className="os-span-4">
          {filteredRules.length === 0 ? (
            <EmptyState title="No If-Then Rules" message="Program automatic behaviors when triggers occur." />
          ) : (
            <div className="os-grid-2">
              {filteredRules.map(r => (
                <div key={r.id} className="glass-card" style={{ padding: '1rem', borderLeft: '3px solid var(--accent-purple)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.78rem' }}><strong style={{ color: 'var(--accent-purple)' }}>IF:</strong> {r.triggerCondition}</div>
                    <div style={{ fontSize: '0.78rem' }}><strong style={{ color: 'var(--accent-teal)' }}>THEN:</strong> {r.responseAction}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    <span>Triggered: {r.successCount + r.failureCount} times</span>
                    <span>Effectiveness: {r.effectivenessScore}%</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.75rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.5rem' }}>
                    <button className="glass-btn btn-cyan" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }} onClick={() => onTriggerRule(r.id, true)} disabled={saving}>
                      Followed
                    </button>
                    <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }} onClick={() => onTriggerRule(r.id, false)} disabled={saving}>
                      Missed Urge
                    </button>
                    <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', marginLeft: 'auto' }} onClick={() => handleOpenRuleModal(r)}>
                      <Edit2 size={10} /> Edit
                    </button>
                    <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', color: 'var(--text-danger)' }} onClick={() => handleDeleteRule(r.id)}>
                      <Trash2 size={10} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* ── HABIT EDIT / CREATE DIALOG ── */}
      {showHabitModal && (
        <div className="modal-overlay" onClick={() => setShowHabitModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={18} className="text-cyan" />
                <h3 style={{ margin: 0 }}>{editingHabitId ? 'Edit Habit Details' : 'Create New Habit'}</h3>
              </div>
              <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => setShowHabitModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              
              {/* Group 1: Basic info */}
              <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>1. Basic Info</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label className="field-label">Habit Name *</label>
                    <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={habitForm.title} onChange={e => setFormAndType(e.target.value, 'title')} />
                  </div>
                  <div>
                    <label className="field-label">Description</label>
                    <textarea className="glass-input" style={{ width: '100%', minHeight: '50px', padding: '0.45rem' }} value={habitForm.description} onChange={e => setFormAndType(e.target.value, 'description')} />
                  </div>
                </div>
              </div>

              {/* Group 2: Habit Type & Cueing */}
              <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--accent-purple)' }}>2. Cue & Expected Action</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="field-label">Habit Type</label>
                    <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={habitForm.habitType} onChange={e => setFormAndType(e.target.value, 'habitType')}>
                      <option value="build">Build Good Habit</option>
                      <option value="break">Break Bad Habit</option>
                      <option value="never_do">Never Do Rule</option>
                      <option value="reduce">Reduce Action</option>
                      <option value="quit">Quit Habit</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Category</label>
                    <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={habitForm.category} onChange={e => setFormAndType(e.target.value, 'category')} placeholder="e.g. Focus, Health" />
                  </div>
                  <div>
                    <label className="field-label">When (Trigger Cue) *</label>
                    <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={habitForm.cue} onChange={e => setFormAndType(e.target.value, 'cue')} placeholder="e.g. After opening laptop" />
                  </div>
                  <div>
                    <label className="field-label">Then (Action Response) *</label>
                    <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={habitForm.replacementBehavior} onChange={e => setFormAndType(e.target.value, 'replacementBehavior')} placeholder="e.g. Write for 2 minutes" />
                  </div>
                </div>
              </div>

              {/* Group 3: Schedule & Difficulty */}
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--accent-teal)' }}>3. Schedule & Scoring</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="field-label">Frequency</label>
                    <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={habitForm.frequency} onChange={e => setFormAndType(e.target.value, 'frequency')}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="weekdays">Weekdays Only</option>
                      <option value="weekends">Weekends Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Difficulty (1-10)</label>
                    <input type="number" min="1" max="10" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={habitForm.difficulty} onChange={e => setFormAndType(Number(e.target.value), 'difficulty')} />
                  </div>
                  <div>
                    <label className="field-label">Base XP Awarded</label>
                    <input type="number" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={habitForm.baseXp} onChange={e => setFormAndType(Number(e.target.value), 'baseXp')} />
                  </div>
                  <div>
                    <label className="field-label">Linked Trait</label>
                    <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={habitForm.linkedTraitId} onChange={e => setFormAndType(e.target.value, 'linkedTraitId')}>
                      <option value="">None</option>
                      {traits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
              <button className="glass-btn" onClick={() => setShowHabitModal(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" onClick={handleSaveHabit} disabled={saving || !habitForm.title}>
                Save Habit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BAD GUY EDIT / CREATE DIALOG ── */}
      {showBadGuyModal && (
        <div className="modal-overlay" onClick={() => setShowBadGuyModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Skull size={18} className="text-magenta" />
                <h3 style={{ margin: 0 }}>{editingBadGuyId ? 'Edit Saboteur Details' : 'Track New Saboteur'}</h3>
              </div>
              <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => setShowBadGuyModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <div>
                <label className="field-label">Saboteur Pattern Title *</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={badGuyForm.title} onChange={e => setBadGuyForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Trigger Description</label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '50px', padding: '0.45rem' }} value={badGuyForm.triggerDescription} onChange={e => setBadGuyForm(p => ({ ...p, triggerDescription: e.target.value }))} placeholder="e.g. Bored at desk, feeling anxious" />
              </div>
              <div>
                <label className="field-label">Warning Signs</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={badGuyForm.warningSigns} onChange={e => setBadGuyForm(p => ({ ...p, warningSigns: e.target.value }))} placeholder="e.g. Phone in hand, opening social tab" />
              </div>
              <div>
                <label className="field-label">Replacement Response</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={badGuyForm.replacementResponse} onChange={e => setBadGuyForm(p => ({ ...p, replacementResponse: e.target.value }))} placeholder="e.g. Shut laptop, stand up for 2 mins" />
              </div>
              <div>
                <label className="field-label">Severity Level (1-10)</label>
                <input type="number" min="1" max="10" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={badGuyForm.severity} onChange={e => setBadGuyForm(p => ({ ...p, severity: Number(e.target.value) }))} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
              <button className="glass-btn" onClick={() => setShowBadGuyModal(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" onClick={handleSaveBadGuy} disabled={saving || !badGuyForm.title}>
                Save Saboteur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── POWER-UP EDIT / CREATE DIALOG ── */}
      {showPowerUpModal && (
        <div className="modal-overlay" onClick={() => setShowPowerUpModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={18} className="text-cyan" />
                <h3 style={{ margin: 0 }}>{editingPowerUpId ? 'Edit Power-Up' : 'Add Power-Up Reset'}</h3>
              </div>
              <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => setShowPowerUpModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <div>
                <label className="field-label">Power-Up Title *</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={powerUpForm.title} onChange={e => setPowerUpForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Description</label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '50px', padding: '0.45rem' }} value={powerUpForm.description} onChange={e => setPowerUpForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Duration (Minutes)</label>
                <input type="number" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={powerUpForm.durationMinutes} onChange={e => setPowerUpForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="field-label">Instructions / Steps</label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '80px', padding: '0.45rem' }} value={powerUpForm.instructions} onChange={e => setPowerUpForm(p => ({ ...p, instructions: e.target.value }))} placeholder="Explain how to execute this power reset..." />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
              <button className="glass-btn" onClick={() => setShowPowerUpModal(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" onClick={handleSavePowerUp} disabled={saving || !powerUpForm.title}>
                Save Power-Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IF-THEN RULE EDIT / CREATE DIALOG ── */}
      {showRuleModal && (
        <div className="modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Brain size={18} className="text-purple" />
                <h3 style={{ margin: 0 }}>{editingRuleId ? 'Edit If-Then Rule' : 'Program If-Then Rule'}</h3>
              </div>
              <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => setShowRuleModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <div>
                <label className="field-label">IF (Trigger Urge / Cue Condition) *</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={ruleForm.triggerCondition} onChange={e => setRuleForm(p => ({ ...p, triggerCondition: e.target.value }))} placeholder="e.g. I notice warning signs of Endless Reels" />
              </div>
              <div>
                <label className="field-label">THEN (Automated Actions Response) *</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={ruleForm.responseAction} onChange={e => setRuleForm(p => ({ ...p, responseAction: e.target.value }))} placeholder="e.g. I will use the Box Breathing power reset" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Link to Trait</label>
                  <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={ruleForm.linkedTraitId} onChange={e => setRuleForm(p => ({ ...p, linkedTraitId: e.target.value }))}>
                    <option value="">None</option>
                    {traits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Link to Saboteur</label>
                  <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={ruleForm.linkedBadGuyId} onChange={e => setRuleForm(p => ({ ...p, linkedBadGuyId: e.target.value }))}>
                    <option value="">None</option>
                    {badGuys.map(bg => <option key={bg.id} value={bg.id}>{bg.title}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
              <button className="glass-btn" onClick={() => setShowRuleModal(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" onClick={handleSaveRule} disabled={saving || !ruleForm.triggerCondition || !ruleForm.responseAction}>
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  function setFormAndType(val: string | number | boolean | number[], field: string) {
    setHabitForm(p => ({ ...p, [field]: val }));
  }
};
