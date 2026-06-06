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

  const posts = await prisma.post.findMany({
    where: {
      createdAt: { gte: weekStart, lt: weekEnd },
      isPublished: true,
    },
    include: {
      tips: {
        select: {
          amount: true,
        },
      },
      author: true,
    },
  });

  // Group by author and sum scores
  const authorScores = new Map<
    string,
    {
      author: User;
      score: number;
      postsCount: number;
      totalTips: number;
    }
  >();

  for (const post of posts) {
    const score = calculateEngagementScore(post);
    const existing = authorScores.get(post.authorId);
    if (existing) {
      existing.score += score;
      existing.postsCount += 1;
      existing.totalTips += post.tipTotal;
    } else {
      authorScores.set(post.authorId, {
        author: post.author,
        score,
        postsCount: 1,
        totalTips: post.tipTotal,
      });
    }
  }

  return Array.from(authorScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
