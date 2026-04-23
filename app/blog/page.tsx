import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllPosts, formatPublishedDate } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog — Guías AWS SAA-C03 y Estudio con IA',
  description:
    'Guías, planes de estudio y explicaciones profundas para aprobar AWS SAA-C03. Publicamos sobre cloud, certificaciones y aprendizaje efectivo con spaced repetition.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog de Maestring — AWS SAA-C03',
    description:
      'Guías profundas sobre AWS SAA-C03 y el método de estudio más efectivo con IA + FSRS.',
    type: 'website',
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
          <h1 className="mt-2 text-4xl font-bold">Guías AWS y métodos de estudio</h1>
          <p className="mt-4 text-text-secondary max-w-xl">
            Contenido profundo sobre AWS SAA-C03, spaced repetition, FSRS y cómo preparar
            certificaciones sin perder meses repasando lo que ya sabes.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-text-muted italic">Aún no hay artículos publicados. Vuelve pronto.</p>
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
                        <span>{p.frontmatter.readingMinutes} min lectura</span>
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
                    Leer artículo →
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
