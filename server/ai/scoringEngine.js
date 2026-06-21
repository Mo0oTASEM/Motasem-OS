import { supabase } from '../lib/supabase.js'

export async function scoreHabitCompletion({ user_id, habit, todayLogs, characterState }) {
  const today = new Date().toISOString().slice(0, 10)
  const baseXp = habit.xp || 10
  const multipliersApplied = []

  let streak = 0
  try {
    const { data: pastLogs } = await supabase
      .from('character_habit_logs')
      .select('logged_date')
      .eq('user_id', user_id)
      .eq('habit_id', habit.habit_id)
      .lt('logged_date', today)
      .order('logged_date', { ascending: false })
      .limit(30)

    if (pastLogs) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - 1)
      for (const log of pastLogs) {
        const logDate = new Date(log.logged_date + 'T00:00:00')
        const diff = (checkDate - logDate) / (1000 * 60 * 60 * 24)
        if (Math.abs(diff) < 1) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
    }
  } catch {
    streak = 0
  }

  let multiplier = 1.0
  if (streak >= 14) { multiplier = 1.5; multipliersApplied.push('streak_14+') }
  else if (streak >= 7) { multiplier = 1.25; multipliersApplied.push('streak_7_13') }
  else if (streak >= 3) { multiplier = 1.1; multipliersApplied.push('streak_3_6') }
  else { multipliersApplied.push('streak_0_2') }

  let bonuses = 0
  if (todayLogs && todayLogs.length >= 3) {
    bonuses += 10
    multipliersApplied.push('momentum_+3')
  }

  const weakestStat = findWeakestStat(characterState.stats)
  if (weakestStat && habit.stat === weakestStat.name) {
    bonuses += 15
    multipliersApplied.push('weakness_amplifier')
  }

  const finalXp = Math.min(baseXp * 2, Math.round(baseXp * multiplier) + bonuses)
  const statDelta = habit.is_never_do ? -1 : 1

  return { final_xp: finalXp, stat_delta: statDelta, multipliers_applied: multipliersApplied }
}

function findWeakestStat(stats) {
  if (!stats) return null
  let minName = null
  let minVal = Infinity
  for (const [key, val] of Object.entries(stats)) {
    if (val < minVal) { minVal = val; minName = key }
  }
  return minName ? { name: minName, value: minVal } : null
}

export async function generateDailyInsight({ user_id, characterState, todayLogs, dopamineStreak }) {
  const today = new Date().toISOString().slice(0, 10)

  const { data: cached } = await supabase
    .from('character_coaching_cache')
    .select('daily_brief')
    .eq('user_id', user_id)
    .eq('cache_date', today)
    .maybeSingle()

  if (cached && cached.daily_brief) {
    return { brief: cached.daily_brief, cached: true }
  }

  const weakest = findWeakestStat(characterState.stats)
  const habitNames = todayLogs && todayLogs.length > 0
    ? todayLogs.map(l => l.habit_name || l.habit_id).join(', ')
    : 'nothing yet'

  const levelName = characterState.level_name || `Level ${characterState.level}`

  const systemPrompt = 'You are the internal voice of Motasem OS — a personal development system. Speak directly to the user in second person. Max 3 sentences. No generic motivation. Reference the specific numbers and names below. Be precise and honest.'

  const userMessage = `User: Level ${levelName}, ${characterState.xp} XP. Weakest stat: ${weakest ? `${weakest.name} at ${weakest.value}/100` : 'N/A'}. Today completed: ${habitNames}. Dopamine streak: ${dopamineStreak} days. Give them their morning brief.`

  let brief = ''
  try {
    const { callLLM } = await import('../lib/llm.js')
    brief = await callLLM({ systemPrompt, userPrompt: userMessage, maxTokens: 300 })
  } catch {
    brief = `Day ${dopamineStreak}. ${weakest ? `${weakest.name} needs work at ${weakest.value}/100.` : ''} Keep going.`
  }

  try {
    await supabase.from('character_coaching_cache').insert({
      user_id,
      cache_date: today,
      daily_brief: brief,
    })
  } catch {
    // Cache insert failed — daily brief still returns
  }

  return { brief, cached: false }
}
