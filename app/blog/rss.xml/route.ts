import { getAllPosts } from '@/lib/blog'

export const revalidate = 3600

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const base = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://maestring.com'
  const posts = await getAllPosts()

  const items = posts
    .map(p => {
      const url = `${base}/blog/${p.slug}`
      const pubDate = new Date(p.frontmatter.publishedAt + 'T00:00:00Z').toUTCString()
      return `    <item>
      <title>${escapeXml(p.frontmatter.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(p.frontmatter.description)}</description>
      <pubDate>${pubDate}</pubDate>
      ${p.frontmatter.tags.map(t => `<category>${escapeXml(t)}</category>`).join('')}
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Maestring — Blog</title>
    <link>${base}/blog</link>
    <description>Guías profundas sobre AWS SAA-C03 y estudio efectivo con IA + FSRS.</description>
    <language>es-ES</language>
    <atom:link href="${base}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
