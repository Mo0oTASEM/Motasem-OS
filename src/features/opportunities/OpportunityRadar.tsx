import React, { useState } from 'react';
import { Radar, Sparkles } from 'lucide-react';
import { PageHeader, Panel } from '../../components/system/Layout';
import { useApp } from '../../context/useApp';
import { scoreOpportunity } from '../../lib/ai/intelligence';

export const OpportunityRadar: React.FC = () => {
  const { opportunities, addOpportunity } = useApp();
  const [title, setTitle] = useState('');

  const sorted = [...opportunities].sort((a, b) => scoreOpportunity(b) - scoreOpportunity(a));

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    addOpportunity({
      title,
      type: 'business',
      description: 'New opportunity captured for scoring and strategy review.',
      revenuePotential: 6,
      difficulty: 5,
      timeRequired: 4,
      risk: 4,
      tags: ['opportunity']
    });
    setTitle('');
  };

  return (
    <div>
      <PageHeader title="Opportunity Radar" description="Score freelance, business, game, and product opportunities.">
        <span className="badge badge-amber"><Radar size={12} /> {sorted.length} tracked</span>
      </PageHeader>

      <div className="page-body os-grid-2">
        <Panel title="Ranked Opportunities" icon={Sparkles}>
          {sorted.map(opportunity => (
            <article className="opportunity-card" key={opportunity.id}>
              <div>
                <h3>{opportunity.title}</h3>
                <p>{opportunity.description}</p>
                <small>{opportunity.type} · revenue {opportunity.revenuePotential}/10 · risk {opportunity.risk}/10</small>
              </div>
              <strong>{scoreOpportunity(opportunity)}</strong>
            </article>
          ))}
        </Panel>

        <Panel title="Capture Opportunity">
          <form onSubmit={handleAdd} className="os-form">
            <input className="glass-input" value={title} onChange={event => setTitle(event.target.value)} placeholder="New opportunity..." />
            <button className="glass-btn btn-cyan" type="submit">Score Later</button>
          </form>
          <p className="os-readable">AI recommendation: convert the top-ranked idea into a small offer, prototype, or outreach script within 48 hours.</p>
        </Panel>
      </div>
    </div>
  );
};
