import { prisma } from '@/lib/prisma';

export async function checkAiAccess(privyUserId: string): Promise<{
  allowed: boolean;
  remaining: number | null; // null = unlimited (verified user)
  message?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { privyId: privyUserId },
    select: {
      isGoodDollarVerified: true,
      aiPromptsUsed: true,
      aiPromptsLimit: true,
    },
  });

  if (!user) {
    return {
      allowed: false,
      remaining: 0,
      message: 'User account not found.',
    };
  }

  // If the user is GoodDollar verified, they get unlimited AI coach access
  if (user.isGoodDollarVerified) {
    return {
      allowed: true,
      remaining: null,
    };
  }

  // Check if they have free prompts remaining
  const remaining = Math.max(0, user.aiPromptsLimit - user.aiPromptsUsed);

  if (remaining > 0) {
    // Increment aiPromptsUsed for this query
    await prisma.user.update({
      where: { privyId: privyUserId },
      data: {
        aiPromptsUsed: {
          increment: 1,
        },
      },
    });

    return {
      allowed: true,
      remaining: remaining - 1,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    message: 'Verify with GoodDollar to unlock unlimited AI coaching',
  };
}
