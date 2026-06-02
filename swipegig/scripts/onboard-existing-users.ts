import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { onboardNewUser } from '../src/lib/onboarding-mint';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const forceRun = args.includes('--force');

  console.log("🔍 Fetching users who need on-chain onboarding...");
  
  // If --force is passed, we fetch all users with a wallet address, otherwise only those with onboardedOnChain === false
  const users = await prisma.user.findMany({
    where: forceRun
      ? {
          walletAddress: {
            not: null,
            startsWith: '0x',
          },
        }
      : {
          onboardedOnChain: false,
          walletAddress: {
            not: null,
            startsWith: '0x',
          },
        },
  });

  if (users.length === 0) {
    console.log("✅ No users found who need onboarding.");
    return;
  }

  console.log(`🚀 Found ${users.length} user(s) to onboard (Force mode: ${forceRun}). Starting transactions...`);

  for (const user of users) {
    console.log(`\n──────────────────────────────────────────────────`);
    console.log(`👤 User: ${user.name || 'Unnamed'} (${user.email || 'No email'})`);
    console.log(`💳 Wallet: ${user.walletAddress}`);
    
    try {
      const res = await onboardNewUser(user.walletAddress!);
      if (res.success) {
        console.log(`✅ Successfully onboarded!`);
        console.log(`   Faucet Tx: ${res.faucetTx}`);
        console.log(`   NFT Mint Tx: ${res.nftTx || 'Skipped (NFT address not set)'}`);
        
        await prisma.user.update({
          where: { id: user.id },
          data: { onboardedOnChain: true },
        });
        console.log(`💾 Database status updated to onboardedOnChain: true`);
      } else {
        console.error(`❌ Failed: ${res.error}`);
      }
    } catch (e: any) {
      console.error(`❌ Error onboarding user:`, e.message || e);
    }
  }
  console.log(`\n──────────────────────────────────────────────────`);
  console.log("🏁 Onboarding run completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
