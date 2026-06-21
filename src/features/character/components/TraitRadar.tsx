import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import type { CharacterTrait } from '../types';

interface TraitRadarProps {
  traits: CharacterTrait[];
  maxLabel?: number;
}

export const TraitRadar: React.FC<TraitRadarProps> = ({ traits, maxLabel = 8 }) => {
  if (traits.length === 0) return null;

  const displayTraits = traits.slice(0, maxLabel);
  const maxRank = Math.max(...displayTraits.map(t => t.currentRank), 10);

  const data = displayTraits.map(t => ({
    trait: t.name.length > 12 ? t.name.slice(0, 11) + '…' : t.name,
    level: t.currentRank,
    fullMark: Math.max(maxRank, 10),
  }));

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid stroke="var(--panel-border)" />
          <PolarAngleAxis dataKey="trait" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
          <Radar name="Trait Level" dataKey="level" stroke="var(--accent-cyan)"
            fill="var(--accent-cyan)" fillOpacity={0.15} strokeWidth={1.5} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
