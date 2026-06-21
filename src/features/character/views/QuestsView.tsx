import React, { useState } from 'react';
import { Sword, Plus, Search, Loader2, Sparkles } from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import { QuestCard } from '../components/QuestCard';
import { QuestGenerator } from '../components/QuestGenerator';
import type { CharacterQuest, CharacterTrait, QuestType } from '../types';
import type { QuestGenerationRequest, GeneratedQuest } from '../services/characterCoachTypes';
import type { CoachResult } from '../services/characterCoachClient';

interface QuestsViewProps {
  quests: CharacterQuest[];
  traits: CharacterTrait[];
  onAddQuest: (quest: Omit<CharacterQuest, 'id' | 'userId' | 'createdAt' | 'completedAt'>) => Promise<void>;
  onCompleteQuest: (id: string) => Promise<void>;
  onUpdateQuest?: (id: string, updates: Partial<CharacterQuest>) => Promise<void>;
  onDeleteQuest: (id: string) => Promise<void>;
  saving?: boolean;
  onGenerateQuest?: (req: QuestGenerationRequest) => Promise<CoachResult<{ quest: GeneratedQuest; disclaimer?: string }>>;
}

export const QuestsView: React.FC<QuestsViewProps> = ({
  quests, onAddQuest, onCompleteQuest, onDeleteQuest, saving, onGenerateQuest,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<QuestType | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  const [form, setForm] = useState({
    questType: 'standard' as QuestType, title: '', description: '',
    whyItMatters: '', linkedTraitIds: [] as string[],
    difficulty: 3, estimatedDiscomfort: 3, targetDate: null as string | null,
    checklistSteps: [], requiredProof: '', proofType: 'text',
    rewardXp: 50, bonusConditions: [], failureRule: 'retry',
    retryCount: 0, status: 'active' as 'active' | 'completed' | 'failed' | 'locked',
    source: 'user' as 'user' | 'ai' | 'system',
    aiGenerationMetadata: {}, plannerTaskId: null as string | null,
    goalId: null as string | null, crmContactId: null as string | null,
    crmOpportunityId: null as string | null,
  });

  const QUEST_TYPES: { type: QuestType; label: string }[] = [
    { type: 'standard', label: 'Standard' },
    { type: 'courage', label: 'Courage' },
    { type: 'exposure', label: 'Exposure' },
    { type: 'boss_fight', label: 'Boss Fight' },
    { type: 'recovery', label: 'Recovery' },
    { type: 'reflection', label: 'Reflection' },
  ];

  const filtered = quests.filter(q => {
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && q.questType !== typeFilter) return false;
    return true;
  });

  const handleCreate = async () => {
    await onAddQuest({ ...form });
    setShowCreate(false);
  };

  return (
    <div>
      <Panel title="Quests" icon={Sword} className="os-span-4">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: '150px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="glass-input" style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.8rem', fontSize: '0.72rem' }}
              placeholder="Search quests..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            <button className={`glass-btn ${typeFilter === 'all' ? 'btn-cyan' : ''}`}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.6rem' }}
              onClick={() => setTypeFilter('all')}>All</button>
            {QUEST_TYPES.map(qt => (
              <button key={qt.type} className={`glass-btn ${typeFilter === qt.type ? 'btn-cyan' : ''}`}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.6rem' }}
                onClick={() => setTypeFilter(qt.type)}>{qt.label}</button>
            ))}
          </div>
          <button className="glass-btn" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onClick={() => setShowGenerator(true)} disabled={!onGenerateQuest}>
            <Sparkles size={14} /> AI Generate
          </button>
          <button className="glass-btn btn-cyan" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Add Quest
          </button>
        </div>

        {showCreate && (
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>Create Quest</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Title *</label>
                <input className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Quest Type</label>
                <select className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  value={form.questType} onChange={e => setForm(p => ({ ...p, questType: e.target.value as QuestType }))}>
                  {QUEST_TYPES.map(qt => <option key={qt.type} value={qt.type}>{qt.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Description</label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '50px', padding: '0.35rem', fontSize: '0.72rem' }}
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Difficulty (1-10)</label>
                <input type="number" min="1" max="10" className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Reward XP</label>
                <input type="number" className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  value={form.rewardXp} onChange={e => setForm(p => ({ ...p, rewardXp: Number(e.target.value) }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="glass-btn" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem' }}
                onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem' }}
                onClick={handleCreate} disabled={saving || !form.title}>
                {saving ? <Loader2 size={12} className="spin" /> : null} Create
              </button>
            </div>
          </div>
        )}

        {showGenerator && onGenerateQuest && (
          <QuestGenerator
            traits={[]}
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
            }}
            onClose={() => setShowGenerator(false)}
          />
        )}
        {filtered.length === 0 ? (
          <EmptyState title="No quests" message="Create quests to challenge yourself." />
        ) : (
          <div className="os-grid-2">
            {filtered.map(quest => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onComplete={onCompleteQuest}
                onDelete={onDeleteQuest}
                saving={saving}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};
