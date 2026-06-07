import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://swipegig-g.vercel.app';
  
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/marketplace',
        '/marketplace/leaderboard',
        '/marketplace/post/',
      ],
      disallow: [
        '/feed',
        '/coach',
        '/wallet',
        '/settings',
        '/profile',
        '/applications',
        '/admin',
        '/api/',
        '/verify/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
