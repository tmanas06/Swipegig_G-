const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const nextDir = path.join(__dirname, '..', '.next');
console.log('Cleaning .next directory:', nextDir);

if (fs.existsSync(nextDir)) {
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('.next directory cleaned successfully.');
  } catch (err) {
    console.error('Failed to clean .next directory:', err);
  }
} else {
  console.log('.next directory does not exist.');
}

console.log('Running prisma generate...');
try {
  const output = execSync('npx prisma generate', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  console.log('Prisma generate completed successfully.');
} catch (err) {
  console.error('Failed to run prisma generate:', err.message);
}
