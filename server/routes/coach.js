import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { callLLM } from '../lib/llm.js'

const router = Router()

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

function computeLevelName(xp) {
  let name = 'Novice'
  for (const t of LEVEL_THRESHOLDS) {
    if (xp >= t.xp) name = t.name
    else break
  }
  return name
}

router.post('/message', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { message, history = [] } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const [stateResult, habitResult, dopamineResult] = await Promise.all([
      supabase.from('character_state').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('character_habit_logs').select('*').eq('user_id', userId).eq('date', new Date().toISOString().slice(0, 10)),
      supabase.from('character_dopamine').select('*').eq('user_id', userId).maybeSingle(),
    ])

    const characterState = stateResult.data
    const todayLogs = habitResult.data || []
    const dopamine = dopamineResult.data

    if (!characterState) {
      return res.status(404).json({ error: 'Character state not found. Open the Character tab first.' })
    }

    const stats = characterState.stats || {}
    const statEntries = Object.entries(stats)
    const weakest = statEntries.length ? statEntries.reduce((a, b) => (a[1] < b[1] ? a : b)) : ['unknown', 0]
    const levelName = computeLevelName(characterState.xp || 0)

    const todayHabitNames = todayLogs
      .filter(log => log.completed)
      .map(log => log.habit_name || log.habit_id)
    const habitsStr = todayHabitNames.length ? todayHabitNames.join(', ') : 'none yet'

    const systemPrompt = `You are the AI brain of Motasem OS — a personal development operating system built for one person: the user.
You have full access to their current state. Speak in second person. Be direct. No padding, no empty validation.
Max 3 sentences per response unless a longer answer is genuinely needed.
Never use bullet points unless the user explicitly asks for a list.
Always end with one concrete action the user can take in the next 10 minutes.
Current user state:
- Level: ${levelName} (${characterState.xp || 0} XP)
- Stats: ${JSON.stringify(stats)}
- Weakest stat: ${weakest[0]} at ${weakest[1]}/100
- Today's completed habits: ${habitsStr}
- Dopamine streak: ${dopamine?.current_streak || 0} days`

    const reply = await callLLM({
      systemPrompt,
      userPrompt: message,
      history,
    })

    res.json({ reply })
  } catch (err) {
    if (err.message === 'LLM_UNAVAILABLE') {
      return res.status(503).json({ error: 'AI provider not configured. Set LLM_API_KEY.' })
    }
    next(err)
  }
})

export default router
