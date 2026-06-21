import React, { useState } from 'react';
import { Star, Plus, Search } from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import { TraitCard } from '../components/TraitCard';
import { TraitRadar } from '../components/TraitRadar';
import { TraitDetailModal } from '../components/TraitDetailModal';
import type { CharacterTrait, CharacterHabit, CharacterQuest, CharacterReflection, ExposureLadder } from '../types';
import { DEFAULT_TRAIT_NAMES, TRAIT_DESCRIPTIONS } from '../types';

interface TraitsViewProps {
  traits: CharacterTrait[];
  habits: CharacterHabit[];
  quests: CharacterQuest[];
  reflections: CharacterReflection[];
  ladders: ExposureLadder[];
  onAddTrait: (trait: Omit<CharacterTrait, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateTrait: (id: string, updates: Partial<CharacterTrait>) => Promise<void>;
  onDeleteTrait: (id: string) => Promise<void>;
  saving?: boolean;
}

export const TraitsView: React.FC<TraitsViewProps> = ({
  traits, habits, quests, reflections, ladders,
  onAddTrait, onUpdateTrait, onDeleteTrait, saving,
}) => {
  const [selectedTraitId, setSelectedTraitId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const selectedTrait = traits.find(t => t.id === selectedTraitId) ?? null;
  const filtered = traits.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreateTrait = async (name: string) => {
    await onAddTrait({
      name, description: TRAIT_DESCRIPTIONS[name] || '',
      icon: 'star', visualKey: null, currentScore: 0, lifetimeXp: 0,
      currentRank: 1, targetScore: 10, status: 'active', displayOrder: traits.length + 1,
    });
    setShowCreate(false);
  };

  return (
    <div>
      <div className="os-grid-2" style={{ marginBottom: '1.5rem' }}>
        <Panel title="Trait Radar" icon={Star} className="os-span-1">
          {traits.length === 0 ? (
            <EmptyState title="No traits" message="Add traits to see your radar." />
          ) : (
            <TraitRadar traits={traits} />
          )}
        </Panel>

        <Panel title="Trait Distribution" icon={Star} className="os-span-1">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.5rem 0' }}>
            {traits.slice().sort((a, b) => b.lifetimeXp - a.lifetimeXp).map(t => (
              <div key={t.id} style={{ fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                  <span>{t.name}</span>
                  <span style={{ fontWeight: 600 }}>Lv.{t.currentRank} · {t.lifetimeXp} XP</span>
                </div>
                <div className="progress-bar" style={{ height: '4px' }}>
                  <div className="progress-fill" style={{ width: `${((t.lifetimeXp % 100) / 100) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="All Traits" icon={Star} className="os-span-4">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="glass-input" style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.8rem', fontSize: '0.72rem' }}
              placeholder="Search traits..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="glass-btn btn-cyan" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Add Trait
          </button>
        </div>

        {showCreate && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Select a trait to add:</p>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {DEFAULT_TRAIT_NAMES.filter(n => !traits.some(t => t.name === n)).map(name => (
                <button key={name} className="glass-btn"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.68rem' }}
                  onClick={() => handleCreateTrait(name)} disabled={saving}>
                  {name}
                </button>
              ))}
            </div>
            <button className="glass-btn" style={{ marginTop: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
              onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState title="No traits" message="Add your first character trait." />
        ) : (
          <div className="os-grid-2">
            {filtered.map(trait => (
              <TraitCard
                key={trait.id}
                trait={trait}
                onSelect={setSelectedTraitId}
                onDelete={onDeleteTrait}
              />
            ))}
          </div>
        )}
      </Panel>

      <TraitDetailModal
        trait={selectedTrait}
        habits={habits}
        quests={quests}
        reflections={reflections}
        ladders={ladders}
        onClose={() => setSelectedTraitId(null)}
        onEditTrait={(id) => {
          const t = traits.find(tr => tr.id === id);
          if (t) {
            const newName = prompt('Edit trait name:', t.name);
            if (newName && newName !== t.name) {
              onUpdateTrait(id, { name: newName });
            }
          }
        }}
      />
    </div>
  );
};
