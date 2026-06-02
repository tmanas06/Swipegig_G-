import { createWalletClient, http, parseEther, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoSepolia } from 'viem/chains';

// ABI for mintWelcomeNFT
const WELCOME_NFT_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'string', name: 'uri', type: 'string' }
    ],
    name: 'mintWelcomeNFT',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

export async function onboardNewUser(userAddress: string) {
  // Read env variables dynamically at runtime when the function is called
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const WELCOME_NFT_ADDRESS = process.env.WELCOME_NFT_CONTRACT_ADDRESS;
  const RPC_URL = process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org';

  if (!PRIVATE_KEY) {
    console.error('[ONBOARDING] No PRIVATE_KEY configured in environment');
    return { success: false, error: 'No private key configured' };
  }

  if (!userAddress || !userAddress.startsWith('0x')) {
    console.error('[ONBOARDING] Invalid user address:', userAddress);
    return { success: false, error: 'Invalid user address' };
  }

  try {
    console.log(`[ONBOARDING] Starting onboarding automation for user: ${userAddress}`);

    let formattedKey = PRIVATE_KEY;
    if (!formattedKey.startsWith('0x')) {
      formattedKey = `0x${formattedKey}`;
    }
    const account = privateKeyToAccount(formattedKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: celoSepolia,
      transport: http(RPC_URL),
    });

    const publicClient = createPublicClient({
      chain: celoSepolia,
      transport: http(RPC_URL),
    });

    // 1. Send Gas Faucet Drop (0.05 CELO)
    console.log(`[ONBOARDING] Sending 0.05 CELO faucet gas to ${userAddress}...`);
    const faucetTx = await walletClient.sendTransaction({
      to: userAddress as `0x${string}`,
      value: parseEther('0.05'),
    });
    console.log(`[ONBOARDING] Faucet transaction sent: ${faucetTx}`);

    // Wait for faucet tx to be mined so balances settle
    await publicClient.waitForTransactionReceipt({ hash: faucetTx });
    console.log(`[ONBOARDING] Faucet transaction confirmed!`);

    // 2. Mint Welcome NFT if contract address is configured
    if (WELCOME_NFT_ADDRESS && WELCOME_NFT_ADDRESS.startsWith('0x') && WELCOME_NFT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      console.log(`[ONBOARDING] Minting Welcome NFT to ${userAddress}...`);
      const nftUri = 'https://raw.githubusercontent.com/tmanas06/Swipegig_G-/main/swipegig/public/nfts/welcome.json';
      
      const { request } = await publicClient.simulateContract({
        account,
        address: WELCOME_NFT_ADDRESS as `0x${string}`,
        abi: WELCOME_NFT_ABI,
        functionName: 'mintWelcomeNFT',
        args: [userAddress as `0x${string}`, nftUri],
      });

      const nftTx = await walletClient.writeContract(request);
      console.log(`[ONBOARDING] NFT Mint transaction sent: ${nftTx}`);
      
      // Wait for NFT transaction to be mined
      await publicClient.waitForTransactionReceipt({ hash: nftTx });
      console.log(`[ONBOARDING] NFT Mint transaction confirmed!`);

      return {
        success: true,
        faucetTx,
        nftTx,
      };
    } else {
      console.log('[ONBOARDING] WELCOME_NFT_CONTRACT_ADDRESS not configured, skipping NFT mint');
      return {
        success: true,
        faucetTx,
        nftTx: null,
      };
    }
  } catch (error: any) {
    console.error('[ONBOARDING_ERROR]', error);
    return { success: false, error: error.message || error };
  }
}
