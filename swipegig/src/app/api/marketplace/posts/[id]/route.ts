import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const privyUserId = request.headers.get('x-privy-user-id');

    // 1. Increment view count
    await prisma.post.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    // 2. Fetch post with author and relations
    const post = await prisma.post.findUnique({
      where: { id },
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
        pollOptions: {
          include: {
            votes: {
              select: {
                userId: true,
              },
            },
          },
        },
        tips: {
          include: {
            from: {
              select: {
                id: true,
                name: true,
                walletAddress: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        saves: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // 3. If authenticated, check if the user has voted or saved
    let userVote: string | null = null;
    let hasSaved = false;

    if (privyUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { privyId: privyUserId },
        select: { id: true },
      });

      if (dbUser) {
        // Find if user voted
        const vote = await prisma.pollVote.findUnique({
          where: {
            postId_userId: {
              postId: id,
              userId: dbUser.id,
            },
          },
          select: {
            optionId: true,
          },
        });
        if (vote) {
          userVote = vote.optionId;
        }

        // Find if user saved
        const save = await prisma.postSave.findUnique({
          where: {
            postId_userId: {
              postId: id,
              userId: dbUser.id,
            },
          },
        });
        hasSaved = !!save;
      }
    }

    // 4. Format poll options to include vote counts
    const formattedPollOptions = post.pollOptions.map((opt) => ({
      id: opt.id,
      text: opt.text,
      voteCount: opt.votes.length,
    }));

    // Construct return body
    const result = {
      ...post,
      pollOptions: formattedPollOptions,
      userVote,
      hasSaved,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[MARKETPLACE_POST_ID_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
