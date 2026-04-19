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
  transport:
    process.env.NODE_ENV !== 'production'
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
