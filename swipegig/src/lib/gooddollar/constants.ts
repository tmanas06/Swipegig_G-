// GoodDollar Identity contract addresses (production)
export const GOODDOLLAR_IDENTITY_CONTRACT = '0xC361A6E67822a0EDc17D899227dd9FC50BD62F42' as const;
export const GOODDOLLAR_WALLET_URL = 'https://wallet.gooddollar.org' as const;

// Celo Mainnet RPC for identity checks (read-only)
export const CELO_MAINNET_RPC = 'https://forno.celo.org' as const;
export const CELO_MAINNET_CHAIN_ID = 42220 as const;

// AI prompt limits
export const FREE_AI_PROMPTS_LIMIT = 5 as const;
export const VERIFIED_AI_PROMPTS_LIMIT = 999999 as const;

// Rate limiting
export const CHECK_STATUS_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const CHECK_STATUS_MAX_REQUESTS = 10;

// Minimal ABI for GoodDollar Identity contract
export const IDENTITY_CONTRACT_ABI = [
  {
    name: 'isWhitelisted',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'lastAuthenticated',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'authenticationPeriod',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Feature descriptions for verification gate
export const VERIFY_GATE_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  wallet: {
    title: 'Access Your G$ Wallet',
    description: 'Connect to the GoodDollar ecosystem and access your G$ wallet',
  },
  rewards: {
    title: 'Earn G$ Rewards',
    description: 'Earn G$ tokens for applying to jobs, landing interviews, and building your career',
  },
  pool: {
    title: 'Join the Job Seekers Pool',
    description: 'Join the Job Seekers Pool and receive a daily G$ stream while you job hunt',
  },
  marketplace: {
    title: 'Creator Marketplace',
    description: 'Post career content, earn G$ from views, and get discovered by recruiters',
  },
} as const;
