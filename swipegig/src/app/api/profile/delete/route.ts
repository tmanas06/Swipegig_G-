import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    const privyId = request.headers.get('x-privy-user-id');
    if (!privyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { privyId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete the user (Prisma onDelete: Cascade will delete profile, resume, saved jobs, applications, rewards, reviews, etc.)
    await prisma.user.delete({
      where: { privyId },
    });

    console.log(`[USER_DELETE] Successfully deleted user with Privy ID: ${privyId}`);
    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('[USER_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
