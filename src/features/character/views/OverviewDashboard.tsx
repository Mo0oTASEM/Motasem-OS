import React, { useState } from 'react';
import { 
  Activity, Skull, Target, Bot, Loader2, Calendar, 
  Sparkles, User, Plus, Edit2, Trash2, CheckCircle2, TrendingUp, Link2, 
  BookOpen, Clock, Heart, Award, X
} from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import { XpProgressBar } from '../components/XpProgressBar';
import { TraitRadar } from '../components/TraitRadar';
import type { 
  CharacterProfile, CharacterTrait, CharacterHabit, CharacterQuest, 
  CharacterBadGuy, CharacterPowerUp, ExposureLadder, CharacterReflection, 
  CharacterSeason, CharacterConnection, CharacterTaskIntegration, CharacterGoalIntegration,
  SeasonStatus
} from '../types';
import type { PlannerTask, Goal as PlannerGoal, WikiNote, MemoryItem } from '../../../context/AppContext';
import type { WeeklyReviewResponse, DailyMissionResponse } from '../services/characterCoachTypes';
import type { CoachResult } from '../services/characterCoachClient';

interface OverviewDashboardProps {
  profile: CharacterProfile | null;
  traits: CharacterTrait[];
  habits: CharacterHabit[];
  quests: CharacterQuest[];
  badGuys: CharacterBadGuy[];
  powerUps: CharacterPowerUp[];
  ladders: ExposureLadder[];
  reflections: CharacterReflection[];
  aiInsights: string[];
  level: number;
  levelTitle: string;
  totalXp: number;
  xpToNextLevel: number;
  currentStreak: number;
  maxStreak: number;
  onOpenView: (view: string) => void;
  onGenerateWeeklyReview?: () => Promise<CoachResult<WeeklyReviewResponse>>;
  onGenerateDailyMission?: () => Promise<CoachResult<DailyMissionResponse>>;
  onUpdateProfile: (updates: Partial<CharacterProfile>) => Promise<void>;
  connections: CharacterConnection[];
  onAddConnection: (conn: Omit<CharacterConnection, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  onDeleteConnection: (id: string) => Promise<void>;
  taskIntegrations: CharacterTaskIntegration[];
  unlinkHabitFromPlannerTask: (plannerTaskId: string) => Promise<void>;
  goalIntegrations: CharacterGoalIntegration[];
  unlinkTraitFromGoal: (goalId: string) => Promise<void>;
  plannerTasks: PlannerTask[];
  plannerGoals: PlannerGoal[];
  notes: WikiNote[];
  memoryItems: MemoryItem[];
  generateAIInsights: () => Promise<void>;
  seasons: CharacterSeason[];
  onAddSeason: (season: Omit<CharacterSeason, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateSeason: (id: string, updates: Partial<CharacterSeason>) => Promise<void>;
  onDeleteSeason: (id: string) => Promise<void>;
  onCompleteHabit: (id: string) => Promise<void>;
  onCompleteQuest: (id: string) => Promise<void>;
  onTriggerRule: (id: string, followed: boolean) => Promise<void>;
  onAddReflection: (reflection: Omit<CharacterReflection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  saving: boolean;
  onOpenProfileEdit: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  profile, traits, habits, quests, badGuys, ladders, reflections,
  level, levelTitle, totalXp, xpToNextLevel, currentStreak, maxStreak, onOpenView,
  onGenerateWeeklyReview, onGenerateDailyMission, taskIntegrations, unlinkHabitFromPlannerTask,
  goalIntegrations, unlinkTraitFromGoal, plannerTasks, plannerGoals,
  seasons, onAddSeason, onUpdateSeason, onDeleteSeason,
  onCompleteHabit, onCompleteQuest, saving, onOpenProfileEdit
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Sub-tab selection inside Progress Overview reports
  const [reportTab, setReportTab] = useState<'habits' | 'traits' | 'saboteurs'>('habits');

  // Seasons form states
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [seasonForm, setSeasonForm] = useState({
    title: '',
    identityFocus: '',
    startDate: todayStr,
    endDate: '' as string | null,
    status: 'planning' as 'planning' | 'active' | 'completed' | 'cancelled',
    targetTraitIds: [] as string[],
    targetHabitIds: [] as string[],
    targetLadderIds: [] as string[],
    openingXp: 0,
    earnedXp: 0,
    completionScore: null as number | null,
    finalReflection: '',
  });

  // AI states
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReviewResponse | null>(null);
  const [weeklyReviewLoading, setWeeklyReviewLoading] = useState(false);
  const [weeklyReviewError, setWeeklyReviewError] = useState<string | null>(null);
  const [dailyMission, setDailyMission] = useState<DailyMissionResponse | null>(null);
  const [dailyMissionLoading, setDailyMissionLoading] = useState(false);
  const [dailyMissionError, setDailyMissionError] = useState<string | null>(null);

  // Compute metrics
  const activeHabits = habits.filter(h => h.isActive);
  const completedHabitsToday = habits.filter(h => h.isActive && h.lastCompletedDate?.startsWith(todayStr));
  const dueHabitsToday = habits.filter(h => {
    if (!h.isActive) return false;
    // Check if habit is completed today
    if (h.lastCompletedDate?.startsWith(todayStr)) return false;
    // Check schedule
    if (h.frequency === 'weekdays' && (dayOfWeek === 0 || dayOfWeek === 6)) return false;
    if (h.frequency === 'weekends' && dayOfWeek !== 0 && dayOfWeek !== 6) return false;
    if (h.scheduledDays && h.scheduledDays.length > 0 && !h.scheduledDays.includes(dayOfWeek)) return false;
    return true;
  });

  const activeQuests = quests.filter(q => q.status === 'active');
  const completedQuestsToday = quests.filter(q => q.status === 'completed' && q.completedAt?.startsWith(todayStr));
  const activeLadders = ladders.filter(l => l.status === 'active');
  const activeGoals = plannerGoals.filter(g => g.status === 'active');

  const badGuysDefeatedCount = badGuys.reduce((s, b) => s + b.defeatedCount, 0);
  const badGuysOccurrenceCount = badGuys.reduce((s, b) => s + b.occurrenceCount, 0);

  // Handle Weekly Review & Daily Mission AI Coaching
  const handleWeeklyReview = async () => {
    if (!onGenerateWeeklyReview) return;
    setWeeklyReviewLoading(true);
    setWeeklyReviewError(null);
    const res = await onGenerateWeeklyReview();
    if (res.ok && res.data) {
      setWeeklyReview(res.data);
    } else {
      setWeeklyReviewError(res.error ?? 'Failed to generate review');
    }
    setWeeklyReviewLoading(false);
  };

  const handleDailyMission = async () => {
    if (!onGenerateDailyMission) return;
    setDailyMissionLoading(true);
    setDailyMissionError(null);
    const res = await onGenerateDailyMission();
    if (res.ok && res.data) {
      setDailyMission(res.data);
    } else {
      setDailyMissionError(res.error ?? 'Failed to generate mission');
    }
    setDailyMissionLoading(false);
  };

  // Seasons planning helper
  const handleOpenSeasonModal = (season?: CharacterSeason) => {
    if (season) {
      setSeasonForm({
        title: season.title,
        identityFocus: season.identityFocus || '',
        startDate: season.startDate.split('T')[0],
        endDate: season.endDate ? season.endDate.split('T')[0] : '',
        status: season.status,
        targetTraitIds: season.targetTraitIds || [],
        targetHabitIds: season.targetHabitIds || [],
        targetLadderIds: season.targetLadderIds || [],
        openingXp: season.openingXp || 0,
        earnedXp: season.earnedXp || 0,
        completionScore: season.completionScore,
        finalReflection: season.finalReflection || '',
      });
      setEditingSeasonId(season.id);
    } else {
      setSeasonForm({
        title: '',
        identityFocus: '',
        startDate: todayStr,
        endDate: '',
        status: 'planning',
        targetTraitIds: [],
        targetHabitIds: [],
        targetLadderIds: [],
        openingXp: totalXp,
        earnedXp: 0,
        completionScore: null,
        finalReflection: '',
      });
      setEditingSeasonId(null);
    }
    setShowSeasonModal(true);
  };

  const handleSaveSeason = async () => {
    const formattedEndDate = seasonForm.endDate ? new Date(seasonForm.endDate).toISOString() : null;
    const payload = {
      title: seasonForm.title,
      identityFocus: seasonForm.identityFocus,
      startDate: new Date(seasonForm.startDate).toISOString(),
      endDate: formattedEndDate,
      status: seasonForm.status,
      targetTraitIds: seasonForm.targetTraitIds,
      targetHabitIds: seasonForm.targetHabitIds,
      targetLadderIds: seasonForm.targetLadderIds,
      openingXp: seasonForm.openingXp,
      earnedXp: seasonForm.earnedXp,
      completionScore: seasonForm.completionScore,
      finalReflection: seasonForm.finalReflection,
    };

    if (editingSeasonId) {
      await onUpdateSeason(editingSeasonId, payload);
    } else {
      await onAddSeason(payload);
    }
    setShowSeasonModal(false);
  };

  const handleDeleteSeason = async (id: string) => {
    if (window.confirm('Delete this Season and archive its logs? This cannot be undone.')) {
      await onDeleteSeason(id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── A. CHARACTER PROFILE HEADER ── */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-cyan)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
                Phase: {profile?.activeDevelopmentPhase || 'Foundations'}
              </span>
              {profile?.recoveryMode && (
                <span className="badge badge-danger" style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                  <Heart size={10} fill="var(--accent-red)" /> Recovery Active
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.35rem 0 0.15rem 0', color: 'var(--text-primary)' }}>
              {profile?.title || 'Architect of Self'}
            </h2>
            {profile?.selectedArchetype && (
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', fontWeight: 500, marginBottom: '0.5rem' }}>
                Archetype: {profile.selectedArchetype}
              </div>
            )}
            
            {profile?.selectedFocusAreas && profile.selectedFocusAreas.length > 0 && (
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {profile.selectedFocusAreas.map(area => (
                  <span key={area} className="badge badge-neutral" style={{ fontSize: '0.62rem' }}>
                    {area}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <button 
            className="glass-btn btn-cyan" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
            onClick={onOpenProfileEdit}
          >
            <User size={14} /> Edit Profile
          </button>
        </div>

        {profile?.identityStatement && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem 1rem', 
            background: 'rgba(168, 85, 247, 0.05)', 
            border: '1px dashed rgba(168, 85, 247, 0.2)', 
            borderRadius: '6px',
            fontStyle: 'italic',
            fontSize: '0.82rem',
            color: 'var(--text-primary)'
          }}>
            &ldquo;{profile.identityStatement}&rdquo;
          </div>
        )}

        <div style={{ marginTop: '1.25rem' }}>
          <XpProgressBar
            level={level}
            levelTitle={levelTitle}
            totalXp={totalXp}
            xpToNextLevel={xpToNextLevel}
            currentStreak={currentStreak}
            maxStreak={maxStreak}
          />
        </div>
      </div>

      {/* ── B. TODAY'S FOCUS ── */}
      <div className="os-grid-2">
        <Panel title="Today's Habits & Missions" icon={Clock} className="os-span-1">
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Actions requiring completion today to sustain streaks and level up.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {dueHabitsToday.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-success)', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0' }}>
                <CheckCircle2 size={16} /> All daily habits logged. Excellent work!
              </div>
            ) : (
              dueHabitsToday.map(h => (
                <div 
                  key={h.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '0.5rem', 
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '6px'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{h.title}</strong>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      Cue: {h.cue || 'Daily response'}
                    </div>
                  </div>
                  <button 
                    className="glass-btn btn-cyan" 
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}
                    onClick={() => onCompleteHabit(h.id)}
                    disabled={saving}
                  >
                    Check
                  </button>
                </div>
              ))
            )}

            {/* Active quests today */}
            {activeQuests.length > 0 && (
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.5rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>ACTIVE QUESTS</div>
                {activeQuests.map(q => (
                  <div 
                    key={q.id}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '0.5rem', 
                      background: 'rgba(6, 182, 212, 0.05)',
                      border: '1px solid rgba(6, 182, 212, 0.2)',
                      borderRadius: '6px',
                      marginBottom: '0.35rem'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.78rem' }}>{q.title}</strong>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>{q.description}</div>
                    </div>
                    <button 
                      className="glass-btn btn-cyan" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}
                      onClick={() => onCompleteQuest(q.id)}
                      disabled={saving}
                    >
                      Complete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Action Dashboard & Coaching" icon={Bot} className="os-span-1">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button 
                className="glass-btn btn-cyan" 
                style={{ flex: 1, fontSize: '0.72rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                onClick={handleDailyMission} 
                disabled={dailyMissionLoading || !onGenerateDailyMission}
              >
                {dailyMissionLoading ? <Loader2 size={12} className="spin" /> : <Calendar size={12} />}
                {dailyMission ? 'Regenerate Mission' : "Today's Mission"}
              </button>
              <button 
                className="glass-btn" 
                style={{ flex: 1, fontSize: '0.72rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                onClick={handleWeeklyReview} 
                disabled={weeklyReviewLoading || !onGenerateWeeklyReview}
              >
                {weeklyReviewLoading ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
                Weekly Review
              </button>
            </div>

            {dailyMissionError && (
              <div style={{ fontSize: '0.68rem', color: 'var(--text-danger)', marginTop: '0.25rem' }}>
                {dailyMissionError}
              </div>
            )}

            {weeklyReviewError && (
              <div style={{ fontSize: '0.68rem', color: 'var(--text-danger)', marginTop: '0.25rem' }}>
                {weeklyReviewError}
              </div>
            )}

            {dailyMission && (
              <div className="glass-panel" style={{ padding: '0.75rem', marginTop: '0.25rem', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>{dailyMission.missionTitle}</h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>{dailyMission.missionDescription}</p>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                  <span>Duration: {dailyMission.estimatedMinutes} min</span>
                  <span>Type: {dailyMission.missionType}</span>
                </div>
              </div>
            )}

            {weeklyReview && (
              <div className="glass-panel" style={{ padding: '0.75rem', marginTop: '0.25rem', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', color: 'var(--accent-purple)' }}>Weekly Strategy Review</h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
                  <strong>Wins:</strong> {weeklyReview.mainWins.join(', ') || 'None logged'}<br />
                  <strong>Weakest:</strong> {weeklyReview.weakestSystemPoint}<br />
                  <strong>Adjustment:</strong> {weeklyReview.oneRecommendedAdjustment}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', marginTop: '0.25rem' }}>
              <button className="glass-btn" style={{ padding: '0.45rem', fontSize: '0.7rem' }} onClick={() => onOpenView('habits')}>
                + Log Habit
              </button>
              <button className="glass-btn" style={{ padding: '0.45rem', fontSize: '0.7rem' }} onClick={() => onOpenView('identity')}>
                + Reflect Identity
              </button>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── C. STATUS SUMMARY CARDS (KPIs) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
        <div className="glass-card" style={{ padding: '0.75rem 1rem', borderLeft: '3px solid var(--accent-teal)' }}>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed Today</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
            {completedHabitsToday.length + completedQuestsToday.length} items
          </div>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Habits: {completedHabitsToday.length} | Quests: {completedQuestsToday.length}</span>
        </div>

        <div className="glass-card" style={{ padding: '0.75rem 1rem', borderLeft: '3px solid var(--accent-orange)' }}>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Streak</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-orange)' }}>
            {currentStreak} days
          </div>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Max streak: {maxStreak} days</span>
        </div>

        <div className="glass-card" style={{ padding: '0.75rem 1rem', borderLeft: '3px solid var(--accent-red)' }}>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attention Needed</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-red)' }}>
            {dueHabitsToday.length} due
          </div>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Of {activeHabits.length} active habits</span>
        </div>

        <div className="glass-card" style={{ padding: '0.75rem 1rem', borderLeft: '3px solid var(--accent-cyan)' }}>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active goals</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {activeGoals.length} goals
          </div>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>In Planner Engine</span>
        </div>

        <div className="glass-card" style={{ padding: '0.75rem 1rem', borderLeft: '3px solid var(--accent-purple)' }}>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Seasons</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
            {seasons.filter(s => s.status === 'active').length} season
          </div>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Planned: {seasons.filter(s => s.status === 'planning').length}</span>
        </div>
      </div>

      {/* ── D. PROGRESS OVERVIEW (REPORTS) ── */}
      <Panel title="Progress & Pattern Overview" icon={TrendingUp} className="os-span-4">
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className={`glass-btn ${reportTab === 'habits' ? 'btn-cyan' : ''}`}
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.68rem' }}
            onClick={() => setReportTab('habits')}
          >
            Habit Consistency
          </button>
          <button 
            className={`glass-btn ${reportTab === 'traits' ? 'btn-cyan' : ''}`}
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.68rem' }}
            onClick={() => setReportTab('traits')}
          >
            Traits Radar
          </button>
          <button 
            className={`glass-btn ${reportTab === 'saboteurs' ? 'btn-cyan' : ''}`}
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.68rem' }}
            onClick={() => setReportTab('saboteurs')}
          >
            Saboteurs (Bad Guys)
          </button>
        </div>

        {reportTab === 'habits' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {activeHabits.length === 0 ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '1rem 0' }}>No active habits found.</div>
              ) : (
                activeHabits.map(h => {
                  const completionRate = h.currentStreak > 0 ? Math.min(100, Math.round((h.currentStreak / (h.maxStreak || 1)) * 100)) : 0;
                  return (
                    <div key={h.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.15rem' }}>
                        <span>{h.title} <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>({h.frequency})</span></span>
                        <strong>Streak: {h.currentStreak} days (Max: {h.maxStreak}d)</strong>
                      </div>
                      <div className="progress-bar" style={{ height: '6px' }}>
                        <div className="progress-fill" style={{ width: `${completionRate}%`, background: h.currentStreak > 0 ? 'var(--accent-teal)' : 'var(--accent-orange)' }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {reportTab === 'traits' && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
            {traits.length === 0 ? (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Add character traits to render radar.</div>
            ) : (
              <div style={{ width: '100%', maxWidth: '350px', height: '240px' }}>
                <TraitRadar traits={traits} />
              </div>
            )}
          </div>
        )}

        {reportTab === 'saboteurs' && (
          <div>
            {badGuys.length > 0 && (
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Cumulative urge encounters: <strong>{badGuysOccurrenceCount}</strong> | Resisted: <strong>{badGuysDefeatedCount}</strong> (success rate: {badGuysOccurrenceCount > 0 ? Math.round((badGuysDefeatedCount / badGuysOccurrenceCount) * 100) : 0}%)
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {badGuys.length === 0 ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No saboteurs registered yet.</div>
              ) : (
                badGuys.map(bg => {
                  const resistPct = bg.occurrenceCount > 0 ? Math.round((bg.defeatedCount / bg.occurrenceCount) * 100) : 0;
                  return (
                    <div 
                      key={bg.id} 
                      style={{ 
                        padding: '0.5rem', 
                        background: 'rgba(244, 63, 94, 0.03)', 
                        border: '1px solid rgba(244, 63, 94, 0.1)', 
                        borderRadius: '6px' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600 }}><Skull size={11} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} className="text-magenta" /> {bg.title}</span>
                        <span className="badge badge-neutral" style={{ fontSize: '0.62rem' }}>Resisted {resistPct}%</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                        Trigger: {bg.triggerDescription || 'Not specified'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </Panel>

      {/* ── E. SEASONS PLANNER ── */}
      <Panel title="Seasons Planner" icon={Calendar} className="os-span-4">
        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Define themes and focus groups for quarterly/monthly sprints. Align habits, traits, and exposure ladders to a central theme. Currently, there are <strong>{activeLadders.length}</strong> active exposure ladders.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button 
            className="glass-btn btn-cyan" 
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            onClick={() => handleOpenSeasonModal()}
          >
            <Plus size={14} /> Plan New Season
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {seasons.length === 0 ? (
            <EmptyState title="No seasons planned" message="Plan a seasonal character sprint to align focus." />
          ) : (
            seasons.slice().sort((a,b) => b.startDate.localeCompare(a.startDate)).map(s => {
              const isActive = s.status === 'active';
              return (
                <div 
                  key={s.id} 
                  className="glass-card" 
                  style={{ 
                    padding: '1rem', 
                    borderLeft: `4px solid ${isActive ? 'var(--accent-cyan)' : 'var(--panel-border)'}` 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} className={isActive ? 'text-cyan' : 'text-muted'} />
                      <strong style={{ fontSize: '0.85rem' }}>{s.title}</strong>
                      <span className={`badge ${
                        s.status === 'active' ? 'badge-cyan' : 
                        s.status === 'planning' ? 'badge-purple' : 
                        s.status === 'completed' ? 'badge-success' : 'badge-neutral'
                      }`} style={{ fontSize: '0.58rem' }}>
                        {s.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => handleOpenSeasonModal(s)}>
                        <Edit2 size={11} />
                      </button>
                      <button className="glass-btn" style={{ padding: '0.25rem', color: 'var(--text-danger)' }} onClick={() => handleDeleteSeason(s.id)}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {s.identityFocus && (
                    <p style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-secondary)', margin: '0.25rem 0 0.5rem 0' }}>
                      &ldquo;{s.identityFocus}&rdquo;
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    <span>Start: {new Date(s.startDate).toLocaleDateString()}</span>
                    {s.endDate && <span>End: {new Date(s.endDate).toLocaleDateString()}</span>}
                    <span>Traits: {s.targetTraitIds?.length || 0}</span>
                    <span>Habits: {s.targetHabitIds?.length || 0}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Panel>

      {/* ── F. CONNECTIONS CENTER & REAL SYNC ── */}
      <Panel title="OS Connections & Integrations" icon={Link2} className="os-span-4">
        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Connect your character entities to Daily tasks, Weekly goals, and Brain logs for bidirectional synchrony.
        </p>

        <div className="os-grid-2">
          <div>
            <h4 style={{ fontSize: '0.78rem', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CheckCircle2 size={13} className="text-cyan" /> Task Synchronizations
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {taskIntegrations.length === 0 ? (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No active habit-to-task integrations.</div>
              ) : (
                taskIntegrations.map(ti => {
                  const habit = habits.find(h => h.id === ti.characterHabitId);
                  const task = plannerTasks.find(t => t.id === ti.plannerTaskId);
                  return (
                    <div key={ti.characterHabitId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid var(--panel-border)' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Habit: {habit?.title || 'Unknown Habit'}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--accent-cyan)' }}>
                          Syncs to Task: {task?.title || 'Unknown Task'}
                        </div>
                      </div>
                      <button className="glass-btn" style={{ padding: '0.2rem', color: 'var(--text-danger)' }} onClick={() => unlinkHabitFromPlannerTask(ti.plannerTaskId)}>
                        <X size={10} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.78rem', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Target size={13} className="text-purple" /> Goal Synchronizations
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {goalIntegrations.length === 0 ? (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No active trait-to-goal integrations.</div>
              ) : (
                goalIntegrations.map(gi => {
                  const trait = traits.find(t => t.id === gi.characterTraitId);
                  const goal = plannerGoals.find(g => g.id === gi.goalId);
                  return (
                    <div key={gi.characterTraitId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid var(--panel-border)' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Trait: {trait?.name || 'Unknown Trait'}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--accent-purple)' }}>
                          Syncs to Goal: {goal?.title || 'Unknown Goal'}
                        </div>
                      </div>
                      <button className="glass-btn" style={{ padding: '0.2rem', color: 'var(--text-danger)' }} onClick={() => unlinkTraitFromGoal(gi.goalId)}>
                        <X size={10} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* ── G. RECENT ACTIVITY FEED ── */}
      <Panel title="Recent Activity" icon={Activity} className="os-span-4">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {reflections.slice(0, 5).map(r => (
            <div 
              key={r.id} 
              style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                padding: '0.45rem 0.6rem', 
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--panel-border)', 
                borderRadius: '6px',
                alignItems: 'center'
              }}
            >
              <BookOpen size={12} className="text-purple" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Logged Reflection: {r.whatLearned}
                </div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                  {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
          {completedQuestsToday.map(q => (
            <div 
              key={q.id}
              style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                padding: '0.45rem 0.6rem', 
                background: 'rgba(6, 182, 212, 0.03)',
                border: '1px solid rgba(6, 182, 212, 0.1)', 
                borderRadius: '6px',
                alignItems: 'center'
              }}
            >
              <Award size={12} className="text-cyan" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Completed Quest: {q.title} (+{q.rewardXp} XP)
                </div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                  Today
                </div>
              </div>
            </div>
          ))}
          {reflections.length === 0 && completedQuestsToday.length === 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              No recent activity to display.
            </div>
          )}
        </div>
      </Panel>

      {/* ── SEASONS PLANNING MODAL ── */}
      {showSeasonModal && (
        <div className="modal-overlay" onClick={() => setShowSeasonModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} className="text-purple" />
                <h3 style={{ margin: 0 }}>{editingSeasonId ? 'Edit Season Sprint' : 'Plan Season Sprint'}</h3>
              </div>
              <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => setShowSeasonModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              <div>
                <label className="field-label">Season Title *</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  style={{ width: '100%', padding: '0.45rem' }}
                  value={seasonForm.title} 
                  onChange={e => setSeasonForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Summer of Discipline" 
                />
              </div>

              <div>
                <label className="field-label">Identity Focus / Mantra</label>
                <textarea 
                  className="glass-input" 
                  style={{ width: '100%', minHeight: '60px', padding: '0.45rem' }}
                  value={seasonForm.identityFocus} 
                  onChange={e => setSeasonForm(p => ({ ...p, identityFocus: e.target.value }))}
                  placeholder="e.g. Live intentionally. Make time work for you, not against you." 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Start Date</label>
                  <input 
                    type="date" 
                    className="glass-input" 
                    style={{ width: '100%', padding: '0.4rem' }}
                    value={seasonForm.startDate} 
                    onChange={e => setSeasonForm(p => ({ ...p, startDate: e.target.value }))} 
                  />
                </div>
                <div>
                  <label className="field-label">End Date</label>
                  <input 
                    type="date" 
                    className="glass-input" 
                    style={{ width: '100%', padding: '0.4rem' }}
                    value={seasonForm.endDate || ''} 
                    onChange={e => setSeasonForm(p => ({ ...p, endDate: e.target.value || null }))} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Status</label>
                  <select 
                    className="glass-input" 
                    style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }}
                    value={seasonForm.status} 
                    onChange={e => setSeasonForm(p => ({ ...p, status: e.target.value as SeasonStatus }))}
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Opening XP</label>
                  <input 
                    type="number" 
                    className="glass-input" 
                    style={{ width: '100%', padding: '0.4rem' }}
                    value={seasonForm.openingXp} 
                    disabled 
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Target Trait focus (Select multiple)</label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {traits.map(t => {
                    const selected = seasonForm.targetTraitIds.includes(t.id);
                    return (
                      <button 
                        key={t.id}
                        type="button"
                        className={`glass-btn ${selected ? 'btn-cyan' : ''}`}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem' }}
                        onClick={() => {
                          setSeasonForm(p => {
                            const ids = p.targetTraitIds.includes(t.id) 
                              ? p.targetTraitIds.filter(id => id !== t.id) 
                              : [...p.targetTraitIds, t.id];
                            return { ...p, targetTraitIds: ids };
                          });
                        }}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="field-label">Target Habit focus (Select multiple)</label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {habits.map(h => {
                    const selected = seasonForm.targetHabitIds.includes(h.id);
                    return (
                      <button 
                        key={h.id}
                        type="button"
                        className={`glass-btn ${selected ? 'btn-cyan' : ''}`}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem' }}
                        onClick={() => {
                          setSeasonForm(p => {
                            const ids = p.targetHabitIds.includes(h.id) 
                              ? p.targetHabitIds.filter(id => id !== h.id) 
                              : [...p.targetHabitIds, h.id];
                            return { ...p, targetHabitIds: ids };
                          });
                        }}
                      >
                        {h.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
              <button className="glass-btn" onClick={() => setShowSeasonModal(false)}>
                Cancel
              </button>
              <button className="glass-btn btn-cyan" onClick={handleSaveSeason} disabled={saving || !seasonForm.title}>
                Save Season
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
