import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/prisma';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface AiAccessResult {
  allowed: boolean;
  remaining: number | null; // null = unlimited (verified)
  used: number;
  limit: number;
}

async function checkAiAccess(privyUserId: string): Promise<AiAccessResult> {
  const user = await prisma.user.findUnique({
    where: { privyId: privyUserId },
    select: {
      isGoodDollarVerified: true,
      aiPromptsUsed: true,
      aiPromptsLimit: true,
    },
  });

  if (!user) {
    return { allowed: false, remaining: 0, used: 0, limit: 5 };
  }

  if (user.isGoodDollarVerified) {
    return { allowed: true, remaining: null, used: user.aiPromptsUsed, limit: user.aiPromptsLimit };
  }

  const remaining = Math.max(0, user.aiPromptsLimit - user.aiPromptsUsed);
  return {
    allowed: remaining > 0,
    remaining,
    used: user.aiPromptsUsed,
    limit: user.aiPromptsLimit,
  };
}

export async function POST(request: NextRequest) {
  try {
    const privyUserId = request.headers.get('x-privy-user-id');
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }

    // Check AI access if user is authenticated
    if (privyUserId) {
      const access = await checkAiAccess(privyUserId);

      if (!access.allowed) {
        return NextResponse.json(
          {
            error: 'prompt_limit_reached',
            message: 'Verify with GoodDollar to unlock unlimited AI coaching',
            promptsUsed: access.used,
            promptsLimit: access.limit,
            promptsRemaining: 0,
          },
          { status: 403 }
        );
      }

      // Increment prompt count for unverified users
      if (access.remaining !== null) {
        await prisma.user.update({
          where: { privyId: privyUserId },
          data: { aiPromptsUsed: { increment: 1 } },
        });
      }
    }

    const systemPrompt = `You are SwipeGig's AI Career Coach — an expert career advisor specializing in Web3 and blockchain jobs.

Your capabilities:
- Resume review and improvement suggestions
- Interview preparation for blockchain/Web3 roles
- Skill gap analysis
- Cover letter writing
- Career roadmap planning
- Salary negotiation advice
- LinkedIn/GitHub profile optimization

Be helpful, specific, and actionable. Use markdown formatting for clarity.
When discussing technical topics, be precise about Solidity, DeFi, NFTs, DAOs, etc.
Keep responses concise but comprehensive.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[AI_CHAT]', error);
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 500 });
  }
}
