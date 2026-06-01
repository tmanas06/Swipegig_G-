import { prisma } from './prisma';
import { RewardTrigger } from '@prisma/client';

export async function triggerReward(userId: string, trigger: RewardTrigger, amount: number, metadata?: any) {
  try {
    // Prevent double claiming for one-time achievements
    if (trigger === 'PROFILE_COMPLETION' || trigger === 'FIRST_APPLICATION') {
      const existing = await prisma.reward.findFirst({
        where: { userId, trigger },
      });
      if (existing) {
        return null; // Already rewarded
      }
    }

    // Record the reward in the database
    const reward = await prisma.reward.create({
      data: {
        userId,
        amount,
        trigger,
        metadata: metadata || {},
      },
    });

    return reward;
  } catch (error) {
    console.error(`[TRIGGER_REWARD_ERROR] for user ${userId}, trigger ${trigger}:`, error);
    return null;
  }
}
