import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

const FrontmatterSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(40).max(200),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  updatedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  author: z.string().default('Maestring Team'),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  readingMinutes: z.number().int().min(1).max(60).optional(),
  ogImage: z.string().optional(),
  draft: z.boolean().default(false),
})

export type BlogFrontmatter = z.infer<typeof FrontmatterSchema>

export type BlogPost = {
  slug: string
  frontmatter: BlogFrontmatter
  content: string
}

export type BlogPostMeta = {
  slug: string
  frontmatter: BlogFrontmatter
}

function estimateReadingMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 220))
}

async function readRaw(slug: string): Promise<BlogPost | null> {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)
  try {
    const source = await fs.readFile(filePath, 'utf8')
    const parsed = matter(source)
    const fm = FrontmatterSchema.parse({
      ...parsed.data,
      readingMinutes: parsed.data['readingMinutes'] ?? estimateReadingMinutes(parsed.content),
    })
    return { slug, frontmatter: fm, content: parsed.content }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

export async function getAllPosts(): Promise<BlogPostMeta[]> {
  let entries: string[]
  try {
    entries = await fs.readdir(BLOG_DIR)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
  const includeDrafts = process.env['NODE_ENV'] !== 'production'
  const posts = await Promise.all(
    entries
      .filter(f => f.endsWith('.mdx'))
      .map(async f => {
        const slug = f.replace(/\.mdx$/, '')
        const post = await readRaw(slug)
        return post
      })
  )
  return posts
    .filter((p): p is BlogPost => p !== null)
    .filter(p => includeDrafts || !p.frontmatter.draft)
    .sort((a, b) =>
      b.frontmatter.publishedAt.localeCompare(a.frontmatter.publishedAt)
    )
    .map(p => ({ slug: p.slug, frontmatter: p.frontmatter }))
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const post = await readRaw(slug)
  if (!post) return null
  if (post.frontmatter.draft && process.env['NODE_ENV'] === 'production') return null
  return post
}

export async function getFeaturedPosts(limit = 3): Promise<BlogPostMeta[]> {
  const all = await getAllPosts()
  const featured = all.filter(p => p.frontmatter.featured)
  return (featured.length ? featured : all).slice(0, limit)
}

export function formatPublishedDate(date: string, locale = 'es-ES'): string {
  return new Date(date + 'T00:00:00Z').toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function canonicalUrl(slug: string): string {
  const base = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://maestring.com'
  return `${base}/blog/${slug}`
}
