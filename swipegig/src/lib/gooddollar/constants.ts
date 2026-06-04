// GoodDollar contract addresses (from SDK chainConfigs, duplicated here for quick reference)
export const GOODDOLLAR_IDENTITY_CONTRACT = '0xC361A6E67822a0EDc17D899227dd9FC50BD62F42' as const;
export const GOODDOLLAR_WALLET_URL = 'https://wallet.gooddollar.org' as const;

// GoodDollar tokens on Celo mainnet
export const DEV_G_TOKEN = '0xFa51eFDc0910CCdA91732e6806912Fa12e2FD475' as const;
export const REAL_G_TOKEN = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A' as const;

// Celo Mainnet RPC for identity checks (read-only)
export const CELO_MAINNET_RPC = 'https://forno.celo.org' as const;
export const CELO_MAINNET_CHAIN_ID = 42220 as const;

// AI prompt limits
export const FREE_AI_PROMPTS_LIMIT = 5 as const;
export const VERIFIED_AI_PROMPTS_LIMIT = 999999 as const;

// Rate limiting
export const CHECK_STATUS_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const CHECK_STATUS_MAX_REQUESTS = 10;

// Reward amounts in G$ (ether units, 18 decimals)
export const REWARD_AMOUNTS: Record<string, string> = {
  profile_complete: '50',
  first_application: '20',
  per_application: '5',
  interview: '100',
  referral: '30',
  review: '15',
  daily_streak: '2',
} as const;

// Feature descriptions for verification gate
export const VERIFY_GATE_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  wallet: {
    title: 'Access Your G$ Wallet',
    description: 'Access your G$ wallet and track your token earnings',
  },
  rewards: {
    title: 'Earn G$ Rewards',
    description: 'Earn G$ tokens for applying to jobs, getting interviews, and growing your career',
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
