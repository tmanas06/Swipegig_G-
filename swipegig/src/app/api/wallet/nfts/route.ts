import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  const celoscanUrl = `https://celo-sepolia.blockscout.com/api?module=account&action=tokennfttx&address=${address}`;

  try {
    const response = await fetch(celoscanUrl);
    if (!response.ok) {
      throw new Error(`Blockscout HTTP error: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.result)) {
      return NextResponse.json({ nfts: [] });
    }

    // Chronological tracking to identify currently owned NFTs
    const txs = data.result;
    const owned = new Map<string, any>();

    for (const tx of txs) {
      const key = `${tx.contractAddress.toLowerCase()}-${tx.tokenID}`;
      const isRecipient = tx.to.toLowerCase() === address.toLowerCase();
      const isSender = tx.from.toLowerCase() === address.toLowerCase();

      if (isRecipient) {
        // User received/minted this NFT
        owned.set(key, {
          id: key,
          name: tx.tokenName || tx.tokenSymbol || 'Celo NFT',
          description: `Contract: ${tx.contractAddress.slice(0, 6)}...${tx.contractAddress.slice(-4)}`,
          image: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80`, // default abstract NFT cover
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
      } else if (isSender) {
        // User transferred it away, delete from owned map
        owned.delete(key);
      }
    }

    return NextResponse.json({ nfts: Array.from(owned.values()) });
  } catch (error) {
    console.error('[BLOCKSCOUT_NFT_ERROR]', error);
    return NextResponse.json({ nfts: [], error: 'Failed to fetch from Blockscout API' });
  }
}
