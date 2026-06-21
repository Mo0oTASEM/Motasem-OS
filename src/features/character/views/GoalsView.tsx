import React, { useState } from 'react';
import { 
  Target, Plus, Search, Trash2, Edit2, Archive, Copy, 
  Star, FileCheck, X, Link2
} from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import { TraitRadar } from '../components/TraitRadar';
import { CharacterConnections } from '../components/CharacterConnections';
import type { 
  CharacterGoal, CharacterConnection, CharacterTrait, CharacterHabit, CharacterQuest, CharacterReflection,
  CharacterContract, ExposureLadder,
  StakeType, TraitStatus, ContractCompletionStatus
} from '../types';
import type { Goal as PlannerGoal } from '../../../context/AppContext';
import { DEFAULT_TRAIT_NAMES, TRAIT_DESCRIPTIONS } from '../types';

interface GoalsViewProps {
  goals: CharacterGoal[];
  plannerGoals: PlannerGoal[];
  connections: CharacterConnection[];
  onAddConnection: (conn: Omit<CharacterConnection, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  onDeleteConnection: (id: string) => Promise<void>;
  onAddGoal: (goal: Omit<CharacterGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateGoal: (id: string, updates: Partial<CharacterGoal>) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  saving?: boolean;

  // Traits
  traits: CharacterTrait[];
  habits: CharacterHabit[];
  quests: CharacterQuest[];
  reflections: CharacterReflection[];
  ladders: ExposureLadder[];
  onAddTrait: (trait: Omit<CharacterTrait, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateTrait: (id: string, updates: Partial<CharacterTrait>) => Promise<void>;
  onDeleteTrait: (id: string) => Promise<void>;

  // Contracts
  contracts: CharacterContract[];
  onAddContract: (contract: Omit<CharacterContract, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'completedAt'>) => Promise<void>;
  onUpdateContract: (id: string, updates: Partial<CharacterContract>) => Promise<void>;
  onDeleteContract: (id: string) => Promise<void>;
  onCompleteContract: (id: string) => Promise<void>;
  onFailContract: (id: string) => Promise<void>;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals, plannerGoals, connections, onAddConnection, onDeleteConnection, onAddGoal, onUpdateGoal, onDeleteGoal, saving,
  traits, onAddTrait, onUpdateTrait, onDeleteTrait,
  contracts, onAddContract, onUpdateContract, onDeleteContract, onCompleteContract, onFailContract
}) => {
  const [subTab, setSubTab] = useState<'goals' | 'traits' | 'contracts'>('goals');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'archived'>('active');

  // Modals visibility
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const [showTraitModal, setShowTraitModal] = useState(false);
  const [editingTraitId, setEditingTraitId] = useState<string | null>(null);

  const [showContractModal, setShowContractModal] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);

  // Form states
  const [goalForm, setGoalForm] = useState({
    title: '', description: '', category: '', targetOutcome: '',
    measurableSuccessCriteria: '', priority: 'medium', status: 'active',
    startDate: null as string | null, targetDate: null as string | null,
    progressPercentage: 0, linkedMonthlyGoalId: null as string | null,
    linkedWeeklyGoalId: null as string | null, parentGoalId: null as string | null,
    xpReward: 50,
  });

  const [traitForm, setTraitForm] = useState({
    name: '', description: '', currentScore: 0, targetScore: 10,
    status: 'active' as TraitStatus, displayOrder: 1
  });

  const [contractForm, setContractForm] = useState({
    title: '', goalDescription: '', measurableCommitment: '',
    reportingFrequency: 'weekly', startDate: new Date().toISOString().split('T')[0],
    endDate: null as string | null, proofRequirement: '',
    accountabilityPerson: '', crmContactId: null as string | null,
    stakeType: 'none' as StakeType, stakeDescription: '',
    consequence: '', graceRules: '', isActive: true, completionStatus: 'pending' as ContractCompletionStatus,
  });

  // Filters
  const filteredGoals = goals.filter(g => {
    const matchesSearch = g.title.toLowerCase().includes(search.toLowerCase()) || 
                          (g.description && g.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredTraits = traits.filter(t => {
    return t.name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredContracts = contracts.filter(c => {
    return c.title.toLowerCase().includes(search.toLowerCase());
  });

  // Modal open helpers
  const handleOpenGoalModal = (g?: CharacterGoal) => {
    if (g) {
      setGoalForm({
        title: g.title, description: g.description || '', category: g.category || '',
        targetOutcome: g.targetOutcome || '', measurableSuccessCriteria: g.measurableSuccessCriteria || '',
        priority: g.priority || 'medium', status: g.status,
        startDate: g.startDate ? g.startDate.split('T')[0] : '',
        targetDate: g.targetDate ? g.targetDate.split('T')[0] : '',
        progressPercentage: g.progressPercentage || 0,
        linkedMonthlyGoalId: g.linkedMonthlyGoalId, linkedWeeklyGoalId: g.linkedWeeklyGoalId,
        parentGoalId: g.parentGoalId, xpReward: g.xpReward || 50
      });
      setEditingGoalId(g.id);
    } else {
      setGoalForm({
        title: '', description: '', category: '', targetOutcome: '',
        measurableSuccessCriteria: '', priority: 'medium', status: 'active',
        startDate: '', targetDate: '', progressPercentage: 0,
        linkedMonthlyGoalId: null, linkedWeeklyGoalId: null, parentGoalId: null,
        xpReward: 50
      });
      setEditingGoalId(null);
    }
    setShowGoalModal(true);
  };

  const handleOpenTraitModal = (t?: CharacterTrait) => {
    if (t) {
      setTraitForm({
        name: t.name, description: t.description || '', currentScore: t.currentScore || 0,
        targetScore: t.targetScore || 10, status: t.status, displayOrder: t.displayOrder || 1
      });
      setEditingTraitId(t.id);
    } else {
      setTraitForm({
        name: '', description: '', currentScore: 0, targetScore: 10, status: 'active',
        displayOrder: traits.length + 1
      });
      setEditingTraitId(null);
    }
    setShowTraitModal(true);
  };

  const handleOpenContractModal = (c?: CharacterContract) => {
    if (c) {
      setContractForm({
        title: c.title, goalDescription: c.goalDescription || '', measurableCommitment: c.measurableCommitment || '',
        reportingFrequency: c.reportingFrequency || 'weekly',
        startDate: c.startDate ? c.startDate.split('T')[0] : '',
        endDate: c.endDate ? c.endDate.split('T')[0] : '',
        proofRequirement: c.proofRequirement || '', accountabilityPerson: c.accountabilityPerson || '',
        crmContactId: c.crmContactId, stakeType: c.stakeType || 'none',
        stakeDescription: c.stakeDescription || '', consequence: c.consequence || '',
        graceRules: c.graceRules || '', isActive: c.isActive, completionStatus: c.completionStatus
      });
      setEditingContractId(c.id);
    } else {
      setContractForm({
        title: '', goalDescription: '', measurableCommitment: '', reportingFrequency: 'weekly',
        startDate: new Date().toISOString().split('T')[0], endDate: '', proofRequirement: '',
        accountabilityPerson: '', crmContactId: null, stakeType: 'none', stakeDescription: '',
        consequence: '', graceRules: '', isActive: true, completionStatus: 'pending'
      });
      setEditingContractId(null);
    }
    setShowContractModal(true);
  };

  // Submit mutations
  const handleSaveGoal = async () => {
    const payload = {
      ...goalForm,
      startDate: goalForm.startDate ? new Date(goalForm.startDate).toISOString() : null,
      targetDate: goalForm.targetDate ? new Date(goalForm.targetDate).toISOString() : null,
    };
    if (editingGoalId) {
      await onUpdateGoal(editingGoalId, payload);
    } else {
      await onAddGoal(payload);
    }
    setShowGoalModal(false);
  };

  const handleSaveTrait = async () => {
    if (editingTraitId) {
      await onUpdateTrait(editingTraitId, traitForm);
    } else {
      await onAddTrait({
        name: traitForm.name,
        description: traitForm.description || TRAIT_DESCRIPTIONS[traitForm.name] || '',
        icon: 'star',
        visualKey: null,
        currentScore: traitForm.currentScore,
        lifetimeXp: 0,
        currentRank: 1,
        targetScore: traitForm.targetScore,
        status: traitForm.status,
        displayOrder: traitForm.displayOrder
      });
    }
    setShowTraitModal(false);
  };

  const handleSaveContract = async () => {
    const payload = {
      ...contractForm,
      endDate: contractForm.endDate ? new Date(contractForm.endDate).toISOString() : null,
    };
    if (editingContractId) {
      await onUpdateContract(editingContractId, payload);
    } else {
      await onAddContract(payload);
    }
    setShowContractModal(false);
  };

  const handleDeleteGoal = async (id: string) => {
    if (window.confirm("Delete this development goal permanently?")) {
      await onDeleteGoal(id);
    }
  };

  const handleDeleteTrait = async (id: string) => {
    if (window.confirm("Delete this trait? Associated habits/ladders will be unlinked.")) {
      await onDeleteTrait(id);
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (window.confirm("Delete this accountability contract permanently?")) {
      await onDeleteContract(id);
    }
  };

  const handleDuplicateGoal = async (g: CharacterGoal) => {
    await onAddGoal({
      title: `${g.title} (Copy)`, description: g.description || '', category: g.category || '',
      targetOutcome: g.targetOutcome || '', measurableSuccessCriteria: g.measurableSuccessCriteria || '',
      priority: g.priority || 'medium', status: 'active', startDate: g.startDate,
      targetDate: g.targetDate, progressPercentage: 0,
      linkedMonthlyGoalId: null, linkedWeeklyGoalId: null,
      parentGoalId: g.parentGoalId, xpReward: g.xpReward || 50
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── Sub tabs navigation ── */}
      <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button className={`glass-btn ${subTab === 'goals' ? 'btn-cyan' : ''}`} style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => setSubTab('goals')}>
          <Target size={13} /> Sprints & Objectives
        </button>
        <button className={`glass-btn ${subTab === 'traits' ? 'btn-cyan' : ''}`} style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => setSubTab('traits')}>
          <Star size={13} /> Core Traits
        </button>
        <button className={`glass-btn ${subTab === 'contracts' ? 'btn-cyan' : ''}`} style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => setSubTab('contracts')}>
          <FileCheck size={13} /> Accountability Contracts
        </button>
      </div>

      {/* ── Search & Actions Header ── */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '150px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="glass-input" style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.8rem', fontSize: '0.72rem' }}
            placeholder={`Search ${subTab}...`} value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {subTab === 'goals' && (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {(['active', 'completed', 'archived'] as const).map(status => (
              <button key={status} className={`glass-btn ${statusFilter === status ? 'btn-cyan' : ''}`}
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem', textTransform: 'capitalize' }}
                onClick={() => setStatusFilter(status)}>
                {status}
              </button>
            ))}
          </div>
        )}

        <button className="glass-btn btn-cyan" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          onClick={() => {
            if (subTab === 'goals') handleOpenGoalModal();
            if (subTab === 'traits') handleOpenTraitModal();
            if (subTab === 'contracts') handleOpenContractModal();
          }}>
          <Plus size={14} /> Add {subTab === 'goals' ? 'Goal' : subTab === 'traits' ? 'Trait' : 'Contract'}
        </button>
      </div>

      {/* ── Tab: Goals ── */}
      {subTab === 'goals' && (
        <Panel title="Sprints & Objectives" icon={Target} className="os-span-4">
          {filteredGoals.length === 0 ? (
            <EmptyState title="No goals found" message="Define goals to map your character progression." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredGoals.map(goal => {
                const hasPlannerLink = !!(goal.linkedMonthlyGoalId || goal.linkedWeeklyGoalId);
                return (
                  <div key={goal.id} className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '3px solid var(--accent-cyan)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.85rem' }}>{goal.title}</strong>
                        {goal.category && <span className="badge badge-neutral" style={{ fontSize: '0.55rem', marginLeft: '0.35rem' }}>{goal.category}</span>}
                        <span className={`badge ${
                          goal.priority === 'critical' ? 'badge-danger' : 
                          goal.priority === 'high' ? 'badge-orange' : 
                          goal.priority === 'medium' ? 'badge-cyan' : 'badge-neutral'
                        }`} style={{ fontSize: '0.55rem', marginLeft: '0.35rem' }}>
                          {goal.priority} priority
                        </span>
                        {hasPlannerLink && (
                          <span className="badge badge-purple" style={{ fontSize: '0.55rem', marginLeft: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Link2 size={10} /> Planner Linked
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => handleOpenGoalModal(goal)}>
                          <Edit2 size={11} />
                        </button>
                        <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => handleDuplicateGoal(goal)}>
                          <Copy size={11} />
                        </button>
                        {goal.status !== 'archived' ? (
                          <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => onUpdateGoal(goal.id, { status: 'archived' })}>
                            <Archive size={11} />
                          </button>
                        ) : (
                          <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => onUpdateGoal(goal.id, { status: 'active' })}>
                            <Plus size={11} /> Restore
                          </button>
                        )}
                        <button className="glass-btn" style={{ padding: '0.25rem', color: 'var(--text-danger)' }} onClick={() => handleDeleteGoal(goal.id)}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{goal.description}</p>
                    {goal.targetOutcome && <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--accent-teal)' }}>Target:</strong> {goal.targetOutcome}</div>}
                    {goal.measurableSuccessCriteria && <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--accent-purple)' }}>Success criteria:</strong> {goal.measurableSuccessCriteria}</div>}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <div className="progress-bar" style={{ height: '6px', flex: 1 }}>
                        <div className="progress-fill" style={{ width: `${goal.progressPercentage}%` }} />
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{goal.progressPercentage}%</span>
                    </div>

                    <CharacterConnections
                      sourceEntityType="goal"
                      sourceEntityId={goal.id}
                      connections={connections}
                      onAddConnection={onAddConnection}
                      onDeleteConnection={onDeleteConnection}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {/* ── Tab: Traits ── */}
      {subTab === 'traits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="os-grid-2">
            <Panel title="Trait Radar" icon={Star} className="os-span-1">
              {traits.length === 0 ? (
                <EmptyState title="No traits" message="Add traits to see your radar." />
              ) : (
                <TraitRadar traits={traits} />
              )}
            </Panel>

            <Panel title="Trait Rank Distribution" icon={Star} className="os-span-1">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {traits.slice().sort((a,b) => b.lifetimeXp - a.lifetimeXp).map(t => (
                  <div key={t.id} style={{ fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                      <span>{t.name}</span>
                      <strong>Lv.{t.currentRank} (XP: {t.lifetimeXp})</strong>
                    </div>
                    <div className="progress-bar" style={{ height: '4px' }}>
                      <div className="progress-fill" style={{ width: `${Math.min(100, (t.lifetimeXp % 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel title="All Core Traits" icon={Star} className="os-span-4">
            {filteredTraits.length === 0 ? (
              <EmptyState title="No traits" message="Select core character values/traits to track." />
            ) : (
              <div className="os-grid-2">
                {filteredTraits.map(t => (
                  <div key={t.id} className="glass-card" style={{ padding: '1rem', borderLeft: '3px solid var(--accent-purple)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '0.85rem' }}>{t.name}</strong>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button className="glass-btn" style={{ padding: '0.2rem' }} onClick={() => handleOpenTraitModal(t)}>
                          <Edit2 size={10} />
                        </button>
                        <button className="glass-btn" style={{ padding: '0.2rem', color: 'var(--text-danger)' }} onClick={() => handleDeleteTrait(t.id)}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      <span>Rank: {t.currentRank}</span>
                      <span>Target: {t.targetScore}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ── Tab: Contracts ── */}
      {subTab === 'contracts' && (
        <Panel title="Accountability Contracts" icon={FileCheck} className="os-span-4">
          {filteredContracts.length === 0 ? (
            <EmptyState title="No contracts" message="Write accountability commitments to ensure social or financial stakes keep you on track." />
          ) : (
            <div className="os-grid-2">
              {filteredContracts.map(c => (
                <div key={c.id} className="glass-card" style={{ padding: '1rem', borderLeft: '3px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem' }}>{c.title}</strong>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <button className="glass-btn" style={{ padding: '0.2rem' }} onClick={() => handleOpenContractModal(c)}>
                        <Edit2 size={10} />
                      </button>
                      <button className="glass-btn" style={{ padding: '0.2rem', color: 'var(--text-danger)' }} onClick={() => handleDeleteContract(c.id)}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{c.measurableCommitment}</p>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Partner: {c.accountabilityPerson || 'Self'} | Stake: {c.stakeType}
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.5rem' }}>
                    {c.completionStatus === 'pending' ? (
                      <>
                        <button className="glass-btn btn-cyan" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }} onClick={() => onCompleteContract(c.id)}>
                          Complete
                        </button>
                        <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }} onClick={() => onFailContract(c.id)}>
                          Failed
                        </button>
                      </>
                    ) : (
                      <span className={`badge ${c.completionStatus === 'completed' ? 'badge-cyan' : 'badge-danger'}`} style={{ fontSize: '0.6rem' }}>
                        {c.completionStatus}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* ── GOAL EDIT / CREATE DIALOG ── */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="modal-content" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={18} className="text-cyan" />
                <h3 style={{ margin: 0 }}>{editingGoalId ? 'Edit Goal Details' : 'Create New Goal'}</h3>
              </div>
              <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => setShowGoalModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <div>
                <label className="field-label">Goal Title *</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={goalForm.title} onChange={e => setGoalForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Description</label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '60px', padding: '0.45rem' }} value={goalForm.description} onChange={e => setGoalForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Category</label>
                  <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={goalForm.category} onChange={e => setGoalForm(p => ({ ...p, category: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Priority</label>
                  <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={goalForm.priority} onChange={e => setGoalForm(p => ({ ...p, priority: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Target Outcome</label>
                  <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={goalForm.targetOutcome} onChange={e => setGoalForm(p => ({ ...p, targetOutcome: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Measurable Success Criteria</label>
                  <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={goalForm.measurableSuccessCriteria} onChange={e => setGoalForm(p => ({ ...p, measurableSuccessCriteria: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Start Date</label>
                  <input type="date" className="glass-input" style={{ width: '100%', padding: '0.4rem' }} value={goalForm.startDate || ''} onChange={e => setGoalForm(p => ({ ...p, startDate: e.target.value || null }))} />
                </div>
                <div>
                  <label className="field-label">Target End Date</label>
                  <input type="date" className="glass-input" style={{ width: '100%', padding: '0.4rem' }} value={goalForm.targetDate || ''} onChange={e => setGoalForm(p => ({ ...p, targetDate: e.target.value || null }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Progress Percentage (0-100)</label>
                  <input type="number" min="0" max="100" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={goalForm.progressPercentage} onChange={e => setGoalForm(p => ({ ...p, progressPercentage: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="field-label">XP Reward</label>
                  <input type="number" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={goalForm.xpReward} onChange={e => setGoalForm(p => ({ ...p, xpReward: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="field-label">Link Monthly OS Planner Goal</label>
                <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={goalForm.linkedMonthlyGoalId || ''} onChange={e => setGoalForm(p => ({ ...p, linkedMonthlyGoalId: e.target.value || null }))}>
                  <option value="">None</option>
                  {plannerGoals.filter(pg => pg.level === 'monthly').map(pg => (
                    <option key={pg.id} value={pg.id}>{pg.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
              <button className="glass-btn" onClick={() => setShowGoalModal(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" onClick={handleSaveGoal} disabled={saving || !goalForm.title}>
                Save Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TRAIT EDIT / CREATE DIALOG ── */}
      {showTraitModal && (
        <div className="modal-overlay" onClick={() => setShowTraitModal(false)}>
          <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Star size={18} className="text-purple" />
                <h3 style={{ margin: 0 }}>{editingTraitId ? 'Edit Core Trait' : 'Add Core Trait'}</h3>
              </div>
              <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => setShowTraitModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {editingTraitId ? (
                <div>
                  <label className="field-label">Trait Name</label>
                  <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={traitForm.name} disabled />
                </div>
              ) : (
                <div>
                  <label className="field-label">Select Trait *</label>
                  <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={traitForm.name} onChange={e => setTraitForm(p => ({ ...p, name: e.target.value }))}>
                    <option value="">Choose a value...</option>
                    {DEFAULT_TRAIT_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="field-label">Description</label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '60px', padding: '0.45rem' }} value={traitForm.description} onChange={e => setTraitForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Target Score</label>
                  <input type="number" min="1" max="10" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={traitForm.targetScore} onChange={e => setTraitForm(p => ({ ...p, targetScore: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={traitForm.status} onChange={e => setTraitForm(p => ({ ...p, status: e.target.value as TraitStatus }))}>
                    <option value="active">Active</option>
                    <option value="locked">Locked</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
              <button className="glass-btn" onClick={() => setShowTraitModal(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" onClick={handleSaveTrait} disabled={saving || !traitForm.name}>
                Save Trait
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACCOUNTABILITY CONTRACT EDIT / CREATE DIALOG ── */}
      {showContractModal && (
        <div className="modal-overlay" onClick={() => setShowContractModal(false)}>
          <div className="modal-content" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCheck size={18} className="text-cyan" />
                <h3 style={{ margin: 0 }}>{editingContractId ? 'Edit Contract' : 'Create Accountability Contract'}</h3>
              </div>
              <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => setShowContractModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <div>
                <label className="field-label">Contract Title *</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={contractForm.title} onChange={e => setContractForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Measurable Commitment *</label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '60px', padding: '0.45rem' }} value={contractForm.measurableCommitment} onChange={e => setContractForm(p => ({ ...p, measurableCommitment: e.target.value }))} placeholder="Explain exactly what you commit to do..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Accountability Partner / Person</label>
                  <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={contractForm.accountabilityPerson} onChange={e => setContractForm(p => ({ ...p, accountabilityPerson: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Reporting Frequency</label>
                  <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={contractForm.reportingFrequency} onChange={e => setContractForm(p => ({ ...p, reportingFrequency: e.target.value }))}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Stake Type</label>
                  <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={contractForm.stakeType} onChange={e => setContractForm(p => ({ ...p, stakeType: e.target.value as StakeType }))}>
                    <option value="none">None</option>
                    <option value="social">Social Stake</option>
                    <option value="personal">Personal Stake</option>
                    <option value="financial">Financial Stake</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Stake Description</label>
                  <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={contractForm.stakeDescription} onChange={e => setContractForm(p => ({ ...p, stakeDescription: e.target.value }))} placeholder="e.g. $50 donation to charity if failed" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Start Date</label>
                  <input type="date" className="glass-input" style={{ width: '100%', padding: '0.4rem' }} value={contractForm.startDate} onChange={e => setContractForm(p => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">End Date</label>
                  <input type="date" className="glass-input" style={{ width: '100%', padding: '0.4rem' }} value={contractForm.endDate || ''} onChange={e => setContractForm(p => ({ ...p, endDate: e.target.value || null }))} />
                </div>
              </div>
              <div>
                <label className="field-label">Consequence / Penalty</label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '50px', padding: '0.45rem' }} value={contractForm.consequence} onChange={e => setContractForm(p => ({ ...p, consequence: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
              <button className="glass-btn" onClick={() => setShowContractModal(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" onClick={handleSaveContract} disabled={saving || !contractForm.title || !contractForm.measurableCommitment}>
                Save Contract
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
