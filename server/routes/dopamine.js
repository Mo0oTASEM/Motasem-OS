import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

const MILESTONES = [3, 7, 14, 30, 60, 90]

const MILESTONE_LABELS = {
  3: 'Third day. The hardest hump is behind you.',
  7: 'One week clean. Dopamine reset begins.',
  14: 'Two weeks. Mental clarity is sharpening.',
  30: 'Thirty days. The neural pathways are rewiring.',
  60: 'Sixty days. The old urges are background noise now.',
  90: 'Ninety days. The neurological reset is nearly complete.',
}

const BENEFITS_TIMELINE = [
  { day: 1,  title: 'Dopamine receptors begin recovering',  detail: 'Your brain starts upregulating receptors dulled by overstimulation.' },
  { day: 3,  title: 'Motivation chemicals stabilize',       detail: 'The flatline dip ends. Baseline drive starts returning.' },
  { day: 7,  title: 'Mental clarity improves noticeably',   detail: 'Focus during deep work increases measurably. Brain fog lifts.' },
  { day: 14, title: 'Baseline energy increases',            detail: 'Physical energy and mood regulation begin to normalize.' },
  { day: 30, title: 'Confidence and social ease shift',     detail: 'Eye contact holds longer. Conversation feels less effortful.' },
  { day: 60, title: 'Identity begins to shift',             detail: 'The old pattern is no longer your default. The new one is.' },
  { day: 90, title: 'Neurological reset near complete',     detail: 'Reward pathway sensitivity is largely restored.' },
]

function milestoneLabel(days) {
  return MILESTONE_LABELS[days] || `${days} day milestone`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// GET /api/dopamine/state
router.get('/state', async (req, res, next) => {
  try {
    const userId = req.user.id

    const { data: dopamine } = await supabase
      .from('character_dopamine')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (!dopamine) {
      const { data: inserted } = await supabase
        .from('character_dopamine')
        .insert({
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          last_checkin_date: null,
          relapse_log: [],
        })
        .select()
        .single()

      return res.json({
        dopamine: {
          currentStreak: 0,
          longestStreak: 0,
          lastCheckinDate: null,
          relapseLog: [],
        },
        badges: MILESTONES.map(days => ({
          days,
          earned: false,
          label: milestoneLabel(days),
        })),
        benefits: BENEFITS_TIMELINE.map(item => ({
          ...item,
          unlocked: false,
        })),
      })
    }

    const streak = dopamine.current_streak || 0
    const longest = dopamine.longest_streak || 0

    const badges = MILESTONES.map(days => ({
      days,
      earned: streak >= days || longest >= days,
      label: milestoneLabel(days),
    }))

    const benefits = BENEFITS_TIMELINE.map(item => ({
      ...item,
      unlocked: streak >= item.day,
    }))

    res.json({
      dopamine: {
        currentStreak: streak,
        longestStreak: longest,
        lastCheckinDate: dopamine.last_checkin_date,
        relapseLog: dopamine.relapse_log || [],
      },
      badges,
      benefits,
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/dopamine/checkin
router.post('/checkin', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { held } = req.body
    const today = todayISO()

    const { data: dopamine } = await supabase
      .from('character_dopamine')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (held) {
      if (dopamine.last_checkin_date === today) {
        return res.status(409).json({ error: 'Already checked in today' })
      }

      let newStreak = 1
      const lastDate = dopamine.last_checkin_date

      if (!lastDate) {
        newStreak = 1
      } else {
        const last = new Date(lastDate + 'T00:00:00')
        const now = new Date(today + 'T00:00:00')
        const gap = Math.round((now - last) / (1000 * 60 * 60 * 24))
        if (gap === 1) {
          newStreak = (dopamine.current_streak || 0) + 1
        } else {
          newStreak = 1
        }
      }

      const newLongest = Math.max(dopamine.longest_streak || 0, newStreak)

      await supabase.from('character_dopamine').update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_checkin_date: today,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId)

      const { data: charState } = await supabase
        .from('character_state')
        .select('*')
        .eq('user_id', userId)
        .single()

      const newStats = { ...charState.stats }
      if (newStats.discipline !== undefined) {
        newStats.discipline = Math.min(100, newStats.discipline + 1)
      }
      if (newStats.frame !== undefined) {
        newStats.frame = Math.min(100, newStats.frame + 1)
      }

      await supabase.from('character_state').update({
        xp: charState.xp + 25,
        stats: newStats,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId)

      let milestoneUnlocked = null
      if (MILESTONES.includes(newStreak)) {
        milestoneUnlocked = { days: newStreak, label: milestoneLabel(newStreak) }
      }

      return res.json({
        new_streak: newStreak,
        xp_awarded: 25,
        milestone_unlocked: milestoneUnlocked,
      })
    }

    // held === false
    const streakBeforeReset = dopamine.current_streak || 0
    const newLongest = Math.max(dopamine.longest_streak || 0, streakBeforeReset)

    await supabase.from('character_dopamine').update({
      current_streak: 0,
      longest_streak: newLongest,
      last_checkin_date: today,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)

    await supabase.rpc('deduct_xp', { p_user_id: userId, p_amount: 50 }).catch(async () => {
      const { data: cs } = await supabase.from('character_state').select('xp').eq('user_id', userId).single()
      await supabase.from('character_state').update({
        xp: Math.max(0, (cs?.xp || 0) - 50),
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId)
    })

    return res.json({
      streak_reset: true,
      xp_deducted: 50,
      message: 'Day 1. The reset is not failure. Staying down is.',
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/dopamine/relapse-journal
router.post('/relapse-journal', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { entry } = req.body

    const { data: dopamine } = await supabase
      .from('character_dopamine')
      .select('relapse_log, current_streak')
      .eq('user_id', userId)
      .single()

    const log = [...(dopamine.relapse_log || [])]
    log.unshift({
      text: entry,
      date: todayISO(),
      streak_at_reset: dopamine.current_streak || 0,
    })

    const trimmed = log.slice(0, 10)

    await supabase.from('character_dopamine').update({
      relapse_log: trimmed,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)

    res.json({
      saved: true,
      total_entries: trimmed.length,
    })
  } catch (err) {
    next(err)
  }
})

export default router
