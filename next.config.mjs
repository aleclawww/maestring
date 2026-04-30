import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't leak the framework name via the X-Powered-By response header.
  poweredByHeader: false,
  // Ensure HTTP compression is always on (it's the default, but explicit is better).
  compress: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  experimental: {
    mdxRs: true,
  },
  transpilePackages: ['react-email', '@react-email/components'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  webpack: (config, { isServer }) => {
    // Silence the noisy OpenTelemetry/require-in-the-middle warnings that
    // @sentry/nextjs pulls in. These are informational ("Critical dependency:
    // the request of a dependency is an expression") — they fire on every
    // server compile and obscure real issues. The underlying instrumentation
    // still works; webpack just can't statically analyze the dynamic require.
    if (isServer) {
      config.ignoreWarnings = [
        ...(config.ignoreWarnings ?? []),
        { module: /node_modules\/@opentelemetry\/instrumentation/ },
        { module: /node_modules\/require-in-the-middle/ },
      ]
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://app.posthog.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // img-src: enumerate known external image hosts rather than allowing all https:.
              // Mirrors the remotePatterns list above so <Image> and raw <img> tags
              // both stay within the same set of trusted origins.
              "img-src 'self' data: blob: https://*.supabase.co https://avatars.githubusercontent.com https://lh3.googleusercontent.com",
              // connect-src: includes Sentry ingest (org-specific subdomain pattern),
              // PostHog, Stripe, and Supabase REST + Realtime WebSocket endpoints.
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://app.posthog.com https://o*.ingest.sentry.io",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              "worker-src blob:",
            ].join('; '),
          },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ]
  },
}

// Only enable Sentry build-time integrations (source map upload) when credentials are present,
// so local dev and CI without SENTRY_AUTH_TOKEN still build cleanly.
const sentryEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT)

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig
