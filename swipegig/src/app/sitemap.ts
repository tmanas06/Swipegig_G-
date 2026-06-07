import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://swipegig-g.vercel.app';

  // 1. Core static marketing and public marketplace routes
  const staticRoutes = [
    '',
    '/marketplace',
    '/marketplace/leaderboard',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // 2. Dynamic marketplace posts
  let postRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await prisma.post.findMany({
      where: { isPublished: true },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 1000, // Limit to recent 1000 posts for build performance
    });

    postRoutes = posts.map((post) => ({
      url: `${baseUrl}/marketplace/post/${post.id}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error('[SITEMAP_POSTS_ERROR]', error);
  }

  return [...staticRoutes, ...postRoutes];
}
