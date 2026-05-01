import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import {
  canonicalUrl,
  formatPublishedDate,
  getAllPosts,
  getPostBySlug,
} from '@/lib/blog'
import { mdxComponents } from '@/components/blog/mdx'

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
  const og = ogImage ?? `/api/og?title=${encodeURIComponent(title)}&badge=Blog+%C2%B7+AWS+SAA-C03`
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
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <article className="mx-auto max-w-3xl px-6 py-16">
        <nav className="mb-8 text-xs text-text-muted">
          <Link href="/blog" className="hover:text-primary">
            ← Back to blog
          </Link>
        </nav>

        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <time dateTime={frontmatter.publishedAt}>
              {formatPublishedDate(frontmatter.publishedAt)}
            </time>
            {frontmatter.readingMinutes && (
              <>
                <span>·</span>
                <span>{frontmatter.readingMinutes} min read</span>
              </>
            )}
            {frontmatter.tags.map(t => (
              <span
                key={t}
                className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-text-muted"
              >
                {t}
              </span>
            ))}
          </div>
          <h1 className="mt-3 text-4xl font-bold leading-tight">{frontmatter.title}</h1>
          <p className="mt-4 text-lg text-text-secondary leading-relaxed">
            {frontmatter.description}
          </p>
        </header>

        <div className="prose-invert">
          <MDXRemote source={content} components={mdxComponents} />
        </div>

        <aside className="mt-16 rounded-xl border border-primary/40 bg-primary/5 p-6">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
            Ready to know when you&apos;ll pass?
          </p>
          <h2 className="text-xl font-bold">
            Your Readiness Score starts tracking from session one.
          </h2>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            Maestring computes your pass probability across all SAA-C03 objectives using FSRS-4.5 spaced repetition.
            When the score hits 82+, book the exam. Until then, it tells you exactly where to focus.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row items-start gap-3">
            <Link
              href="/signup"
              className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              See my Readiness Score — free →
            </Link>
            <Link
              href="/pricing"
              className="inline-block rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              View pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-text-muted">7 days of Pro free — no card required.</p>
        </aside>
      </article>
    </div>
  )
}
