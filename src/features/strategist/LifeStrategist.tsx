import React from 'react';
import { Brain, Flame, PauseCircle, Rocket } from 'lucide-react';
import { PageHeader, Panel } from '../../components/system/Layout';
import { useApp } from '../../context/useApp';
import { generateAIBriefing, getAtRiskClients, scoreOpportunity } from '../../lib/ai/intelligence';

export const LifeStrategist: React.FC = () => {
  const app = useApp();
  const briefing = generateAIBriefing(app);
  const topOpportunity = [...app.opportunities].sort((a, b) => scoreOpportunity(b) - scoreOpportunity(a))[0];
  const atRiskClient = getAtRiskClients(app.clients, app.projects, app.finances)[0];

  const answers = [
    {
      icon: Flame,
      title: 'What is slowing me down?',
      body: atRiskClient?.riskScore > 60 ? `Unresolved client/project pressure around ${atRiskClient.client.company}.` : 'The biggest drag is fragmented attention across execution, sales, and learning.'
    },
    {
      icon: PauseCircle,
      title: 'What should I stop doing?',
      body: 'Stop accepting tasks that do not connect to a weekly, quarterly, or revenue goal. Put unlinked tasks into review before execution.'
    },
    {
      icon: Rocket,
      title: 'What should I double down on?',
      body: topOpportunity ? `Double down on ${topOpportunity.title}. It has the best current upside score.` : 'Double down on retainers, reusable project assets, and proof-driven offers.'
    },
    {
      icon: Brain,
      title: 'Fastest path to my goals',
      body: `${briefing.focus} Then convert one opportunity into outreach or a productized offer.`
    }
  ];

  return (
    <div>
      <PageHeader title="Life Strategist" description="Strategic advisor across work, business, health, and execution.">
        <span className="badge badge-cyan">Shared memory active</span>
      </PageHeader>

      <div className="page-body strategist-grid">
        {answers.map(answer => {
          const Icon = answer.icon;
          return (
            <Panel key={answer.title} title={answer.title} icon={Icon}>
              <p className="os-readable">{answer.body}</p>
            </Panel>
          );
        })}
      </div>
    </div>
  );
};
