const { execSync } = require('child_process');
const path = require('path');

const directDbUrl = 'postgresql://neondb_owner:npg_7V6MlSTPghpI@ep-frosty-paper-ap4j7g93.us-east-1.aws.neon.tech/neondb?sslmode=require';
const projectDir = path.join(__dirname, '..');

console.log('Starting DB Push with direct URL...');
try {
  execSync('npx prisma db push', {
    cwd: projectDir,
    env: {
      ...process.env,
      DATABASE_URL: directDbUrl
    },
    stdio: 'inherit'
  });
  console.log('DB Push completed successfully.');
} catch (err) {
  console.error('DB Push failed:', err.message);
  process.exit(1);
}

console.log('Running Prisma Generate...');
try {
  execSync('npx prisma generate', {
    cwd: projectDir,
    stdio: 'inherit'
  });
  console.log('Prisma Generate completed successfully.');
} catch (err) {
  console.error('Prisma Generate failed:', err.message);
  process.exit(1);
}
