import { Request, Response, NextFunction } from 'express'

export function authenticateCron(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return res.status(500).json({ error: 'Cron authentication not configured' })
  }

  const authHeader = req.headers.authorization
  const cronSecretHeader = req.headers['x-cron-secret']

  const providedSecret = 
    (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7)) ||
    cronSecretHeader

  if (providedSecret !== cronSecret) {
    return res.status(401).json({ error: 'Invalid cron secret' })
  }

  next()
}
