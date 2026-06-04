import { z } from 'zod';

const envSchema = z.object({
  // Auth - Privy
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1, 'PRIVY_APP_ID is required'),
  PRIVY_APP_SECRET: z.string().min(1, 'PRIVY_APP_SECRET is required').optional(),
  PRIVY_CLIENT_ID: z.string().min(1).optional(),

  // AI
  ANTHROPIC_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Redis
  REDIS_URL: z.string().optional(),

  // Blockchain
  NEXT_PUBLIC_CELO_RPC_URL: z.string().url().default('https://forno.celo.org'),
  REWARDS_CONTRACT_ADDRESS: z.string().optional(),
  APPLICATIONS_CONTRACT_ADDRESS: z.string().optional(),
  POOL_CONTRACT_ADDRESS: z.string().optional(),

  // Storage
  WEB3_STORAGE_TOKEN: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),

  // GoodDollar
  GOODDOLLAR_API_KEY: z.string().optional(),

  // WalletConnect
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      '❌ Invalid environment variables:',
      parsed.error.flatten().fieldErrors
    );
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export const env = validateEnv();
