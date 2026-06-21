import React, { useState } from 'react';
import { useCharacter } from './hooks/useCharacter';
import { useApp } from '../../context/useApp';
import { PageHeader } from '../../components/system/Layout';
import { LoadingState, ErrorState } from '../../components/system/States';
import {
  Star, Target, Activity, Sparkles, Rocket, BarChart3, Trophy, User, X
} from 'lucide-react';
import { CharacterHeader } from './views/CharacterHeader';
import { OverviewDashboard } from './views/OverviewDashboard';
import { HabitsView } from './views/HabitsView';
import { GoalsView } from './views/GoalsView';
import { ChallengesView } from './views/ChallengesView';
import { IdentityRulesView } from './views/IdentityRulesView';
import { AnalyticsView } from './views/AnalyticsView';
import { OnboardingFlow } from './views/OnboardingFlow';
import { CharacterCoachDialog } from './components/CharacterCoachDialog';

type SectionTab =
  | 'overview' | 'habits' | 'challenges' | 'goals' | 'identity' | 'analytics';

const TAB_LABELS: Record<SectionTab, string> = {
  overview: 'Dashboard',
  habits: 'Habits',
  challenges: 'Challenges',
  goals: 'Goals',
  identity: 'Identity',
  analytics: 'Analysis',
};

const TAB_ICONS: Record<SectionTab, React.FC<{ size?: number }>> = {
  overview: Activity,
  habits: Target,
  challenges: Trophy,
  goals: Star,
  identity: User,
  analytics: BarChart3,
};

export const Character: React.FC = () => {
  const { user, plannerTasks, goals, notes, memoryItems } = useApp();
  const c = useCharacter();
  const [activeTab, setActiveTab] = useState<SectionTab>('overview');
  const [coachOpen, setCoachOpen] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({
    title: '',
    selectedArchetype: '',
    activeDevelopmentPhase: '',
    preferredDifficulty: 5,
    recoveryMode: false,
    selectedFocusAreas: '',
    identityStatement: '',
  });

  const handleOpenProfileEdit = () => {
    if (c.profile) {
      setProfileForm({
        title: c.profile.title || '',
        selectedArchetype: c.profile.selectedArchetype || '',
        activeDevelopmentPhase: c.profile.activeDevelopmentPhase || 'Foundations',
        preferredDifficulty: c.profile.preferredDifficulty || 5,
        recoveryMode: c.profile.recoveryMode || false,
        selectedFocusAreas: c.profile.selectedFocusAreas ? c.profile.selectedFocusAreas.join(', ') : '',
        identityStatement: c.profile.identityStatement || '',
      });
      setShowProfileEdit(true);
    }
  };

  const handleSaveProfile = async () => {
    if (c.profile) {
      const focusAreas = profileForm.selectedFocusAreas
        ? profileForm.selectedFocusAreas.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      await c.updateProfile({
        title: profileForm.title,
        selectedArchetype: profileForm.selectedArchetype || null,
        activeDevelopmentPhase: profileForm.activeDevelopmentPhase,
        preferredDifficulty: profileForm.preferredDifficulty,
        recoveryMode: profileForm.recoveryMode,
        selectedFocusAreas: focusAreas,
        identityStatement: profileForm.identityStatement,
      });
      setShowProfileEdit(false);
    }
  };

  if (!user) {
    return (
      <div className="character-splash">
        <h2>Character</h2>
        <p>Sign in to access your character development engine.</p>
      </div>
    );
  }

  if (c.loading) {
    return <LoadingState title="Character" message="Loading your character data..." />;
  }

  if (c.error) {
    return <ErrorState title="Could not load character" message={c.error} onRetry={c.refresh} />;
  }

  if (c.onboardingStatus === 'not_started' || c.onboardingStatus === 'in_progress') {
    return (
      <div>
        <PageHeader title="Character Development Engine" description="Set up your character system to begin tracking growth." icon={Rocket} />
        <div className="page-body">
          <OnboardingFlow onComplete={c.runOnboarding} loading={c.onboardingLoading} />
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewDashboard
            profile={c.profile}
            traits={c.traits}
            habits={c.habits}
            quests={c.quests}
            badGuys={c.badGuys}
            powerUps={c.powerUps}
            ladders={c.ladders}
            reflections={c.reflections}
            aiInsights={c.aiInsights}
            level={c.level}
            levelTitle={c.levelTitle}
            totalXp={c.totalXp}
            xpToNextLevel={c.xpToNextLevel}
            currentStreak={c.currentStreak}
            maxStreak={c.maxStreak}
            onOpenView={(v) => setActiveTab(v as SectionTab)}
            onGenerateWeeklyReview={() => c.getWeeklyReview({ characterData: c.buildBrainContextSummary() })}
            onGenerateDailyMission={() => c.getDailyMission({ characterContext: c.buildBrainContextSummary() })}
            onUpdateProfile={c.updateProfile}
            connections={c.connections}
            onAddConnection={c.addConnection}
            onDeleteConnection={c.deleteConnection}
            taskIntegrations={c.taskIntegrations}
            unlinkHabitFromPlannerTask={c.unlinkHabitFromPlannerTask}
            goalIntegrations={c.goalIntegrations}
            unlinkTraitFromGoal={c.unlinkTraitFromGoal}
            plannerTasks={plannerTasks}
            plannerGoals={goals}
            notes={notes}
            memoryItems={memoryItems}
            generateAIInsights={c.generateAIInsights}
            seasons={c.seasons}
            onAddSeason={c.addSeason}
            onUpdateSeason={c.updateSeason}
            onDeleteSeason={c.deleteSeason}
            onCompleteHabit={c.completeHabit}
            onCompleteQuest={c.completeQuest}
            onTriggerRule={c.triggerIfThenRule}
            onAddReflection={c.addReflection}
            saving={c.saving}
            onOpenProfileEdit={handleOpenProfileEdit}
          />
        );

      case 'habits':
        return (
          <HabitsView
            habits={c.habits}
            traits={c.traits}
            connections={c.connections}
            onAddConnection={c.addConnection}
            onDeleteConnection={c.deleteConnection}
            onCompleteHabit={c.completeHabit}
            onAddHabit={c.addHabit}
            onUpdateHabit={c.updateHabit}
            onDeleteHabit={c.deleteHabit}
            saving={c.saving}
            badGuys={c.badGuys}
            onAddBadGuy={c.addBadGuy}
            onUpdateBadGuy={c.updateBadGuy}
            onDeleteBadGuy={c.deleteBadGuy}
            onResistBadGuy={c.resistBadGuy}
            onGiveInBadGuy={c.giveInBadGuy}
            powerUps={c.powerUps}
            onAddPowerUp={c.addPowerUp}
            onUpdatePowerUp={c.updatePowerUp}
            onDeletePowerUp={c.deletePowerUp}
            onUsePowerUp={c.usePowerUp}
            ifThenRules={c.ifThenRules}
            onAddIfThenRule={c.addIfThenRule}
            onUpdateIfThenRule={c.updateIfThenRule}
            onDeleteIfThenRule={c.deleteIfThenRule}
            onTriggerRule={c.triggerIfThenRule}
          />
        );

      case 'challenges':
        return (
          <ChallengesView
            challenges={c.characterChallenges}
            plannerTasks={plannerTasks}
            connections={c.connections}
            onAddConnection={c.addConnection}
            onDeleteConnection={c.deleteConnection}
            onAddChallenge={c.addChallenge}
            onUpdateChallenge={c.updateChallenge}
            onDeleteChallenge={c.deleteChallenge}
            saving={c.saving}
            quests={c.quests}
            traits={c.traits}
            onAddQuest={c.addQuest}
            onUpdateQuest={c.updateQuest}
            onCompleteQuest={c.completeQuest}
            onDeleteQuest={c.deleteQuest}
            onGenerateQuest={c.generateQuestWithCoach}
            ladders={c.ladders}
            onAddLadder={c.addLadder}
            onUpdateLadder={c.updateLadder}
            onDeleteLadder={c.deleteLadder}
            onGenerateLadder={c.generateLadderWithCoach}
          />
        );

      case 'goals':
        return (
          <GoalsView
            goals={c.goals}
            plannerGoals={goals}
            connections={c.connections}
            onAddConnection={c.addConnection}
            onDeleteConnection={c.deleteConnection}
            onAddGoal={c.addGoal}
            onUpdateGoal={c.updateGoal}
            onDeleteGoal={c.deleteGoal}
            saving={c.saving}
            traits={c.traits}
            habits={c.habits}
            quests={c.quests}
            reflections={c.reflections}
            ladders={c.ladders}
            onAddTrait={c.addTrait}
            onUpdateTrait={c.updateTrait}
            onDeleteTrait={c.deleteTrait}
            contracts={c.accountabilityContracts}
            onAddContract={c.addContract}
            onUpdateContract={c.updateContract}
            onDeleteContract={c.deleteContract}
            onCompleteContract={c.completeContract}
            onFailContract={c.failContract}
          />
        );

      case 'identity':
        return (
          <IdentityRulesView
            rules={c.identityRules}
            connections={c.connections}
            onAddConnection={c.addConnection}
            onDeleteConnection={c.deleteConnection}
            onAddRule={c.addIdentityRule}
            onUpdateRule={c.updateIdentityRule}
            onDeleteRule={c.deleteIdentityRule}
            saving={c.saving}
            profile={c.profile}
            onUpdateProfile={c.updateProfile}
          />
        );

      case 'analytics':
        return (
          <AnalyticsView
            traits={c.traits}
            habits={c.habits}
            quests={c.quests}
            badGuys={c.badGuys}
            totalXp={c.totalXp}
            level={c.level}
            currentStreak={c.currentStreak}
            maxStreak={c.maxStreak}
            reflections={c.reflections}
            onAddReflection={c.addReflection}
            onUpdateReflection={c.updateReflection}
            onDeleteReflection={c.deleteReflection}
            onAnalyzeReflection={c.analyzeReflectionWithCoach}
            brainContext={c.brainContext}
            saving={c.saving}
            habitLogs={c.habitLogs}
          />
        );

      default:
        return null;
    }
  };

  const tabs: SectionTab[] = [
    'overview', 'habits', 'challenges', 'goals', 'identity', 'analytics'
  ];

  return (
    <div>
      <CharacterHeader
        profile={c.profile}
        level={c.level}
        levelTitle={c.levelTitle}
        totalXp={c.totalXp}
        saving={c.saving}
        onOpenCoach={() => setCoachOpen(true)}
        onLogWin={() => c.addReflection({
          preActionFear: '', postActionResult: '', whatHappened: 'I succeeded at something today.',
          whatLearned: 'Wins reinforce identity. Record them.',
          emotionalIntensityBefore: 5, emotionalIntensityAfter: 3,
          nextStep: '', privacySetting: 'private',
          aiSummaryStatus: 'pending', linkedEntityType: null, linkedEntityId: null,
        })}
        onLogStruggle={() => c.addReflection({
          preActionFear: 'I felt resistance', postActionResult: '',
          whatHappened: 'I struggled with something today.',
          whatLearned: '',
          emotionalIntensityBefore: 7, emotionalIntensityAfter: 6,
          nextStep: '', privacySetting: 'private',
          aiSummaryStatus: 'pending', linkedEntityType: null, linkedEntityId: null,
        })}
        onRefresh={c.refresh}
      />

      {c.recentAchievement && (
        <div className="glass-panel" style={{ padding: '0.85rem', marginBottom: '1rem', border: '1px solid var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Sparkles size={18} className="text-cyan" />
          <span style={{ fontWeight: 600 }}>{c.recentAchievement}</span>
          <button className="glass-btn" style={{ marginLeft: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.68rem' }} onClick={c.dismissRecentAchievement}>Dismiss</button>
        </div>
      )}

      <div className="page-body">
        <div className="os-tabs" style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {tabs.map(tab => {
            const Icon = TAB_ICONS[tab];
            return (
              <button
                key={tab}
                className={`glass-btn ${activeTab === tab ? 'btn-cyan' : ''}`}
                onClick={() => setActiveTab(tab)}
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Icon size={13} />
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>

        {renderTabContent()}
      </div>

      <CharacterCoachDialog
        open={coachOpen}
        onClose={() => setCoachOpen(false)}
        onSendMessage={c.sendCoachMessage}
        brainContext={c.brainContext}
      />

      {showProfileEdit && (
        <div className="modal-overlay" onClick={() => setShowProfileEdit(false)}>
          <div className="modal-content" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={20} className="text-cyan" />
                <h3 style={{ margin: 0 }}>Edit Character Profile</h3>
              </div>
              <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => setShowProfileEdit(false)}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              <div>
                <label className="field-label">Character Title / Display Name</label>
                <input
                  type="text"
                  className="glass-input"
                  style={{ width: '100%', padding: '0.5rem' }}
                  value={profileForm.title}
                  onChange={e => setProfileForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Architect of Self"
                />
              </div>

              <div>
                <label className="field-label">Selected Archetype</label>
                <input
                  type="text"
                  className="glass-input"
                  style={{ width: '100%', padding: '0.5rem' }}
                  value={profileForm.selectedArchetype}
                  onChange={e => setProfileForm(p => ({ ...p, selectedArchetype: e.target.value }))}
                  placeholder="e.g. Rogue, Scholar, Warrior"
                />
              </div>

              <div>
                <label className="field-label">Active Development Phase</label>
                <select
                  className="glass-input"
                  style={{ width: '100%', padding: '0.5rem', background: 'var(--panel-bg)' }}
                  value={profileForm.activeDevelopmentPhase}
                  onChange={e => setProfileForm(p => ({ ...p, activeDevelopmentPhase: e.target.value }))}
                >
                  <option value="Foundations">Foundations</option>
                  <option value="Expansion">Expansion</option>
                  <option value="Mastery">Mastery</option>
                  <option value="Stabilization">Stabilization</option>
                </select>
              </div>

              <div>
                <label className="field-label">Preferred Difficulty (1 - 10)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    style={{ flex: 1 }}
                    value={profileForm.preferredDifficulty}
                    onChange={e => setProfileForm(p => ({ ...p, preferredDifficulty: parseInt(e.target.value) }))}
                  />
                  <span style={{ fontWeight: 600, width: '20px' }}>{profileForm.preferredDifficulty}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="recoveryMode"
                  checked={profileForm.recoveryMode}
                  onChange={e => setProfileForm(p => ({ ...p, recoveryMode: e.target.checked }))}
                />
                <label htmlFor="recoveryMode" style={{ userSelect: 'none' }}>Recovery Mode (Mutes penalty rules for bad habits during high stress/burnout)</label>
              </div>

              <div>
                <label className="field-label">Focus Areas (comma separated)</label>
                <input
                  type="text"
                  className="glass-input"
                  style={{ width: '100%', padding: '0.5rem' }}
                  value={profileForm.selectedFocusAreas}
                  onChange={e => setProfileForm(p => ({ ...p, selectedFocusAreas: e.target.value }))}
                  placeholder="e.g. Discipline, Sleep Hygiene, Courage"
                />
              </div>

              <div>
                <label className="field-label">Identity Statement</label>
                <textarea
                  className="glass-input"
                  style={{ width: '100%', padding: '0.5rem', minHeight: '80px', resize: 'vertical' }}
                  value={profileForm.identityStatement}
                  onChange={e => setProfileForm(p => ({ ...p, identityStatement: e.target.value }))}
                  placeholder="Define who you are becoming..."
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
              <button className="glass-btn" onClick={() => setShowProfileEdit(false)}>
                Cancel
              </button>
              <button className="glass-btn btn-cyan" onClick={handleSaveProfile} disabled={c.saving}>
                {c.saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
