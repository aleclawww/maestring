import pino from 'pino'

const redactedPaths = [
  'api_key',
  'apiKey',
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'headers.authorization',
  'headers.cookie',
]

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: redactedPaths,
    censor: '[REDACTED]',
  },
  // pino-pretty runs via thread-stream worker, which crashes on Windows
  // under Next.js dev (uncaughtException: "the worker has exited") and
  // takes down the whole request. Disable the transport entirely — plain
  // JSON lines in the terminal are fine for local dev. Set USE_PINO_PRETTY=1
  // to opt back in on macOS/Linux if you want the colorized output.
  transport:
    process.env.NODE_ENV !== 'production' && process.env['USE_PINO_PRETTY'] === '1'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  base: {
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version,
  },
})

export default logger
export { logger }
