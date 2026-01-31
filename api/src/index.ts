import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import groupsRouter from './routes/groups.js'
import invitesRouter from './routes/invites.js'
import cronRouter from './routes/cron.js'
import questionSetsRouter from './routes/questionSets.js'
import usersRouter from './routes/users.js'
import conversationsWebhookRouter from './routes/conversationsWebhook.js'

config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use('/groups', groupsRouter)
app.use('/invites', invitesRouter)
app.use('/cron', cronRouter)
app.use('/question-sets', questionSetsRouter)
app.use('/users', usersRouter)
app.use('/twilio', conversationsWebhookRouter)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
})
