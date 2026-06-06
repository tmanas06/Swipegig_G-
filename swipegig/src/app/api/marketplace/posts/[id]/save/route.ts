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

    const dbUser = await prisma.user.findUnique({
      where: { privyId: privyUserId },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Toggle save state
    const existingSave = await prisma.postSave.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId: dbUser.id,
        },
      },
    });

    let saved = false;

    if (existingSave) {
      // Unsave the post
      await prisma.$transaction([
        prisma.postSave.delete({
          where: {
            postId_userId: {
              postId: id,
              userId: dbUser.id,
            },
          },
        }),
        prisma.post.update({
          where: { id },
          data: {
            saveCount: {
              decrement: Math.max(0, 1), // ensure it doesn't go below 0
            },
          },
        }),
      ]);
      saved = false;
    } else {
      // Save the post
      await prisma.$transaction([
        prisma.postSave.create({
          data: {
            postId: id,
            userId: dbUser.id,
          },
        }),
        prisma.post.update({
          where: { id },
          data: {
            saveCount: {
              increment: 1,
            },
          },
        }),
      ]);
      saved = true;
    }

    return NextResponse.json({ saved });
  } catch (error: any) {
    console.error('[MARKETPLACE_POST_SAVE_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
