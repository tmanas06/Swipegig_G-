const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to database and querying...');
    const jobsCount = await prisma.job.count();
    console.log('Total jobs count:', jobsCount);
    
    const remotiveJobsCount = await prisma.job.count({
      where: { externalId: { startsWith: 'remotive-' } }
    });
    console.log('Remotive jobs count:', remotiveJobsCount);

    const firstFewJobs = await prisma.job.findMany({
      take: 5,
      select: { id: true, title: true, company: true, externalId: true, createdAt: true }
    });
    console.log('First 5 jobs:', firstFewJobs);
  } catch (error) {
    console.error('Error querying DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
