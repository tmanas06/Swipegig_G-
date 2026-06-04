import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  const nfts: any[] = [];

  // 1. Check if user is onboarded in our database to show the Welcome Pass instantly
  try {
    const user = await prisma.user.findFirst({
      where: {
        walletAddress: {
          equals: address,
          mode: 'insensitive',
        },
      },
      select: {
        onboardedOnChain: true,
        createdAt: true,
      },
    });

    if (user?.onboardedOnChain) {
      nfts.push({
        id: `welcome-nft-${address.toLowerCase()}`,
        name: 'SwipeGig Welcome Pass',
        description: 'Awarded for successfully joining SwipeGig and syncing your wallet on-chain.',
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
        tokenId: '0',
        rarity: 'Common',
        mintDate: new Date(user.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        color: 'from-blue-500 to-indigo-600',
        contractAddress: process.env.WELCOME_NFT_CONTRACT_ADDRESS || '',
        isReal: true,
      });
    }
  } catch (dbError) {
    console.error('[DB_NFT_LOOKUP_ERROR]', dbError);
  }

  // 2. Fetch other real Celo Mainnet NFTs from Blockscout
  const celoscanUrl = `https://celo.blockscout.com/api?module=account&action=tokennfttx&address=${address}`;

  try {
    const response = await fetch(celoscanUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.result)) {
        const txs = data.result;
        const welcomeContract = (process.env.WELCOME_NFT_CONTRACT_ADDRESS || '').toLowerCase();

        for (const tx of txs) {
          // Skip the welcome NFT contract since we already appended it dynamically
          if (tx.contractAddress.toLowerCase() === welcomeContract) {
            continue;
          }

          const key = `${tx.contractAddress.toLowerCase()}-${tx.tokenID}`;
          const isRecipient = tx.to.toLowerCase() === address.toLowerCase();
          const isSender = tx.from.toLowerCase() === address.toLowerCase();

          if (isRecipient) {
            nfts.push({
              id: key,
              name: tx.tokenName || tx.tokenSymbol || 'Celo NFT',
              description: `Contract: ${tx.contractAddress.slice(0, 6)}...${tx.contractAddress.slice(-4)}`,
              image: `https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=300&auto=format&fit=crop&q=80`, // default abstract NFT cover
              tokenId: tx.tokenID,
              rarity: 'Common',
              mintDate: new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              color: 'from-blue-500 to-indigo-600',
              contractAddress: tx.contractAddress,
              isReal: true,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('[BLOCKSCOUT_NFT_ERROR]', error);
  }

  return NextResponse.json({ nfts });
}
