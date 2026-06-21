import React, { useState } from 'react';
import { Skull, Plus, Search } from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import { BadGuyCard } from '../components/BadGuyCard';
import type { CharacterBadGuy } from '../types';

interface BadGuysViewProps {
  badGuys: CharacterBadGuy[];
  onResistBadGuy: (id: string) => Promise<void>;
  onGiveInBadGuy: (id: string) => Promise<void>;
  onAddBadGuy: (badGuy: Omit<CharacterBadGuy, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDeleteBadGuy: (id: string) => Promise<void>;
  saving?: boolean;
}

const BAD_GUY_TEMPLATES = [
  { title: 'Endless Reels', triggerDescription: 'Opened social media for a quick check, stayed for an hour', warningSigns: 'Boredom, phone in hand, pulling to refresh', replacementResponse: 'Set a 5-minute timer or leave phone in another room' },
  { title: 'Late Sleep', triggerDescription: 'Stay up past midnight despite knowing tomorrow matters', warningSigns: 'Drowsy but scrolling, telling myself "just one more"', replacementResponse: 'Set a hard wind-down alarm 1 hour before target bedtime' },
  { title: 'Social Avoidance', triggerDescription: 'Skip a social opportunity because of discomfort', warningSigns: 'Finding reasons to stay home, relief when event is canceled', replacementResponse: 'Commit to staying for 15 minutes minimum; then reassess' },
  { title: 'Overthinking', triggerDescription: 'Analyze a decision or conversation past the point of usefulness', warningSigns: 'Replaying scenarios, asking "what if", physical tension', replacementResponse: 'Write the concern down once and set a 24-hour waiting period' },
  { title: 'Perfectionism', triggerDescription: 'Delay starting because conditions are not ideal', warningSigns: 'Endless planning, organizing before doing, not good enough', replacementResponse: 'Do the worst possible version first — ship before it is ready' },
  { title: 'Anger Decisions', triggerDescription: 'React impulsively when frustrated or disrespected', warningSigns: 'Rapid heartbeat, clenching jaw, feeling attacked', replacementResponse: 'Excuse yourself for 5 minutes before responding' },
  { title: 'Distracting Environment', triggerDescription: 'Work or focus in a space full of interruptions', warningSigns: 'Phone notifications, open tabs, people walking in, clutter', replacementResponse: 'Clear the space for 2 minutes before starting any task' },
  { title: 'Gaming Escape', triggerDescription: 'Play games to avoid important but uncomfortable work', warningSigns: 'Thinking about gaming during work, feeling drained after', replacementResponse: 'Set a gaming time slot and do the hard thing first' },
];

export const BadGuysView: React.FC<BadGuysViewProps> = ({
  badGuys,
  onResistBadGuy, onGiveInBadGuy,
  onAddBadGuy, onDeleteBadGuy, saving,
}) => {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = badGuys.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreateFromTemplate = async (template: typeof BAD_GUY_TEMPLATES[number]) => {
    await onAddBadGuy({
      title: template.title, triggerDescription: template.triggerDescription,
      warningSigns: template.warningSigns, usualBehavior: '',
      costConsequence: '', replacementResponse: template.replacementResponse,
      linkedRuleId: null, severity: 5, isActive: true,
      occurrenceCount: 0, defeatedCount: 0, lastOccurrenceAt: null,
    });
    setShowCreate(false);
  };

  return (
    <div>
      <Panel title="Bad Guys (Self-Sabotage Patterns)" icon={Skull} className="os-span-4">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="glass-input" style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.8rem', fontSize: '0.72rem' }}
              placeholder="Search bad guys..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="glass-btn btn-cyan" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Add Bad Guy
          </button>
        </div>

        {showCreate && (
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>Choose a Bad Guy Template</h4>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {BAD_GUY_TEMPLATES.filter(t => !badGuys.some(b => b.title === t.title)).map(t => (
                <button key={t.title} className="glass-btn" style={{ padding: '0.4rem 0.6rem', fontSize: '0.68rem', textAlign: 'left', maxWidth: '220px' }}
                  onClick={() => handleCreateFromTemplate(t)} disabled={saving}>
                  <strong style={{ display: 'block', fontSize: '0.72rem' }}>{t.title}</strong>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{t.triggerDescription}</span>
                </button>
              ))}
            </div>
            <button className="glass-btn" style={{ marginTop: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
              onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div className="glass-card" style={{ padding: '0.5rem 0.75rem', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Total tracked</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{badGuys.length}</div>
          </div>
          <div className="glass-card" style={{ padding: '0.5rem 0.75rem', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Total resisted</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {badGuys.reduce((s, b) => s + b.defeatedCount, 0)}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '0.5rem 0.75rem', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Total occurrences</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {badGuys.reduce((s, b) => s + b.occurrenceCount, 0)}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '0.5rem 0.75rem', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Overall resist rate</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {(() => {
                const total = badGuys.reduce((s, b) => s + b.occurrenceCount, 0);
                return total > 0 ? `${Math.round((badGuys.reduce((s, b) => s + b.defeatedCount, 0) / total) * 100)}%` : '—';
              })()}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No bad guys" message="Identify recurring self-sabotage patterns." />
        ) : (
          <div className="os-grid-2">
            {filtered.map(badGuy => (
              <BadGuyCard
                key={badGuy.id}
                badGuy={badGuy}
                onResist={onResistBadGuy}
                onGiveIn={onGiveInBadGuy}
                onDelete={onDeleteBadGuy}
                saving={saving}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};
