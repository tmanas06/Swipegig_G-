import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const logPath = path.join(process.cwd(), 'scratch', 'db-sync.log');

  // Ensure scratch directory exists
  const scratchDir = path.dirname(logPath);
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  fs.writeFileSync(logPath, `Starting direct sync at ${new Date().toISOString()}...\n`);

  console.log('[DB_DEBUG] Starting async execution with direct DATABASE_URL on host...');

  // Use the direct (non-pooler) Neon URL for the migration/push
  const directDbUrl = 'postgresql://neondb_owner:npg_7V6MlSTPghpI@ep-frosty-paper-ap4j7g93.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';
  const cmd = `DATABASE_URL="${directDbUrl}" npx prisma db push --accept-data-loss && npx prisma generate`;

  const child = exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
    let result = '\n--- SUCCESS ---\n';
    if (error) {
      result = `\n--- ERROR ---\nCode: ${error.code}\nMessage: ${error.message}\n`;
      console.error('[DB_DEBUG] Execution failed:', error.message);
    } else {
      console.log('[DB_DEBUG] Execution completed successfully.');
    }

    fs.appendFileSync(
      logPath,
      `STDOUT:\n${stdout}\nSTDERR:\n${stderr}\n${result}Finished at ${new Date().toISOString()}\n`
    );
  });

  return NextResponse.json({
    message: 'Direct sync started asynchronously. Check scratch/db-sync.log for progress.',
    pid: child.pid,
  });
}
