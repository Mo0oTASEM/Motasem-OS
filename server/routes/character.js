import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { scoreHabitCompletion } from '../ai/scoringEngine.js'
import { generateNextChallenge } from '../ai/challengeGenerator.js'

const router = Router()

const DEFAULT_STATE = {
  xp: 0,
  level: 1,
  stats: { presence: 20, discipline: 10, social: 5, physique: 15, craft: 40, frame: 10 },
  week_streak: [false, false, false, false, false, false, false],
  approach_progress: [0, 0, 0, 0],
}

const DEFAULT_DOPAMINE = {
  current_streak: 0,
  longest_streak: 0,
  last_checkin_date: null,
  relapse_log: [],
}

const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, name: 'Novice' },
  { level: 2, xp: 100, name: 'Apprentice' },
  { level: 3, xp: 300, name: 'Journeyman' },
  { level: 4, xp: 600, name: 'Adept' },
  { level: 5, xp: 1000, name: 'Expert' },
  { level: 6, xp: 1500, name: 'Master' },
  { level: 7, xp: 2100, name: 'Legendary' },
  { level: 8, xp: 2800, name: 'Mythic' },
  { level: 9, xp: 3600, name: 'Transcendent' },
  { level: 10, xp: 5000, name: 'Ascendant' },
]

function computeLevel(xp) {
  let result = { level: 1, name: 'Novice' }
  for (const t of LEVEL_THRESHOLDS) {
    if (xp >= t.xp) result = { level: t.level, name: t.name }
    else break
  }
  return result
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// GET /api/character/state
router.get('/state', async (req, res, next) => {
  try {
    const userId = req.user.id
    const today = todayISO()

    const [stateResult, habitsResult, challengesResult, aiChallengesResult, dopamineResult] = await Promise.all([
      supabase.from('character_state').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('character_habit_logs').select('habit_id, is_never_do').eq('user_id', userId).eq('logged_date', today),
      supabase.from('character_challenge_completions').select('challenge_id').eq('user_id', userId),
      supabase.from('character_ai_challenges').select('*').eq('user_id', userId).eq('is_completed', false),
      supabase.from('character_dopamine').select('*').eq('user_id', userId).maybeSingle(),
    ])

    let state = stateResult.data
    if (!state) {
      const { data: inserted } = await supabase.from('character_state').insert({
        user_id: userId,
        ...DEFAULT_STATE,
        stats: DEFAULT_STATE.stats,
        week_streak: DEFAULT_STATE.week_streak,
        approach_progress: DEFAULT_STATE.approach_progress,
      }).select().single()
      state = inserted
    }

    let dopamine = dopamineResult.data
    if (!dopamine) {
      const { data: inserted } = await supabase.from('character_dopamine').insert({
        user_id: userId,
        ...DEFAULT_DOPAMINE,
      }).select().single()
      dopamine = inserted
    }

    res.json({
      xp: state.xp,
      level: state.level,
      stats: state.stats,
      weekStreak: state.week_streak,
      approachProgress: state.approach_progress,
      todayHabitIds: (habitsResult.data || []).map(h => h.habit_id),
      completedChallengeIds: (challengesResult.data || []).map(c => c.challenge_id),
      aiChallenges: aiChallengesResult.data || [],
      dopamine: {
        currentStreak: dopamine.current_streak,
        longestStreak: dopamine.longest_streak,
        lastCheckinDate: dopamine.last_checkin_date,
        relapseLog: dopamine.relapse_log,
      },
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/character/habit-toggle
router.post('/habit-toggle', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { habit_id, habit_name, xp, stat, is_never_do } = req.body
    const today = todayISO()

    const { data: existing } = await supabase.from('character_habit_logs')
      .select('id, xp_awarded, stat_affected')
      .eq('user_id', userId)
      .eq('habit_id', habit_id)
      .eq('logged_date', today)
      .maybeSingle()

    if (existing) {
      await supabase.from('character_habit_logs').delete().eq('id', existing.id)

      const { data: currentState } = await supabase.from('character_state')
        .select('*').eq('user_id', userId).single()

      const newStats = { ...currentState.stats }
      if (existing.stat_affected && newStats[existing.stat_affected] !== undefined) {
        newStats[existing.stat_affected] = Math.max(0, newStats[existing.stat_affected] - (stat ? 1 : 0))
      }
      const reversedXp = existing.xp_awarded || 0
      const newXp = Math.max(0, currentState.xp - reversedXp)
      const oldLevel = currentState.level
      const { level: newLevel } = computeLevel(newXp)

      await supabase.from('character_state').update({
        xp: newXp,
        level: newLevel,
        stats: newStats,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId)

      return res.json({
        action: 'unchecked',
        xp_reversed: reversedXp,
        new_xp: newXp,
        new_stats: newStats,
        new_level: newLevel,
        leveled_down: newLevel < oldLevel,
      })
    }

    const [currentStateResult, todayLogsResult] = await Promise.all([
      supabase.from('character_state').select('*').eq('user_id', userId).single(),
      supabase.from('character_habit_logs').select('habit_id, habit_name, is_never_do').eq('user_id', userId).eq('logged_date', today),
    ])
    const currentState = currentStateResult.data
    const todayLogs = todayLogsResult.data || []

    const habit = { habit_id, habit_name, xp, stat, is_never_do }
    const { final_xp: finalXp, stat_delta: statDelta } = await scoreHabitCompletion({
      user_id: userId,
      habit,
      todayLogs,
      characterState: currentState,
    })

    await supabase.from('character_habit_logs').insert({
      user_id: userId,
      habit_id,
      habit_name: habit_name || '',
      xp_awarded: finalXp,
      stat_affected: stat,
      is_never_do: is_never_do || false,
      logged_date: today,
    })

    const newStats = { ...currentState.stats }
    if (stat && newStats[stat] !== undefined) {
      newStats[stat] = Math.min(100, Math.max(0, newStats[stat] + statDelta))
    }
    const newXp = currentState.xp + finalXp
    const oldLevel = currentState.level
    const { level: newLevel, name: levelName } = computeLevel(newXp)

    await supabase.from('character_state').update({
      xp: newXp,
      level: newLevel,
      stats: newStats,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)

    const levelUp = newLevel > oldLevel ? { new_level: newLevel, level_name: levelName } : null

    res.json({
      action: 'checked',
      xp_awarded: finalXp,
      stat_delta: statDelta,
      new_xp: newXp,
      new_stats: newStats,
      new_level: newLevel,
      level_up: levelUp,
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/character/challenge-complete
router.post('/challenge-complete', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { challenge_id, challenge_title, xp, tag, difficulty, is_ai_generated } = req.body

    const { error: insertError } = await supabase.from('character_challenge_completions').insert({
      user_id: userId,
      challenge_id,
      challenge_title: challenge_title || '',
      xp_awarded: xp || 0,
      tag: tag || 'general',
      difficulty: difficulty || 'normal',
    })

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'Already completed' })
      }
      throw insertError
    }

    const { data: currentState } = await supabase.from('character_state')
      .select('*').eq('user_id', userId).single()

    const newXp = currentState.xp + (xp || 0)
    const { level: newLevel, name: levelName } = computeLevel(newXp)
    const oldLevel = currentState.level

    await supabase.from('character_state').update({
      xp: newXp,
      level: newLevel,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)

    if (is_ai_generated) {
      await supabase.from('character_ai_challenges').update({ is_completed: true })
        .eq('id', challenge_id)
        .eq('user_id', userId)
    }

    setImmediate(() => generateNextChallenge({
      userId,
      completedChallenge: { challenge_id, challenge_title, xp, tag, difficulty },
      characterState: { ...currentState, xp: newXp, level: newLevel },
    }))

    const levelUp = newLevel > oldLevel ? { new_level: newLevel, level_name: levelName } : null

    res.json({
      success: true,
      new_xp: newXp,
      level_up: levelUp,
      next_challenge_generating: true,
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/character/approach-update
router.post('/approach-update', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { level_index, delta } = req.body

    const { data: currentState } = await supabase.from('character_state')
      .select('*').eq('user_id', userId).single()

    const progress = [...(currentState.approach_progress || [0, 0, 0, 0])]
    if (level_index >= 0 && level_index < progress.length) {
      progress[level_index] = Math.max(0, (progress[level_index] || 0) + delta)
    }

    const newStats = { ...currentState.stats }
    if (newStats.social !== undefined) {
      newStats.social = Math.max(0, Math.min(100, newStats.social + (delta * 2)))
    }
    const newXp = Math.max(0, currentState.xp + (delta * 15))
    const { level: newLevel } = computeLevel(newXp)

    await supabase.from('character_state').update({
      approach_progress: progress,
      xp: newXp,
      level: newLevel,
      stats: newStats,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)

    res.json({
      new_progress: progress,
      new_xp: newXp,
      new_social_stat: newStats.social,
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/character/day-toggle
router.post('/day-toggle', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { day_index } = req.body

    const { data: currentState } = await supabase.from('character_state')
      .select('week_streak').eq('user_id', userId).single()

    const weekStreak = [...(currentState.week_streak || [false, false, false, false, false, false, false])]
    if (day_index >= 0 && day_index < 7) {
      weekStreak[day_index] = !weekStreak[day_index]
    }

    await supabase.from('character_state').update({
      week_streak: weekStreak,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)

    res.json({ new_week_streak: weekStreak })
  } catch (err) {
    next(err)
  }
})

export default router
