import type { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/blog'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://maestring.com'
  const posts = await getAllPosts()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ]

  const postEntries: MetadataRoute.Sitemap = posts.map(p => ({
    url: `${baseUrl}/blog/${p.slug}`,
    lastModified: new Date(p.frontmatter.updatedAt ?? p.frontmatter.publishedAt),
    changeFrequency: 'monthly',
    priority: p.frontmatter.featured ? 0.85 : 0.7,
  }))

  return [...staticEntries, ...postEntries]
}
