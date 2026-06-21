import React, { useState } from 'react';
import { 
  Activity, PieChart, Brain, BookOpen, AlertCircle, 
  Skull, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import { ReflectionJournal } from './ReflectionJournal';
import type { 
  CharacterTrait, CharacterHabit, CharacterQuest, CharacterBadGuy, 
  CharacterReflection, CharacterHabitLog 
} from '../types';
import type { ReflectionAnalysisRequest, ReflectionAnalysisResponse } from '../services/characterCoachTypes';
import type { CoachResult } from '../services/characterCoachClient';

interface AnalyticsViewProps {
  traits: CharacterTrait[];
  habits: CharacterHabit[];
  quests: CharacterQuest[];
  badGuys: CharacterBadGuy[];
  totalXp: number;
  level: number;
  currentStreak: number;
  maxStreak: number;
  reflections: CharacterReflection[];
  onAddReflection: (reflection: Omit<CharacterReflection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateReflection: (id: string, updates: Partial<CharacterReflection>) => Promise<void>;
  onDeleteReflection: (id: string) => Promise<void>;
  onAnalyzeReflection?: (req: ReflectionAnalysisRequest) => Promise<CoachResult<ReflectionAnalysisResponse>>;
  brainContext: string;
  saving?: boolean;
  habitLogs?: CharacterHabitLog[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  habits, badGuys, currentStreak, maxStreak,
  reflections, onAddReflection, onUpdateReflection, onDeleteReflection,
  onAnalyzeReflection, brainContext, saving, habitLogs = [],
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'patterns' | 'journal'>('patterns');

  // Compute behavioral statistics
  const completedLogs = habitLogs.filter(log => log.status === 'completed');
  const failedLogs = habitLogs.filter(log => log.status === 'failed');
  
  const totalLogsCount = habitLogs.length;
  const overallConsistency = totalLogsCount > 0 
    ? Math.round((completedLogs.length / totalLogsCount) * 100) 
    : 0;

  // Strongest habits (highest streaks)
  const strongestHabits = habits
    .filter(h => h.isActive && h.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, 3);

  // Weakest habits (active but low streak/missed)
  const weakestHabits = habits
    .filter(h => h.isActive)
    .sort((a, b) => a.currentStreak - b.currentStreak)
    .slice(0, 3);

  // Completion by category
  const categories = Array.from(new Set(habits.map(h => h.category || 'General')));
  const categoryStats = categories.map(cat => {
    const catHabits = habits.filter(h => (h.category || 'General') === cat);
    const avgStreak = catHabits.reduce((acc, h) => acc + h.currentStreak, 0) / (catHabits.length || 1);
    return { category: cat, count: catHabits.length, avgStreak: Math.round(avgStreak) };
  });

  // Harmful triggers (bad guys with lowest resistance)
  const harmfulTriggers = badGuys
    .map(bg => {
      const resistRate = bg.occurrenceCount > 0 
        ? Math.round((bg.defeatedCount / bg.occurrenceCount) * 100) 
        : 100;
      return { ...bg, resistRate };
    })
    .filter(bg => bg.occurrenceCount > 0)
    .sort((a, b) => a.resistRate - b.resistRate)
    .slice(0, 3);

  // Suggested Adjustments
  const suggestedAdjustments: string[] = [];
  if (overallConsistency < 50 && totalLogsCount > 0) {
    suggestedAdjustments.push("Consider reducing difficulty on active habits to rebuild consistency baseline.");
  }
  if (harmfulTriggers.length > 0 && harmfulTriggers[0].resistRate < 50) {
    suggestedAdjustments.push(`Set up an explicit If-Then rule for saboteur "${harmfulTriggers[0].title}" to improve resistance.`);
  }
  if (habits.filter(h => h.isActive && !h.plannerTaskId).length > 0) {
    suggestedAdjustments.push("Sync unlinked daily habits to the OS Planner Daily Tasks for higher visibility.");
  }
  if (reflections.length < 3) {
    suggestedAdjustments.push("Log more reflections in the Reflection Journal to help AI discover deeper behavioral triggers.");
  }

  const hasData = reflections.length > 0 || totalLogsCount > 0 || strongestHabits.length > 0;

  return (
    <div>
      {/* ── Tabs navigation ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
        <button
          className={`glass-btn ${activeSubTab === 'patterns' ? 'btn-cyan' : ''}`}
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          onClick={() => setActiveSubTab('patterns')}
        >
          <Activity size={14} /> Behavioral Patterns
        </button>
        <button
          className={`glass-btn ${activeSubTab === 'journal' ? 'btn-cyan' : ''}`}
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          onClick={() => setActiveSubTab('journal')}
        >
          <BookOpen size={14} /> Reflection Journal
        </button>
      </div>

      {activeSubTab === 'journal' && (
        <ReflectionJournal
          reflections={reflections}
          onAddReflection={onAddReflection}
          onUpdateReflection={onUpdateReflection}
          onDeleteReflection={onDeleteReflection}
          onAnalyzeReflection={onAnalyzeReflection}
          brainContext={brainContext}
          saving={saving}
        />
      )}

      {activeSubTab === 'patterns' && (
        <div>
          {!hasData ? (
            <Panel title="Behavioral Patterns" icon={Activity} className="os-span-4">
              <EmptyState 
                title="Insufficient Data" 
                message="Complete and log more habits to unlock meaningful behavioral analysis." 
              />
            </Panel>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <div className="glass-card" style={{ padding: '0.75rem 1rem', textAlign: 'center', borderLeft: '3px solid var(--accent-cyan)' }}>
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overall Consistency</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{overallConsistency}%</div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{completedLogs.length} done, {failedLogs.length} missed of {totalLogsCount} total</span>
                </div>
                <div className="glass-card" style={{ padding: '0.75rem 1rem', textAlign: 'center', borderLeft: '3px solid var(--accent-orange)' }}>
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Streaks</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-orange)' }}>{currentStreak} days</div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Best: {maxStreak} days</span>
                </div>
                <div className="glass-card" style={{ padding: '0.75rem 1rem', textAlign: 'center', borderLeft: '3px solid var(--accent-purple)' }}>
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reflections Written</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-purple)' }}>{reflections.length} logs</div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Self-knowledge logs</span>
                </div>
                <div className="glass-card" style={{ padding: '0.75rem 1rem', textAlign: 'center', borderLeft: '3px solid var(--accent-teal)' }}>
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Habits Tracked</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-teal)' }}>{habits.length} total</div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Active: {habits.filter(h => h.isActive).length}</span>
                </div>
              </div>

              {/* Habit Patterns */}
              <div className="os-grid-2">
                <Panel title="Habit Performance Metrics" icon={Activity}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.78rem', color: 'var(--accent-teal)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <CheckCircle2 size={12} /> Strongest Habit Patterns
                      </h4>
                      {strongestHabits.length === 0 ? (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No positive habits established.</div>
                      ) : (
                        strongestHabits.map(h => (
                          <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <span>{h.title}</span>
                            <strong>{h.currentStreak} day streak</strong>
                          </div>
                        ))
                      )}
                    </div>

                    <div>
                      <h4 style={{ fontSize: '0.78rem', color: 'var(--accent-orange)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <AlertCircle size={12} /> Weakest Habit Patterns (Attention Required)
                      </h4>
                      {weakestHabits.length === 0 ? (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No active habits.</div>
                      ) : (
                        weakestHabits.map(h => (
                          <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <span>{h.title}</span>
                            <strong>{h.currentStreak} day streak</strong>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </Panel>

                <Panel title="Completion by Category" icon={PieChart}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {categoryStats.length === 0 ? (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No categorized habits.</div>
                    ) : (
                      categoryStats.map(stat => (
                        <div key={stat.category}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.15rem' }}>
                            <span>{stat.category} <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>({stat.count} habits)</span></span>
                            <strong>Avg Streak: {stat.avgStreak}d</strong>
                          </div>
                          <div className="progress-bar" style={{ height: '6px' }}>
                            <div className="progress-fill" style={{ width: `${Math.min(100, stat.avgStreak * 10)}%`, background: 'var(--accent-purple)' }} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>
              </div>

              {/* Saboteurs & Adjustments */}
              <div className="os-grid-2">
                <Panel title="Saboteur Resistance Triggers" icon={Skull}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {harmfulTriggers.length === 0 ? (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No saboteur events tracked yet.</div>
                    ) : (
                      harmfulTriggers.map(bg => (
                        <div key={bg.id} style={{ padding: '0.5rem', background: 'rgba(244,63,94,0.02)', border: '1px solid var(--panel-border)', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                            <span style={{ fontWeight: 600 }}>{bg.title}</span>
                            <span style={{ color: 'var(--accent-red)' }}>Resist: {bg.resistRate}%</span>
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                            Consequence: {bg.costConsequence || 'Loss of streak/focus'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>

                <Panel title="Data-Driven Suggested Adjustments" icon={Brain}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {suggestedAdjustments.length === 0 ? (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle2 size={13} /> Performance looks solid. Keep tracking habits to maintain feedback loop.
                      </div>
                    ) : (
                      suggestedAdjustments.map((adj, index) => (
                        <div 
                          key={index}
                          style={{ 
                            display: 'flex', 
                            gap: '0.5rem', 
                            padding: '0.5rem', 
                            background: 'rgba(6, 182, 212, 0.03)', 
                            border: '1px solid rgba(6, 182, 212, 0.1)', 
                            borderRadius: '6px',
                            alignItems: 'flex-start'
                          }}
                        >
                          <ChevronRight size={13} className="text-cyan" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                          <p style={{ fontSize: '0.72rem', margin: 0, color: 'var(--text-secondary)' }}>{adj}</p>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};
