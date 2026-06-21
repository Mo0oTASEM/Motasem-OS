import React, { useState } from 'react';
import { 
  Trophy, Plus, Search, Trash2, Edit2, 
  Sword, Footprints, Sparkles, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import { QuestGenerator } from '../components/QuestGenerator';
import { ExposureStepCard } from '../components/ExposureStepCard';
import { LadderGenerator } from '../components/LadderGenerator';
import { CharacterConnections } from '../components/CharacterConnections';
import type { 
  CharacterChallenge, CharacterConnection, CharacterQuest, ExposureLadder, 
  CharacterTrait, QuestType, ExposureStep, BonusCondition, QuestStatus, 
  QuestSource, LadderStatus, DifficultyPolicy
} from '../types';
import type { PlannerTask } from '../../../context/AppContext';
import type { 
  QuestGenerationRequest, GeneratedQuest, LadderGenerationRequest, GeneratedLadder 
} from '../services/characterCoachTypes';
import type { CoachResult } from '../services/characterCoachClient';

interface ChallengesViewProps {
  challenges: CharacterChallenge[];
  plannerTasks: PlannerTask[];
  connections: CharacterConnection[];
  onAddConnection: (conn: Omit<CharacterConnection, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  onDeleteConnection: (id: string) => Promise<void>;
  onAddChallenge: (challenge: Omit<CharacterChallenge, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateChallenge: (id: string, updates: Partial<CharacterChallenge>) => Promise<void>;
  onDeleteChallenge: (id: string) => Promise<void>;
  saving?: boolean;

  // Quests
  quests: CharacterQuest[];
  traits: CharacterTrait[];
  onAddQuest: (quest: Omit<CharacterQuest, 'id' | 'userId' | 'createdAt' | 'completedAt'>) => Promise<void>;
  onUpdateQuest: (id: string, updates: Partial<CharacterQuest>) => Promise<void>;
  onCompleteQuest: (id: string) => Promise<void>;
  onDeleteQuest: (id: string) => Promise<void>;
  onGenerateQuest?: (req: QuestGenerationRequest) => Promise<CoachResult<{ quest: GeneratedQuest; disclaimer?: string }>>;

  // Exposure Ladders
  ladders: ExposureLadder[];
  onAddLadder: (ladder: Omit<ExposureLadder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateLadder: (id: string, updates: Partial<ExposureLadder>) => Promise<void>;
  onDeleteLadder: (id: string) => Promise<void>;
  onCompleteStep?: (stepId: string) => Promise<void>;
  onGenerateLadder?: (req: LadderGenerationRequest) => Promise<CoachResult<{ ladder: GeneratedLadder; disclaimer?: string }>>;
}

export const ChallengesView: React.FC<ChallengesViewProps> = ({
  challenges, connections, onAddConnection, onDeleteConnection, onAddChallenge, onUpdateChallenge, onDeleteChallenge, saving,
  quests, traits, onAddQuest, onUpdateQuest, onCompleteQuest, onDeleteQuest, onGenerateQuest,
  ladders, onAddLadder, onUpdateLadder, onDeleteLadder, onCompleteStep, onGenerateLadder
}) => {
  const [subTab, setSubTab] = useState<'challenges' | 'quests' | 'ladders'>('challenges');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'failed' | 'archived'>('active');
  const [expandedLadder, setExpandedLadder] = useState<string | null>(null);

  // Modal forms visibility
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);

  const [showQuestModal, setShowQuestModal] = useState(false);
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);

  const [showLadderModal, setShowLadderModal] = useState(false);
  const [editingLadderId, setEditingLadderId] = useState<string | null>(null);

  const [showQuestGenerator, setShowQuestGenerator] = useState(false);
  const [showLadderGenerator, setShowLadderGenerator] = useState(false);

  // Form states
  const [challengeForm, setChallengeForm] = useState({
    title: '', description: '', difficulty: 'medium', category: '',
    challengeType: 'standard', status: 'active', target: 1, progress: 0,
    startDate: null as string | null, deadline: null as string | null,
    xpReward: 100, linkedDailyTaskId: null as string | null,
    linkedWeeklyGoalId: null as string | null, linkedMonthlyGoalId: null as string | null,
    aiGenerated: false,
  });

  const [questForm, setQuestForm] = useState({
    questType: 'standard' as QuestType, title: '', description: '',
    whyItMatters: '', linkedTraitIds: [] as string[],
    difficulty: 3, estimatedDiscomfort: 3, targetDate: null as string | null,
    checklistSteps: [] as { order: number; description: string; isDone: boolean }[], 
    requiredProof: '', proofType: 'text', rewardXp: 50, bonusConditions: [] as BonusCondition[], 
    failureRule: 'retry', retryCount: 0, status: 'active' as QuestStatus,
    source: 'user' as QuestSource, aiGenerationMetadata: {}, plannerTaskId: null as string | null,
    goalId: null as string | null, crmContactId: null as string | null, crmOpportunityId: null as string | null,
  });

  const [ladderForm, setLadderForm] = useState({
    title: '', description: '', linkedTraitId: '', desiredEndBehavior: '',
    status: 'active' as LadderStatus, currentStep: 0, completionPercentage: 0,
    difficultyPolicy: 'graduated' as DifficultyPolicy, aiAdaptationEnabled: true,
    steps: [] as ExposureStep[]
  });

  const QUEST_TYPES: { type: QuestType; label: string }[] = [
    { type: 'standard', label: 'Standard' },
    { type: 'courage', label: 'Courage' },
    { type: 'exposure', label: 'Exposure' },
    { type: 'boss_fight', label: 'Boss Fight' },
    { type: 'recovery', label: 'Recovery' },
    { type: 'reflection', label: 'Reflection' },
  ];

  // Filtering
  const filteredChallenges = challenges.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                          c.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredQuests = quests.filter(q => {
    return q.title.toLowerCase().includes(search.toLowerCase()) || 
           q.description.toLowerCase().includes(search.toLowerCase());
  });

  const filteredLadders = ladders.filter(l => {
    return l.title.toLowerCase().includes(search.toLowerCase()) || 
           l.description.toLowerCase().includes(search.toLowerCase());
  });

  // Modal open handlers
  const handleOpenChallengeModal = (c?: CharacterChallenge) => {
    if (c) {
      setChallengeForm({
        title: c.title, description: c.description || '', difficulty: c.difficulty,
        category: c.category || '', challengeType: c.challengeType || 'standard', status: c.status,
        target: c.target || 1, progress: c.progress || 0, startDate: c.startDate ? c.startDate.split('T')[0] : '',
        deadline: c.deadline ? c.deadline.split('T')[0] : '', xpReward: c.xpReward || 100,
        linkedDailyTaskId: c.linkedDailyTaskId, linkedWeeklyGoalId: c.linkedWeeklyGoalId,
        linkedMonthlyGoalId: c.linkedMonthlyGoalId, aiGenerated: c.aiGenerated,
      });
      setEditingChallengeId(c.id);
    } else {
      setChallengeForm({
        title: '', description: '', difficulty: 'medium', category: '',
        challengeType: 'standard', status: 'active', target: 1, progress: 0,
        startDate: '', deadline: '', xpReward: 100, linkedDailyTaskId: null,
        linkedWeeklyGoalId: null, linkedMonthlyGoalId: null, aiGenerated: false,
      });
      setEditingChallengeId(null);
    }
    setShowChallengeModal(true);
  };

  const handleOpenQuestModal = (q?: CharacterQuest) => {
    if (q) {
      setQuestForm({
        questType: q.questType, title: q.title, description: q.description || '',
        whyItMatters: q.whyItMatters || '', linkedTraitIds: q.linkedTraitIds || [],
        difficulty: q.difficulty || 3, estimatedDiscomfort: q.estimatedDiscomfort || 3,
        targetDate: q.targetDate ? q.targetDate.split('T')[0] : '',
        checklistSteps: q.checklistSteps || [], requiredProof: q.requiredProof || '',
        proofType: q.proofType || 'text', rewardXp: q.rewardXp || 50,
        bonusConditions: q.bonusConditions || [], failureRule: q.failureRule || 'retry',
        retryCount: q.retryCount || 0, status: q.status, source: q.source,
        aiGenerationMetadata: q.aiGenerationMetadata || {}, plannerTaskId: q.plannerTaskId,
        goalId: q.goalId, crmContactId: q.crmContactId, crmOpportunityId: q.crmOpportunityId
      });
      setEditingQuestId(q.id);
    } else {
      setQuestForm({
        questType: 'standard', title: '', description: '', whyItMatters: '', linkedTraitIds: [],
        difficulty: 3, estimatedDiscomfort: 3, targetDate: '', checklistSteps: [],
        requiredProof: '', proofType: 'text', rewardXp: 50, bonusConditions: [],
        failureRule: 'retry', retryCount: 0, status: 'active', source: 'user',
        aiGenerationMetadata: {}, plannerTaskId: null, goalId: null,
        crmContactId: null, crmOpportunityId: null
      });
      setEditingQuestId(null);
    }
    setShowQuestModal(true);
  };

  const handleOpenLadderModal = (l?: ExposureLadder) => {
    if (l) {
      setLadderForm({
        title: l.title, description: l.description || '',
        linkedTraitId: l.linkedTraitId || '', desiredEndBehavior: l.desiredEndBehavior || '',
        status: l.status, currentStep: l.currentStep || 0, completionPercentage: l.completionPercentage || 0,
        difficultyPolicy: l.difficultyPolicy || 'graduated', aiAdaptationEnabled: l.aiAdaptationEnabled,
        steps: l.steps || []
      });
      setEditingLadderId(l.id);
    } else {
      setLadderForm({
        title: '', description: '', linkedTraitId: '', desiredEndBehavior: '',
        status: 'active', currentStep: 0, completionPercentage: 0,
        difficultyPolicy: 'graduated', aiAdaptationEnabled: true,
        steps: []
      });
      setEditingLadderId(null);
    }
    setShowLadderModal(true);
  };

  // Submit mutations
  const handleSaveChallenge = async () => {
    const payload = {
      ...challengeForm,
      startDate: challengeForm.startDate ? new Date(challengeForm.startDate).toISOString() : null,
      deadline: challengeForm.deadline ? new Date(challengeForm.deadline).toISOString() : null,
    };
    if (editingChallengeId) {
      await onUpdateChallenge(editingChallengeId, payload);
    } else {
      await onAddChallenge(payload);
    }
    setShowChallengeModal(false);
  };

  const handleSaveQuest = async () => {
    const payload = {
      ...questForm,
      targetDate: questForm.targetDate ? new Date(questForm.targetDate).toISOString() : null,
    };
    if (editingQuestId) {
      await onUpdateQuest(editingQuestId, payload);
    } else {
      await onAddQuest(payload);
    }
    setShowQuestModal(false);
  };

  const handleSaveLadder = async () => {
    const payload = {
      ...ladderForm,
      linkedTraitId: ladderForm.linkedTraitId || null
    };
    if (editingLadderId) {
      await onUpdateLadder(editingLadderId, payload);
    } else {
      await onAddLadder(payload);
    }
    setShowLadderModal(false);
  };

  const handleDeleteChallenge = async (id: string) => {
    if (window.confirm("Delete this challenge permanently?")) {
      await onDeleteChallenge(id);
    }
  };

  const handleDeleteQuest = async (id: string) => {
    if (window.confirm("Delete this quest permanently?")) {
      await onDeleteQuest(id);
    }
  };

  const handleDeleteLadder = async (id: string) => {
    if (window.confirm("Delete this exposure ladder permanently?")) {
      await onDeleteLadder(id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── Sub tabs ── */}
      <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button className={`glass-btn ${subTab === 'challenges' ? 'btn-cyan' : ''}`} style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => setSubTab('challenges')}>
          <Trophy size={13} /> Challenges
        </button>
        <button className={`glass-btn ${subTab === 'quests' ? 'btn-cyan' : ''}`} style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => setSubTab('quests')}>
          <Sword size={13} /> Quests
        </button>
        <button className={`glass-btn ${subTab === 'ladders' ? 'btn-cyan' : ''}`} style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => setSubTab('ladders')}>
          <Footprints size={13} /> Exposure Ladders
        </button>
      </div>

      {/* ── Search & Actions Header ── */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '150px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="glass-input" style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.8rem', fontSize: '0.72rem' }}
            placeholder={`Search ${subTab}...`} value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {subTab === 'challenges' && (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {(['active', 'completed', 'failed', 'archived'] as const).map(status => (
              <button key={status} className={`glass-btn ${statusFilter === status ? 'btn-cyan' : ''}`}
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem', textTransform: 'capitalize' }}
                onClick={() => setStatusFilter(status)}>
                {status}
              </button>
            ))}
          </div>
        )}

        {subTab === 'quests' && onGenerateQuest && (
          <button className="glass-btn" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onClick={() => setShowQuestGenerator(true)}>
            <Sparkles size={14} /> AI Generate Quest
          </button>
        )}

        {subTab === 'ladders' && onGenerateLadder && (
          <button className="glass-btn" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onClick={() => setShowLadderGenerator(true)}>
            <Sparkles size={14} /> AI Generate Ladder
          </button>
        )}

        <button className="glass-btn btn-cyan" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          onClick={() => {
            if (subTab === 'challenges') handleOpenChallengeModal();
            if (subTab === 'quests') handleOpenQuestModal();
            if (subTab === 'ladders') handleOpenLadderModal();
          }}>
          <Plus size={14} /> Add {subTab === 'challenges' ? 'Challenge' : subTab === 'quests' ? 'Quest' : 'Ladder'}
        </button>
      </div>

      {/* ── Tab: Challenges ── */}
      {subTab === 'challenges' && (
        <Panel title="Active Sprints & Sinks" icon={Trophy} className="os-span-4">
          {filteredChallenges.length === 0 ? (
            <EmptyState title="No Sprints" message="Commit to sprints or deadlines to pressure test your limits." />
          ) : (
            <div className="os-grid-2">
              {filteredChallenges.map(c => {
                const progressPercentage = Math.min(100, Math.floor((c.progress / c.target) * 100)) || 0;
                return (
                  <div key={c.id} className="glass-card" style={{ padding: '1rem', borderLeft: `3px solid var(--accent-orange)` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.85rem' }}>{c.title}</strong>
                        <span className="badge badge-neutral" style={{ fontSize: '0.55rem', marginLeft: '0.35rem' }}>{c.difficulty}</span>
                      </div>
                      <span className="badge badge-cyan" style={{ fontSize: '0.58rem' }}>+{c.xpReward} XP</span>
                    </div>

                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{c.description}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                      <span>Progress: {c.progress} / {c.target}</span>
                      <span>{progressPercentage}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progressPercentage}%`, background: 'var(--accent-orange)', borderRadius: '3px' }} />
                    </div>

                    <CharacterConnections
                      sourceEntityType="challenge"
                      sourceEntityId={c.id}
                      connections={connections}
                      onAddConnection={onAddConnection}
                      onDeleteConnection={onDeleteConnection}
                    />

                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.75rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.5rem' }}>
                      {c.status === 'active' && (
                        <>
                          <button className="glass-btn btn-cyan" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }} onClick={() => onUpdateChallenge(c.id, { status: 'completed', progress: c.target })}>
                            Win
                          </button>
                          <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }} onClick={() => onUpdateChallenge(c.id, { status: 'failed' })}>
                            Fail
                          </button>
                        </>
                      )}
                      <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', marginLeft: 'auto' }} onClick={() => handleOpenChallengeModal(c)}>
                        <Edit2 size={10} /> Edit
                      </button>
                      <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', color: 'var(--text-danger)' }} onClick={() => handleDeleteChallenge(c.id)}>
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

      {/* ── Tab: Quests ── */}
      {subTab === 'quests' && (
        <Panel title="Ad-Hoc Quests & Battles" icon={Sword} className="os-span-4">
          {filteredQuests.length === 0 ? (
            <EmptyState title="No quests found" message="Quests represent single actions or courageous missions." />
          ) : (
            <div className="os-grid-2">
              {filteredQuests.map(q => {
                const isActive = q.status === 'active';
                return (
                  <div key={q.id} className="glass-card" style={{ padding: '1rem', borderLeft: `3px solid ${isActive ? 'var(--accent-cyan)' : 'var(--accent-teal)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.85rem' }}>{q.title}</strong>
                        <span className="badge badge-cyan" style={{ fontSize: '0.55rem', marginLeft: '0.35rem' }}>{q.questType}</span>
                      </div>
                      <span className="badge badge-neutral" style={{ fontSize: '0.58rem' }}>+{q.rewardXp} XP</span>
                    </div>

                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{q.description}</p>
                    {q.whyItMatters && <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Purpose: {q.whyItMatters}</p>}

                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.75rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.5rem' }}>
                      {isActive && (
                        <button className="glass-btn btn-cyan" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }} onClick={() => onCompleteQuest(q.id)} disabled={saving}>
                          Complete
                        </button>
                      )}
                      <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', marginLeft: 'auto' }} onClick={() => handleOpenQuestModal(q)}>
                        <Edit2 size={10} /> Edit
                      </button>
                      <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', color: 'var(--text-danger)' }} onClick={() => handleDeleteQuest(q.id)}>
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

      {/* ── Tab: Exposure Ladders ── */}
      {subTab === 'ladders' && (
        <Panel title="Exposure Ladders" icon={Footprints} className="os-span-4">
          {filteredLadders.length === 0 ? (
            <EmptyState title="No ladders found" message="Exposure ladders help you graduate fear by building small steps." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredLadders.map(l => {
                const isExpanded = expandedLadder === l.id;
                const completedSteps = l.steps?.filter(s => s.status === 'completed').length || 0;
                const totalSteps = l.steps?.length || 0;
                return (
                  <div key={l.id} className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid var(--accent-cyan)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Footprints size={18} className="text-cyan" />
                          <strong style={{ fontSize: '0.9rem' }}>{l.title}</strong>
                          <span className="badge badge-cyan" style={{ fontSize: '0.6rem' }}>{completedSteps}/{totalSteps} steps</span>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>{l.description}</p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button className="glass-btn" style={{ padding: '0.2rem' }} onClick={() => setExpandedLadder(isExpanded ? null : l.id)}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <button className="glass-btn" style={{ padding: '0.2rem' }} onClick={() => handleOpenLadderModal(l)}>
                          <Edit2 size={10} />
                        </button>
                        <button className="glass-btn" style={{ padding: '0.2rem', color: 'var(--text-danger)' }} onClick={() => handleDeleteLadder(l.id)}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>

                    <div className="progress-bar" style={{ height: '4px', margin: '0.5rem 0' }}>
                      <div className="progress-fill" style={{ width: `${l.completionPercentage}%` }} />
                    </div>

                    {isExpanded && l.steps && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {l.steps.slice().sort((a, b) => a.stepOrder - b.stepOrder).map((step, idx) => (
                          <ExposureStepCard
                            key={step.id}
                            step={step}
                            stepIndex={idx}
                            onAttempt={onCompleteStep}
                            onLogResult={(stepId, succeeded) => {
                              if (succeeded) onCompleteStep?.(stepId);
                            }}
                            saving={saving}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {/* ── CHALLENGE EDIT / CREATE MODAL ── */}
      {showChallengeModal && (
        <div className="modal-overlay" onClick={() => setShowChallengeModal(false)}>
          <div className="modal-content" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={18} className="text-cyan" />
                <h3 style={{ margin: 0 }}>{editingChallengeId ? 'Edit Challenge Details' : 'Create New Challenge'}</h3>
              </div>
              <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => setShowChallengeModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <div>
                <label className="field-label">Challenge Title *</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={challengeForm.title} onChange={e => setChallengeForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Description</label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '60px', padding: '0.45rem' }} value={challengeForm.description} onChange={e => setChallengeForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Difficulty</label>
                  <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={challengeForm.difficulty} onChange={e => setChallengeForm(p => ({ ...p, difficulty: e.target.value }))}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="epic">Epic</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Category</label>
                  <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={challengeForm.category} onChange={e => setChallengeForm(p => ({ ...p, category: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Target (Count)</label>
                  <input type="number" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={challengeForm.target} onChange={e => setChallengeForm(p => ({ ...p, target: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="field-label">Progress</label>
                  <input type="number" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={challengeForm.progress} onChange={e => setChallengeForm(p => ({ ...p, progress: Number(e.target.value) }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Start Date</label>
                  <input type="date" className="glass-input" style={{ width: '100%', padding: '0.4rem' }} value={challengeForm.startDate || ''} onChange={e => setChallengeForm(p => ({ ...p, startDate: e.target.value || null }))} />
                </div>
                <div>
                  <label className="field-label">Deadline</label>
                  <input type="date" className="glass-input" style={{ width: '100%', padding: '0.4rem' }} value={challengeForm.deadline || ''} onChange={e => setChallengeForm(p => ({ ...p, deadline: e.target.value || null }))} />
                </div>
              </div>
              <div>
                <label className="field-label">XP Reward</label>
                <input type="number" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={challengeForm.xpReward} onChange={e => setChallengeForm(p => ({ ...p, xpReward: Number(e.target.value) }))} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
              <button className="glass-btn" onClick={() => setShowChallengeModal(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" onClick={handleSaveChallenge} disabled={saving || !challengeForm.title}>
                Save Challenge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUEST EDIT / CREATE DIALOG ── */}
      {showQuestModal && (
        <div className="modal-overlay" onClick={() => setShowQuestModal(false)}>
          <div className="modal-content" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sword size={18} className="text-cyan" />
                <h3 style={{ margin: 0 }}>{editingQuestId ? 'Edit Quest Details' : 'Create New Quest'}</h3>
              </div>
              <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => setShowQuestModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <div>
                <label className="field-label">Quest Title *</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={questForm.title} onChange={e => setQuestForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Description</label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '60px', padding: '0.45rem' }} value={questForm.description} onChange={e => setQuestForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Why It Matters (Purpose)</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={questForm.whyItMatters} onChange={e => setQuestForm(p => ({ ...p, whyItMatters: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Quest Type</label>
                  <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={questForm.questType} onChange={e => setQuestForm(p => ({ ...p, questType: e.target.value as QuestType }))}>
                    {QUEST_TYPES.map(qt => <option key={qt.type} value={qt.type}>{qt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Difficulty (1-10)</label>
                  <input type="number" min="1" max="10" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={questForm.difficulty} onChange={e => setQuestForm(p => ({ ...p, difficulty: Number(e.target.value) }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Reward XP</label>
                  <input type="number" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={questForm.rewardXp} onChange={e => setQuestForm(p => ({ ...p, rewardXp: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="field-label">Target Date</label>
                  <input type="date" className="glass-input" style={{ width: '100%', padding: '0.4rem' }} value={questForm.targetDate || ''} onChange={e => setQuestForm(p => ({ ...p, targetDate: e.target.value || null }))} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
              <button className="glass-btn" onClick={() => setShowQuestModal(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" onClick={handleSaveQuest} disabled={saving || !questForm.title}>
                Save Quest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPOSURE LADDER EDIT / CREATE DIALOG ── */}
      {showLadderModal && (
        <div className="modal-overlay" onClick={() => setShowLadderModal(false)}>
          <div className="modal-content" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Footprints size={18} className="text-cyan" />
                <h3 style={{ margin: 0 }}>{editingLadderId ? 'Edit Exposure Ladder' : 'Plan Exposure Ladder'}</h3>
              </div>
              <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => setShowLadderModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <div>
                <label className="field-label">Ladder Title *</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={ladderForm.title} onChange={e => setLadderForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Description</label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '60px', padding: '0.45rem' }} value={ladderForm.description} onChange={e => setLadderForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Desired End Behavior</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={ladderForm.desiredEndBehavior} onChange={e => setLadderForm(p => ({ ...p, desiredEndBehavior: e.target.value }))} placeholder="e.g. Host a presentation confidently" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Difficulty Policy</label>
                  <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={ladderForm.difficultyPolicy} onChange={e => setLadderForm(p => ({ ...p, difficultyPolicy: e.target.value as DifficultyPolicy }))}>
                    <option value="graduated">Graduated Policy</option>
                    <option value="adaptive">Adaptive Policy</option>
                    <option value="fixed">Fixed Policy</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={ladderForm.status} onChange={e => setLadderForm(p => ({ ...p, status: e.target.value as LadderStatus }))}>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
              <button className="glass-btn" onClick={() => setShowLadderModal(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" onClick={handleSaveLadder} disabled={saving || !ladderForm.title}>
                Save Ladder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generators modals */}
      {showQuestGenerator && onGenerateQuest && (
        <QuestGenerator
          traits={traits}
          onGenerate={onGenerateQuest}
          onApprove={(generated) => {
            onAddQuest({
              questType: 'ai_suggested', title: generated.title,
              description: generated.purpose, whyItMatters: generated.whyItMatters,
              linkedTraitIds: generated.linkedTraitIds,
              difficulty: generated.difficulty, estimatedDiscomfort: generated.discomfort,
              targetDate: null, checklistSteps: generated.steps.map((s, i) => ({ order: i + 1, description: s, isDone: false })),
              requiredProof: generated.successDefinition, proofType: 'text',
              rewardXp: generated.rewardXp, bonusConditions: [], failureRule: 'retry',
              retryCount: 0, status: 'active', source: 'ai',
              aiGenerationMetadata: {}, plannerTaskId: null, goalId: null,
              crmContactId: null, crmOpportunityId: null,
            });
            setShowQuestGenerator(false);
          }}
          onSaveDraft={(generated) => {
            onAddQuest({
              questType: 'ai_suggested', title: generated.title,
              description: generated.purpose, whyItMatters: generated.whyItMatters,
              linkedTraitIds: generated.linkedTraitIds,
              difficulty: generated.difficulty, estimatedDiscomfort: generated.discomfort,
              targetDate: null, checklistSteps: generated.steps.map((s, i) => ({ order: i + 1, description: s, isDone: false })),
              requiredProof: generated.successDefinition, proofType: 'text',
              rewardXp: generated.rewardXp, bonusConditions: [], failureRule: 'retry',
              retryCount: 0, status: 'locked', source: 'ai',
              aiGenerationMetadata: {}, plannerTaskId: null, goalId: null,
              crmContactId: null, crmOpportunityId: null,
            });
            setShowQuestGenerator(false);
          }}
          onClose={() => setShowQuestGenerator(false)}
        />
      )}

      {showLadderGenerator && onGenerateLadder && (
        <LadderGenerator
          traits={traits}
          onGenerate={onGenerateLadder}
          onApprove={(generated) => {
            onAddLadder({
              title: generated.title, description: generated.description,
              linkedTraitId: null, desiredEndBehavior: generated.desiredEndBehavior,
              status: 'active', currentStep: 0, completionPercentage: 0,
              difficultyPolicy: 'graduated', aiAdaptationEnabled: true,
              steps: generated.steps.map((s, i) => ({
                id: crypto.randomUUID() ?? '',
                ladderId: '', stepOrder: i + 1,
                title: s.title, instructions: s.instructions,
                difficulty: s.difficulty, discomfortEstimate: s.discomfortEstimate,
                repetitionTarget: s.repetitionTarget,
                successfulRepetitions: 0,
                reflectionRequired: s.reflectionRequired, proofRequired: false,
                status: i === 0 ? 'available' : 'locked',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })),
            });
            setShowLadderGenerator(false);
          }}
          onSaveDraft={(generated) => {
            onAddLadder({
              title: generated.title, description: generated.description,
              linkedTraitId: null, desiredEndBehavior: generated.desiredEndBehavior,
              status: 'paused', currentStep: 0, completionPercentage: 0,
              difficultyPolicy: 'graduated', aiAdaptationEnabled: false,
              steps: generated.steps.map((s, i) => ({
                id: crypto.randomUUID() ?? '',
                ladderId: '', stepOrder: i + 1,
                title: s.title, instructions: s.instructions,
                difficulty: s.difficulty, discomfortEstimate: s.discomfortEstimate,
                repetitionTarget: s.repetitionTarget,
                successfulRepetitions: 0,
                reflectionRequired: s.reflectionRequired, proofRequired: false,
                status: i === 0 ? 'available' : 'locked',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })),
            });
            setShowLadderGenerator(false);
          }}
          onClose={() => setShowLadderGenerator(false)}
        />
      )}

    </div>
  );
};
