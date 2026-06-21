import { supabase } from '../lib/supabase.js'

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Boss']

const BACKUP_CHALLENGES = {
  social: [
    { title: 'Cold Outreach ×3', description: 'Initiate three conversations with strangers today — in person or via DM.', tag: 'social', xp: 40, difficulty: 'Hard', rationale: 'Social momentum compounds fastest when you push past the initial resistance.' },
    { title: 'Active Listening Drill', description: 'In your next conversation, ask 5 follow-up questions without mentioning yourself once.', tag: 'social', xp: 25, difficulty: 'Medium', rationale: 'Listening is the highest-leverage social skill.' },
    { title: 'Group Host', description: 'Organize and host a small gathering (3+ people) this week.', tag: 'social', xp: 50, difficulty: 'Boss', rationale: 'Leadership in social settings builds frame faster than anything else.' },
    { title: 'Compliment Chain', description: 'Give 5 genuine compliments to different people today.', tag: 'social', xp: 20, difficulty: 'Easy', rationale: 'Giving value first is the hallmark of high social intelligence.' },
  ],
  physique: [
    { title: 'Double Session', description: 'Complete two workouts today — morning and evening.', tag: 'physique', xp: 45, difficulty: 'Hard', rationale: 'Doubling volume shocks the system and builds mental toughness.' },
    { title: 'Cold Exposure', description: 'End your shower cold for 2 full minutes today.', tag: 'physique', xp: 25, difficulty: 'Medium', rationale: 'Cold exposure builds discipline that transfers to every area of life.' },
    { title: 'Movement Every Hour', description: 'Do 5 minutes of movement every hour during your workday.', tag: 'physique', xp: 30, difficulty: 'Hard', rationale: 'Consistency across the day beats a single spike.' },
    { title: 'Nature Walk', description: 'Walk 30 minutes outside without headphones.', tag: 'physique', xp: 15, difficulty: 'Easy', rationale: 'Low barrier, high return — fresh air resets your nervous system.' },
  ],
  discipline: [
    { title: 'Early Bird', description: 'Wake up at 5 AM and complete your most important task before 7 AM.', tag: 'discipline', xp: 35, difficulty: 'Hard', rationale: 'Morning wins set the tone for the entire day.' },
    { title: 'No Distraction Block', description: 'Work 90 minutes straight with zero phone or tab switching.', tag: 'discipline', xp: 25, difficulty: 'Medium', rationale: 'Deep work is the real differentiator in a distracted world.' },
    { title: 'Perfect Morning Routine', description: 'Complete your full morning routine without skipping a single step.', tag: 'discipline', xp: 20, difficulty: 'Easy', rationale: 'Small wins early create momentum for harder decisions later.' },
    { title: 'Digital Sunset', description: 'No screens after 9 PM tonight.', tag: 'discipline', xp: 30, difficulty: 'Medium', rationale: 'Evening discipline directly affects next-day energy and focus.' },
  ],
  presence: [
    { title: 'Silent Hour', description: 'Spend one hour in complete silence — no music, no talking, no screens.', tag: 'presence', xp: 35, difficulty: 'Hard', rationale: 'Stillness is the foundation of presence.' },
    { title: 'One-Task Morning', description: 'Do your first 60 minutes of work on a single task — no switching.', tag: 'presence', xp: 25, difficulty: 'Medium', rationale: 'Monotasking is a superpower in the age of distraction.' },
    { title: 'Gratitude Pause', description: 'Before each meal, pause 10 seconds and notice three things you see.', tag: 'presence', xp: 15, difficulty: 'Easy', rationale: 'Anchoring presence to existing habits makes it stick.' },
    { title: 'No Phone During Conversations', description: 'Keep your phone completely out of sight during every conversation today.', tag: 'presence', xp: 30, difficulty: 'Medium', rationale: 'Undivided attention is the most respectful gift you can give.' },
  ],
  craft: [
    { title: 'Ship Something', description: 'Finish and publish/share one thing you have been procrastinating on.', tag: 'craft', xp: 40, difficulty: 'Hard', rationale: 'Shipping beats perfection every time.' },
    { title: 'Study a Master', description: 'Analyze one piece of work from the best in your field for 30 minutes.', tag: 'craft', xp: 25, difficulty: 'Medium', rationale: 'Studying mastery accelerates your own growth curve.' },
    { title: 'Daily Practice Block', description: 'Dedicate 45 minutes to deliberate practice on your craft today.', tag: 'craft', xp: 20, difficulty: 'Easy', rationale: 'Consistent deliberate practice compounds faster than sporadic bursts.' },
    { title: 'Teach a Skill', description: 'Spend 20 minutes teaching someone a skill you know well.', tag: 'craft', xp: 30, difficulty: 'Medium', rationale: 'Teaching forces clarity and reveals gaps in your own understanding.' },
  ],
  frame: [
    { title: 'Stand Your Ground', description: 'Hold your position in a disagreement without backing down or escalating.', tag: 'frame', xp: 35, difficulty: 'Hard', rationale: 'Frame is forged in tension, not comfort.' },
    { title: 'Value First', description: 'In your next interaction, give a compliment or offer help before asking for anything.', tag: 'frame', xp: 20, difficulty: 'Easy', rationale: 'Leading with value signals high frame.' },
    { title: 'No Justification Day', description: 'Do not justify or over-explain any decision you make today.', tag: 'frame', xp: 30, difficulty: 'Medium', rationale: 'Over-explaining weakens frame. Say what you mean without apology.' },
    { title: 'Hold Eye Contact', description: 'Maintain eye contact 2 seconds longer than usual in every conversation today.', tag: 'frame', xp: 25, difficulty: 'Medium', rationale: 'Eye contact is the most direct frame anchor there is.' },
  ],
  general: [
    { title: 'Win the Morning', description: 'Complete your top 3 priorities before noon.', tag: 'general', xp: 30, difficulty: 'Medium', rationale: 'How you start determines how you finish.' },
    { title: 'No Complaints', description: 'Go 24 hours without a single complaint — verbal or mental.', tag: 'general', xp: 35, difficulty: 'Hard', rationale: 'Complaints drain energy. Eliminating them builds mental toughness.' },
    { title: 'Read 20 Pages', description: 'Read 20 pages of a non-fiction book today.', tag: 'general', xp: 15, difficulty: 'Easy', rationale: 'Small daily reading compounds into serious knowledge.' },
    { title: 'End the Day Right', description: 'Write down 3 things you did well today before bed.', tag: 'general', xp: 15, difficulty: 'Easy', rationale: 'Ending with reflection reinforces growth.' },
  ],
}

function getBackupChallenge(tag) {
  const pool = BACKUP_CHALLENGES[tag] || BACKUP_CHALLENGES.general
  const idx = Math.floor(Math.random() * pool.length)
  return pool[idx]
}

export async function generateNextChallenge({ userId, completedChallenge, characterState }) {
  try {
    const tag = completedChallenge.tag || 'general'
    const parentXp = completedChallenge.xp || 20
    const parentDifficulty = completedChallenge.difficulty || 'Easy'

    const { count: pendingCount } = await supabase
      .from('character_ai_challenges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('tag', tag)
      .eq('is_completed', false)

    if (pendingCount >= 5) {
      return
    }

    const { data: history } = await supabase
      .from('character_challenge_completions')
      .select('challenge_title, challenge_id')
      .eq('user_id', userId)
      .eq('tag', tag)
      .order('completed_at', { ascending: false })
      .limit(3)

    const historyTitles = history ? history.map(h => h.challenge_title || h.challenge_id) : []

    const weakestStat = findWeakestStat(characterState.stats)

    const systemPrompt = `You generate the next challenge for a user's personal OS called Motasem OS.
Rules you must follow:
- Return ONLY valid JSON. No explanation, no markdown, just the JSON object.
- The new challenge must be strictly harder than the completed one.
- XP must be at least 20% higher than the parent challenge XP (${parentXp}).
- Difficulty must be equal to or harder than: ${parentDifficulty}.
- The completion condition must be specific and measurable.
- Never repeat any challenge from the history list.
- The rationale field must be one sentence explaining why this is right for a user whose ${weakestStat ? weakestStat.name : 'stats'} stat is their weakest at ${weakestStat ? weakestStat.value : '?'}/100.
- Tag must be exactly: ${tag}`

    const userMessage = `Completed: ${JSON.stringify(completedChallenge)}
Stats: ${JSON.stringify(characterState.stats)}
History to avoid: ${JSON.stringify(historyTitles)}`

    const { callLLM } = await import('../lib/llm.js')

    let parsed = null
    let attempts = 0
    while (attempts < 2 && !parsed) {
      attempts++
      try {
        const raw = await callLLM({ systemPrompt, userPrompt: userMessage, maxTokens: 600 })
        const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch {
        if (attempts >= 2) {
          const backup = getBackupChallenge(tag)
          await supabase.from('character_ai_challenges').insert({
            user_id: userId,
            title: backup.title,
            description: backup.description,
            tag: backup.tag,
            xp: backup.xp,
            difficulty: backup.difficulty,
            rationale: backup.rationale,
            parent_challenge_id: completedChallenge.challenge_id,
          })
          return
        }
      }
    }

    if (!parsed) {
      const backup = getBackupChallenge(tag)
      await supabase.from('character_ai_challenges').insert({
        user_id: userId,
        title: backup.title,
        description: backup.description,
        tag: backup.tag,
        xp: backup.xp,
        difficulty: backup.difficulty,
        rationale: backup.rationale,
        parent_challenge_id: completedChallenge.challenge_id,
      })
      return
    }

    const validated = {
      title: typeof parsed.title === 'string' && parsed.title.trim().length > 0 ? parsed.title.trim() : null,
      description: typeof parsed.description === 'string' && parsed.description.trim().length > 0 ? parsed.description.trim() : null,
      tag: typeof parsed.tag === 'string' ? parsed.tag.trim() : tag,
      xp: typeof parsed.xp === 'number' && parsed.xp > 0 ? parsed.xp : Math.round(parentXp * 1.2),
      difficulty: VALID_DIFFICULTIES.includes(parsed.difficulty) ? parsed.difficulty : parentDifficulty === 'Boss' ? 'Boss' : ['Easy', 'Medium', 'Hard', 'Boss'][Math.min(['Easy', 'Medium', 'Hard', 'Boss'].indexOf(parentDifficulty) + 1, 3)],
      rationale: typeof parsed.rationale === 'string' && parsed.rationale.trim().length > 0 ? parsed.rationale.trim() : `Challenge to build ${tag} skills.`,
    }

    if (!validated.title || !validated.description) {
      const backup = getBackupChallenge(tag)
      await supabase.from('character_ai_challenges').insert({
        user_id: userId,
        title: backup.title,
        description: backup.description,
        tag: backup.tag,
        xp: backup.xp,
        difficulty: backup.difficulty,
        rationale: backup.rationale,
        parent_challenge_id: completedChallenge.challenge_id,
      })
      return
    }

    await supabase.from('character_ai_challenges').insert({
      user_id: userId,
      title: validated.title,
      description: validated.description,
      tag: validated.tag,
      xp: validated.xp,
      difficulty: validated.difficulty,
      rationale: validated.rationale,
      parent_challenge_id: completedChallenge.challenge_id,
    })
  } catch (err) {
    console.error('generateNextChallenge error:', err.message)
  }
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
