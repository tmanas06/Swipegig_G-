import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const privyUserId = request.headers.get('x-privy-user-id');

    if (!privyUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Verify user is logged in and GoodDollar verified
    const dbUser = await prisma.user.findUnique({
      where: { privyId: privyUserId },
      select: { id: true, isGoodDollarVerified: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!dbUser.isGoodDollarVerified) {
      return NextResponse.json(
        { error: 'Must be GoodDollar verified to vote' },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { optionId } = body;

    if (!optionId) {
      return NextResponse.json(
        { error: 'Option ID is required' },
        { status: 400 }
      );
    }

    // 3. Find post and verify type
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        pollOptions: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.type !== 'poll') {
      return NextResponse.json({ error: 'This post is not a poll' }, { status: 400 });
    }

    // 4. Verify poll has not expired (7 days)
    const expiryDate = new Date(post.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (new Date() > expiryDate) {
      return NextResponse.json({ error: 'This poll has expired' }, { status: 400 });
    }

    // 5. Verify the option exists on this post
    const isValidOption = post.pollOptions.some((opt) => opt.id === optionId);
    if (!isValidOption) {
      return NextResponse.json({ error: 'Invalid option selected' }, { status: 400 });
    }

    // 6. Check for existing vote
    const existingVote = await prisma.pollVote.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId: dbUser.id,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted in this poll' },
        { status: 400 }
      );
    }

    // 7. Create vote record
    await prisma.pollVote.create({
      data: {
        postId: id,
        optionId,
        userId: dbUser.id,
      },
    });

    // 8. Fetch and return updated options with vote counts
    const updatedOptions = await prisma.pollOption.findMany({
      where: { postId: id },
      include: {
        votes: {
          select: {
            userId: true,
          },
        },
      },
    });

    const formattedOptions = updatedOptions.map((opt) => ({
      id: opt.id,
      text: opt.text,
      voteCount: opt.votes.length,
    }));

    return NextResponse.json({ pollOptions: formattedOptions });
  } catch (error: any) {
    console.error('[MARKETPLACE_POST_VOTE_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
