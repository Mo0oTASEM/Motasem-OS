export function errorHandler(err, req, res, _next) {
  console.error(`[${new Date().toISOString()}] ${err.stack || err.message}`)
  res.status(500).json({ error: 'Internal server error' })
}
