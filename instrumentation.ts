export async function register() {
  // Validate all required env vars at server startup so misconfigured
  // deployments fail immediately with a clear message rather than surfacing
  // a cryptic runtime error on the first request that needs the missing var.
  // Edge runtime doesn't have access to the same secret vars (they're
  // Node-only), so only validate in the nodejs runtime.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env')
    validateEnv()
    await import('./sentry.server.config')
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
