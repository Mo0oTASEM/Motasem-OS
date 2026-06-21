import { supabase } from '../lib/supabase.js'

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = header.split(' ')[1]
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    req.user = { id: data.user.id, email: data.user.email }
    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}
