import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicClient, http, decodeFunctionData, parseEther } from 'viem';
import { celo } from 'viem/chains';
import { triggerReward } from '@/lib/gooddollar/rewards';

const G_TOKEN_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

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

    // 1. Verify user exists and is GoodDollar verified
    const dbUser = await prisma.user.findUnique({
      where: { privyId: privyUserId },
      select: { id: true, isGoodDollarVerified: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!dbUser.isGoodDollarVerified) {
      return NextResponse.json(
        { error: 'Must be GoodDollar verified to tip' },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { amount, txHash } = body;

    if (!amount || !txHash) {
      return NextResponse.json(
        { error: 'Amount and txHash are required' },
        { status: 400 }
      );
    }

    // 3. Find the post and author
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (!post.author.walletAddress) {
      return NextResponse.json(
        { error: 'Author does not have a registered wallet' },
        { status: 400 }
      );
    }

    // 4. Verify transaction on-chain via Celo RPC
    const celoRpc = process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org';
    const client = createPublicClient({
      chain: celo,
      transport: http(celoRpc),
    });

    let tx;
    let receipt;
    try {
      tx = await client.getTransaction({ hash: txHash as `0x${string}` });
      receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
    } catch (blockchainErr: any) {
      console.error('[TIPPING_BLOCKCHAIN_FETCH_ERROR]', blockchainErr);
      return NextResponse.json(
        { error: 'Transaction not found or not confirmed on-chain' },
        { status: 400 }
      );
    }

    if (receipt.status !== 'success') {
      return NextResponse.json(
        { error: 'On-chain transaction failed' },
        { status: 400 }
      );
    }

    // Decode ERC20 transfer call
    let functionName;
    let args;
    try {
      const decoded = decodeFunctionData({
        abi: G_TOKEN_ABI,
        data: tx.input,
      });
      functionName = decoded.functionName;
      args = decoded.args;
    } catch (decodeErr: any) {
      console.error('[TIPPING_DECODE_INPUT_ERROR]', decodeErr);
      return NextResponse.json(
        { error: 'Transaction is not a standard ERC20 token transfer' },
        { status: 400 }
      );
    }

    if (functionName !== 'transfer') {
      return NextResponse.json(
        { error: 'Transaction is not a transfer' },
        { status: 400 }
      );
    }

    const gTokenAddress = process.env.NEXT_PUBLIC_DEV_G_TOKEN || '0xFa51eFDc0910CCdA91732e6806912Fa12e2FD475';
    if (tx.to?.toLowerCase() !== gTokenAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Transaction was not sent to G$ token contract' },
        { status: 400 }
      );
    }

    const recipientAddress = args[0] as string;
    const transferValue = args[1] as bigint;

    if (recipientAddress.toLowerCase() !== post.author.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Transaction recipient does not match author wallet address' },
        { status: 400 }
      );
    }

    const expectedValue = parseEther(amount.toString());
    if (transferValue < expectedValue) {
      return NextResponse.json(
        { error: 'Transaction value is less than the claimed tipped amount' },
        { status: 400 }
      );
    }

    // 5. Create Tip entry and update Post total in a transaction
    const tipAmountFloat = parseFloat(amount.toString());
    const [, updatedPost] = await prisma.$transaction([
      prisma.postTip.create({
        data: {
          postId: id,
          fromId: dbUser.id,
          amount: tipAmountFloat,
          txHash,
        },
      }),
      prisma.post.update({
        where: { id },
        data: {
          tipTotal: {
            increment: tipAmountFloat,
          },
        },
      }),
    ]);

    // 6. Trigger a 'review' G$ reward for the author for creating valuable content
    try {
      await triggerReward(post.author.walletAddress, 'review', `tip_${id}_${txHash.slice(0, 10)}`);
    } catch (rewardErr: any) {
      console.error('[AUTHOR_REWARD_ERROR]', rewardErr);
    }

    return NextResponse.json({ tipTotal: updatedPost.tipTotal });
  } catch (error: any) {
    console.error('[MARKETPLACE_POST_TIP_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
