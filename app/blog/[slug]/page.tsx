import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { ArrowLeft, ArrowRight, Clock, Sparkles } from 'lucide-react'
import {
  canonicalUrl,
  formatPublishedDate,
  getAllPosts,
  getPostBySlug,
} from '@/lib/blog'
import { mdxComponents } from '@/components/blog/mdx'
import { Nav, Footer } from '@/components/v2/marketing'

// JSON.stringify does NOT escape `</script>`, so a frontmatter title containing
// `</script><script>alert(1)</script>` would break out of the JSON-LD context
// and execute as a script. Replacing `<` with its Unicode escape fixes this
// without affecting JSON parsers (both < and < decode identically).
function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}

export const dynamicParams = false
export const revalidate = 3600

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = await getPostBySlug(params.slug)
  if (!post) return { title: 'Post not found' }
  const { title, description, publishedAt, updatedAt, ogImage, tags } = post.frontmatter
  const canonical = canonicalUrl(params.slug)
  const og = ogImage ?? `/api/og/blog?slug=${encodeURIComponent(params.slug)}`
  return {
    title,
    description,
    keywords: tags,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title,
      description,
      publishedTime: publishedAt,
      modifiedTime: updatedAt ?? publishedAt,
      images: [{ url: og, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [og],
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string }
}) {
  const post = await getPostBySlug(params.slug)
  if (!post) notFound()
  const { frontmatter, content } = post
  const canonical = canonicalUrl(params.slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: frontmatter.title,
    description: frontmatter.description,
    datePublished: frontmatter.publishedAt,
    dateModified: frontmatter.updatedAt ?? frontmatter.publishedAt,
    author: { '@type': 'Organization', name: frontmatter.author },
    publisher: {
      '@type': 'Organization',
      name: 'Maestring',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://maestring.com'}/og-image.png`,
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    keywords: frontmatter.tags.join(', '),
  }

  return (
    <div className="theme-v2 flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <Nav />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
          <nav className="mb-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-v2-foreground-muted transition-colors hover:text-v2-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
              Back to blog
            </Link>
          </nav>

          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-2 font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
              <time dateTime={frontmatter.publishedAt}>
                {formatPublishedDate(frontmatter.publishedAt)}
              </time>
              {frontmatter.readingMinutes && (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" strokeWidth={2.25} />
                    {frontmatter.readingMinutes} min read
                  </span>
                </>
              )}
              {frontmatter.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-v2-brand-soft px-1.5 py-0.5 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-brand"
                >
                  {t}
                </span>
              ))}
            </div>
            <h1 className="v2-display mt-4 text-[36px] leading-[1.15] sm:text-[44px]">
              {frontmatter.title}
            </h1>
            <p className="mt-4 text-[18px] leading-[1.65] text-v2-foreground-muted">
              {frontmatter.description}
            </p>
          </header>

          <div className="prose-blog">
            <MDXRemote source={content} components={mdxComponents} />
          </div>

          <aside className="mt-16 overflow-hidden rounded-2xl border border-v2-brand/30 bg-v2-brand-soft/40 p-6 shadow-v2-soft sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-v2-gradient-brand text-white shadow-v2-button">
                <Sparkles className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-brand">
                  Try Maestring
                </p>
                <h2 className="mt-2 text-[20px] font-bold text-v2-foreground">
                  Pass AWS SAA-C03 in less time
                </h2>
                <p className="mt-2 text-[14px] leading-[1.6] text-v2-foreground-muted">
                  AI-generated questions targeting your real weak spots + FSRS
                  spaced repetition. Don't memorize — understand.
                </p>
                <Link
                  href="/signup"
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-v2-gradient-brand px-4 text-[13px] font-semibold text-white shadow-v2-button transition-all hover:-translate-y-0.5 hover:shadow-v2-elevated"
                >
                  Start for free
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Link>
              </div>
            </div>
          </aside>
        </article>
      </main>
      <Footer />
    </div>
  )
}
