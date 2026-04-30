import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getPostBySlug } from '@/lib/blog'

export const runtime = 'nodejs'

// Belt-and-suspenders slug validation at this call site, even though
// getPostBySlug() also validates internally via SAFE_SLUG_RE.
// Keeps the guard visible here so future callers of getPostBySlug()
// don't accidentally skip it and expose the filesystem path-join.
const SAFE_SLUG_RE = /^[a-z0-9-]+$/

export async function GET(req: NextRequest) {
  const rawSlug = req.nextUrl.searchParams.get('slug')
  const slug = rawSlug && SAFE_SLUG_RE.test(rawSlug) ? rawSlug : null

  let title = 'Maestring — AWS SAA-C03'
  let tags: string[] = []
  if (slug) {
    const post = await getPostBySlug(slug)
    if (post) {
      title = post.frontmatter.title
      tags = post.frontmatter.tags.slice(0, 3)
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)',
          padding: '60px 70px',
          color: '#e7e9f0',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 800,
              color: 'white',
            }}
          >
            M
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>Maestring</div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            maxWidth: 1020,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              color: 'white',
            }}
          >
            {title}
          </div>
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: 10 }}>
              {tags.map(t => (
                <div
                  key={t}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'rgba(99, 102, 241, 0.18)',
                    color: '#a5b4fc',
                    fontSize: 20,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 1.4,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 22,
            color: '#9ca3af',
          }}
        >
          <div>AWS SAA-C03 · AI + Spaced Repetition</div>
          <div style={{ color: '#818cf8', fontWeight: 600 }}>maestring.com</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
