const PROVIDER = process.env.LLM_PROVIDER || 'anthropic'
const MODEL = process.env.LLM_MODEL || 'claude-sonnet-4-6'
const API_KEY = process.env.LLM_API_KEY

export async function callLLM({ systemPrompt, userPrompt, history = [], maxTokens = 500 }) {
  if (!API_KEY) {
    throw new Error('LLM_UNAVAILABLE')
  }

  try {
    if (PROVIDER === 'openai') {
      const messages = []
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content })
      }
      messages.push({ role: 'user', content: userPrompt })

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: maxTokens,
        }),
      })

      if (!res.ok) {
        throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`)
      }

      const data = await res.json()
      return data.choices[0].message.content
    }

    // Default: Anthropic
    const messages = []
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content })
    }
    messages.push({ role: 'user', content: userPrompt })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        system: systemPrompt,
        messages,
        max_tokens: maxTokens,
      }),
    })

    if (!res.ok) {
      throw new Error(`Anthropic API error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    return data.content[0].text
  } catch (err) {
    throw new Error('LLM_UNAVAILABLE')
  }
}
