import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import { requireAuth } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'
import characterRouter from './routes/character.js'
import dopamineRouter from './routes/dopamine.js'
import coachRouter from './routes/coach.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'Motasem OS', timestamp: new Date() })
})

app.use('/api', requireAuth)
app.use('/api/character', characterRouter)
app.use('/api/dopamine', dopamineRouter)
app.use('/api/coach', coachRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Motasem OS API running on port ${PORT}`)
})
