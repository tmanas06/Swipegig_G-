import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const webhookSchema = z.object({
  type: z.string(),
  data: z.object({
    id: z.string(),
    created_at: z.number().optional(),
    linked_accounts: z.array(z.object({
      type: z.string(),
      address: z.string().optional(),
      email: z.string().optional(),
      name: z.string().optional(),
    })).optional(),
    wallet: z.object({
      address: z.string(),
    }).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = webhookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const { type, data } = parsed.data;

    if (type === 'user.created' || type === 'user.authenticated') {
      const privyId = data.id;
      const walletAddress = data.wallet?.address || null;
      const emailAccount = data.linked_accounts?.find(a => a.type === 'email');
      const email = emailAccount?.email || null;
      const name = emailAccount?.name || null;

      await prisma.user.upsert({
        where: { privyId },
        update: {
          walletAddress,
          email,
          name,
          lastLoginAt: new Date(),
        },
        create: {
          privyId,
          walletAddress,
          email,
          name,
          lastLoginAt: new Date(),
          profile: {
            create: {
              skills: [],
            },
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PRIVY_WEBHOOK]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
