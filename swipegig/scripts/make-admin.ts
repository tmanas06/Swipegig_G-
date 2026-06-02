/**
 * Script to promote anzzuel@gmail.com to ADMIN role.
 * Run: npx tsx scripts/make-admin.ts
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = 'anzzuel@gmail.com';
  
  console.log(`\n🔍 Looking up user with email: ${email}...\n`);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      walletAddress: true,
      privyId: true,
    },
  });

  if (!user) {
    console.log(`❌ No user found with email: ${email}`);
    console.log(`   The user needs to log in first to create their account.`);
    console.log(`   After login, run this script again.\n`);
    process.exit(1);
  }

  console.log(`✅ Found user:`);
  console.log(`   ID:      ${user.id}`);
  console.log(`   Name:    ${user.name || '(unnamed)'}`);
  console.log(`   Email:   ${user.email}`);
  console.log(`   Wallet:  ${user.walletAddress || '(none)'}`);
  console.log(`   Role:    ${user.role}`);

  if (user.role === 'ADMIN') {
    console.log(`\n⚡ User is already an ADMIN. No changes needed.\n`);
    return;
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' },
    select: { id: true, email: true, role: true },
  });

  console.log(`\n🎉 Successfully promoted ${updated.email} to ADMIN!`);
  console.log(`   New role: ${updated.role}\n`);
}

main()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
