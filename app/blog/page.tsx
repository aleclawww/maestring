import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllPosts, formatPublishedDate } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog — AWS SAA-C03 Guides & AI Study Methods',
  description:
    'In-depth guides, study plans, and walkthroughs for passing AWS SAA-C03. We cover cloud, certifications, and effective learning with spaced repetition.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Maestring Blog — AWS SAA-C03',
    description:
      'Deep-dive guides on AWS SAA-C03 and the most effective study method with AI + FSRS.',
    type: 'website',
    url: 'https://maestring.com/blog',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Maestring Blog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maestring Blog — AWS SAA-C03',
    description: 'Deep-dive guides on AWS SAA-C03 and the most effective study method with AI + FSRS.',
    images: ['/og-image.png'],
  },
}

export const dynamic = 'force-static'
export const revalidate = 3600

export default async function BlogIndexPage() {
  const posts = await getAllPosts()

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold">Blog</p>
          <h1 className="mt-2 text-4xl font-bold">AWS guides &amp; study methods</h1>
          <p className="mt-4 text-text-secondary max-w-xl">
            In-depth content on AWS SAA-C03, spaced repetition, FSRS, and how to prep for
            certifications without wasting months reviewing what you already know.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-text-muted italic">No posts published yet. Check back soon.</p>
        ) : (
          <div className="space-y-8">
            {posts.map(p => (
              <article
                key={p.slug}
                className="border-b border-border pb-8 last:border-0 last:pb-0"
              >
                <Link href={`/blog/${p.slug}`} className="group">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <time dateTime={p.frontmatter.publishedAt}>
                      {formatPublishedDate(p.frontmatter.publishedAt)}
                    </time>
                    {p.frontmatter.readingMinutes && (
                      <>
                        <span>·</span>
                        <span>{p.frontmatter.readingMinutes} min read</span>
                      </>
                    )}
                    {p.frontmatter.tags.slice(0, 2).map(t => (
                      <span
                        key={t}
                        className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-text-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-text-primary group-hover:text-primary transition-colors">
                    {p.frontmatter.title}
                  </h2>
                  <p className="mt-2 text-text-secondary leading-relaxed">
                    {p.frontmatter.description}
                  </p>
                  <p className="mt-3 text-sm text-primary font-medium">
                    Read article →
                  </p>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
