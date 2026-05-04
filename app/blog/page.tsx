import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Clock } from 'lucide-react'
import { getAllPosts, formatPublishedDate } from '@/lib/blog'
import { Nav, Footer } from '@/components/v2/marketing'
import { Eyebrow } from '@/components/v2'

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
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: 'Maestring Blog' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maestring Blog — AWS SAA-C03',
    description:
      'Deep-dive guides on AWS SAA-C03 and the most effective study method with AI + FSRS.',
    images: ['/og-image.png'],
  },
}

export const dynamic = 'force-static'
export const revalidate = 3600

export default async function BlogIndexPage() {
  const posts = await getAllPosts()

  return (
    <div className="theme-v2 flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
          <header className="mb-12">
            <Eyebrow>Blog</Eyebrow>
            <h1 className="v2-display mt-3 text-[40px] sm:text-[48px]">
              AWS guides &amp;{' '}
              <span className="v2-text-gradient">study methods.</span>
            </h1>
            <p className="mt-4 max-w-[560px] text-[16px] leading-[1.65] text-v2-foreground-muted">
              In-depth content on AWS SAA-C03, spaced repetition, FSRS, and how
              to prep for certifications without wasting months reviewing what
              you already know.
            </p>
          </header>

          {posts.length === 0 ? (
            <p className="italic text-v2-foreground-subtle">
              No posts published yet. Check back soon.
            </p>
          ) : (
            <div className="space-y-10">
              {posts.map((p) => (
                <article
                  key={p.slug}
                  className="border-b border-v2-border-subtle pb-10 last:border-0 last:pb-0"
                >
                  <Link href={`/blog/${p.slug}`} className="group block">
                    <div className="flex flex-wrap items-center gap-2 font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                      <time dateTime={p.frontmatter.publishedAt}>
                        {formatPublishedDate(p.frontmatter.publishedAt)}
                      </time>
                      {p.frontmatter.readingMinutes && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" strokeWidth={2.25} />
                            {p.frontmatter.readingMinutes} min read
                          </span>
                        </>
                      )}
                      {p.frontmatter.tags.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-v2-brand-soft px-1.5 py-0.5 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-brand"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <h2 className="mt-3 text-[26px] font-bold leading-[1.25] tracking-v2-tight text-v2-foreground transition-colors group-hover:text-v2-brand sm:text-[28px]">
                      {p.frontmatter.title}
                    </h2>
                    <p className="mt-2 text-[15px] leading-[1.65] text-v2-foreground-muted">
                      {p.frontmatter.description}
                    </p>
                    <p className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-v2-brand">
                      Read article
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform duration-200 ease-v2 group-hover:translate-x-1"
                        strokeWidth={2.5}
                      />
                    </p>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
