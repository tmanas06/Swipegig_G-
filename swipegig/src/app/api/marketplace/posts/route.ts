import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['article', 'image', 'code', 'poll', 'video']),
  content: z.string().optional(),
  mediaUrl: z.string().optional(),
  tags: z.array(z.string()).default([]),
  pollOptions: z.array(z.string().min(1)).min(2).max(4).optional(),
  language: z.string().optional(),
});

// GET - fetch paginated posts feed
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const tag = searchParams.get('tag');
    const authorId = searchParams.get('authorId');
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // 'createdAt' or 'engagementScore'
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // Build filter clause
    const where: any = {
      isPublished: true,
    };

    if (type && type !== 'all') {
      where.type = type;
    }

    if (tag && tag !== 'all') {
      where.tags = {
        has: tag,
      };
    }

    if (authorId) {
      where.authorId = authorId;
    }

    // Query posts
    let posts = await prisma.post.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            isGoodDollarVerified: true,
            walletAddress: true,
          },
        },
        pollOptions: true,
        tips: {
          select: {
            amount: true,
          },
        },
        saves: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: sortBy === 'createdAt' ? { createdAt: 'desc' } : undefined,
    });

    // If sorting by engagement score, we calculate it in-memory
    if (sortBy === 'engagementScore') {
      posts = posts.map((post) => {
        const score = (post.viewCount * 1) + (post.saveCount * 3) + (post.tips.length * 10);
        return { ...post, engagementScore: score };
      });
      // @ts-ignore
      posts.sort((a, b) => b.engagementScore - a.engagementScore);
    }

    // Paginate in-memory if sorted by engagement score, otherwise DB pagination could be used
    const paginatedPosts = posts.slice(skip, skip + limit);

    return NextResponse.json({
      posts: paginatedPosts,
      totalCount: posts.length,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('[MARKETPLACE_POSTS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - create a new post
export async function POST(request: NextRequest) {
  try {
    const privyUserId = request.headers.get('x-privy-user-id');
    if (!privyUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { privyId: privyUserId },
      select: { id: true, isGoodDollarVerified: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!dbUser.isGoodDollarVerified) {
      return NextResponse.json({ error: 'Must be GoodDollar verified to create posts' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { title, type, content, mediaUrl, tags, pollOptions, language } = parsed.data;

    // Type-specific validations
    if (type === 'article' && !content) {
      return NextResponse.json({ error: 'Content is required for articles' }, { status: 400 });
    }
    if (type === 'image' && !mediaUrl) {
      return NextResponse.json({ error: 'Media URL is required for image posts' }, { status: 400 });
    }
    if (type === 'video' && !mediaUrl) {
      return NextResponse.json({ error: 'Video playback ID is required for video posts' }, { status: 400 });
    }
    if (type === 'code') {
      if (!content) {
        return NextResponse.json({ error: 'Code content is required for code posts' }, { status: 400 });
      }
      if (!language) {
        return NextResponse.json({ error: 'Language selector is required for code posts' }, { status: 400 });
      }
    }
    if (type === 'poll') {
      if (!content) {
        return NextResponse.json({ error: 'Question content is required for polls' }, { status: 400 });
      }
      if (!pollOptions || pollOptions.length < 2 || pollOptions.length > 4) {
        return NextResponse.json({ error: 'Polls must have between 2 and 4 options' }, { status: 400 });
      }
    }

    // Build tags list - for code posts, add language tag to searchable tags list
    const finalTags = [...tags];
    if (type === 'code' && language && !finalTags.includes(language)) {
      finalTags.push(language);
    }

    // Create the post
    const post = await prisma.post.create({
      data: {
        title,
        type,
        content: type === 'code' ? JSON.stringify({ code: content, language }) : content,
        mediaUrl,
        tags: finalTags,
        authorId: dbUser.id,
        pollOptions: type === 'poll' && pollOptions
          ? {
              create: pollOptions.map((text) => ({ text })),
            }
          : undefined,
      },
      include: {
        pollOptions: true,
      },
    });

    return NextResponse.json(post);
  } catch (error: any) {
    console.error('[MARKETPLACE_POSTS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
