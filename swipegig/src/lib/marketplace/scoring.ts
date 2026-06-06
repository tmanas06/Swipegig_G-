// src/lib/marketplace/scoring.ts
import { prisma } from '@/lib/prisma';
import { type User } from '@prisma/client';

export function calculateEngagementScore(post: {
  viewCount: number;
  saveCount: number;
  tips: { amount: number }[];
}): number {
  const tipCount = post.tips.length;
  return (post.viewCount * 1) + (post.saveCount * 3) + (tipCount * 10);
}

export async function getWeeklyLeaderboard(weekStart: Date) {
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 1. Group posts by author for this week
  const aggregatedPosts = await prisma.post.groupBy({
    by: ['authorId'],
    where: {
      createdAt: { gte: weekStart, lt: weekEnd },
      isPublished: true,
    },
    _sum: {
      viewCount: true,
      saveCount: true,
      tipTotal: true,
    },
    _count: {
      id: true,
    },
  });

  if (aggregatedPosts.length === 0) return [];

  // 2. Count weekly tips per post for this week
  const aggregatedTips = await prisma.postTip.groupBy({
    by: ['postId'],
    where: {
      createdAt: { gte: weekStart, lt: weekEnd },
    },
    _count: {
      id: true,
    },
  });

  // Create a map of postId -> tipCount
  const tipCountMap = new Map<string, number>();
  for (const t of aggregatedTips) {
    tipCountMap.set(t.postId, t._count.id || 0);
  }

  // Map post tips to their authors
  const postsWithAuthors = await prisma.post.findMany({
    where: {
      createdAt: { gte: weekStart, lt: weekEnd },
      isPublished: true,
    },
    select: {
      id: true,
      authorId: true,
    },
  });

  const authorTipCountMap = new Map<string, number>();
  for (const p of postsWithAuthors) {
    const tips = tipCountMap.get(p.id) || 0;
    authorTipCountMap.set(p.authorId, (authorTipCountMap.get(p.authorId) || 0) + tips);
  }

  // 3. Compute score per author
  const authorLeaderboard = aggregatedPosts.map((ap) => {
    const totalViews = ap._sum.viewCount || 0;
    const totalSaves = ap._sum.saveCount || 0;
    const totalTipsCount = authorTipCountMap.get(ap.authorId) || 0;
    const score = (totalViews * 1) + (totalSaves * 3) + (totalTipsCount * 10);
    return {
      authorId: ap.authorId,
      score,
      postsCount: ap._count.id || 0,
      totalTips: ap._sum.tipTotal || 0,
    };
  });

  // 4. Sort and take top 10
  authorLeaderboard.sort((a, b) => b.score - a.score);
  const top10 = authorLeaderboard.slice(0, 10);

  // 5. Fetch details for only the top 10 authors
  const top10AuthorIds = top10.map((t) => t.authorId);
  const users = await prisma.user.findMany({
    where: {
      id: { in: top10AuthorIds },
    },
  });

  const userMap = new Map<string, typeof users[0]>();
  for (const u of users) {
    userMap.set(u.id, u);
  }

  return top10
    .map((t) => {
      const author = userMap.get(t.authorId);
      if (!author) return null;
      return {
        author,
        score: t.score,
        postsCount: t.postsCount,
        totalTips: t.totalTips,
      };
    })
    .filter(Boolean) as Array<{
      author: User;
      score: number;
      postsCount: number;
      totalTips: number;
    }>;
}
