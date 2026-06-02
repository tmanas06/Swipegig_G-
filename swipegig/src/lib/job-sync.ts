import { prisma } from './prisma';

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location?: string;
  salary?: string;
  description: string;
}

const WEB3_KEYWORDS = [
  'solidity', 'ethereum', 'web3', 'blockchain', 'defi', 'nft', 'crypto', 'smart contract',
  'rust', 'wasm', 'celo', 'hardhat', 'ethers', 'viem', 'wagmi', 'anchor', 'solana', 'cosmos',
  'dapp', 'decentralized', 'token', 'layer2', 'layer 2', 'ipfs', 'zero-knowledge', 'zkp'
];

function parseJobType(type: string): 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'FREELANCE' | 'INTERNSHIP' {
  const t = type.toLowerCase().replace(/[-_]/g, ' ');
  if (t.includes('full time') || t.includes('fulltime')) return 'FULL_TIME';
  if (t.includes('part time') || t.includes('parttime')) return 'PART_TIME';
  if (t.includes('contract')) return 'CONTRACT';
  if (t.includes('freelance')) return 'FREELANCE';
  if (t.includes('internship') || t.includes('intern')) return 'INTERNSHIP';
  return 'FULL_TIME';
}

function checkIfWeb3(title: string, description: string, tags: string[]): boolean {
  const content = `${title} ${description} ${tags.join(' ')}`.toLowerCase();
  return WEB3_KEYWORDS.some(keyword => content.includes(keyword));
}

function parseSalary(salaryStr: string | null | undefined): { min: number | null; max: number | null; currency: string } {
  if (!salaryStr) return { min: null, max: null, currency: 'USD' };

  let currency = 'USD';
  if (salaryStr.includes('€') || salaryStr.toLowerCase().includes('eur')) currency = 'EUR';
  if (salaryStr.includes('£') || salaryStr.toLowerCase().includes('gbp')) currency = 'GBP';

  const regex = /(\d+)(k?)/gi;
  const matches: Array<{ num: number; isK: boolean }> = [];
  let match;
  while ((match = regex.exec(salaryStr)) !== null) {
    matches.push({
      num: parseInt(match[1]),
      isK: match[2]?.toLowerCase() === 'k'
    });
  }

  if (matches.length === 0) return { min: null, max: null, currency };

  const parsedValues = matches.map(m => m.isK ? m.num * 1000 : m.num);

  if (parsedValues.length === 1) {
    return { min: parsedValues[0], max: null, currency };
  } else {
    const sorted = [...parsedValues].sort((a, b) => a - b);
    return { min: sorted[0], max: sorted[sorted.length - 1], currency };
  }
}

export async function syncJobsFromAPIs(): Promise<{ success: boolean; totalSynced: number; newJobs: number; error?: string }> {
  try {
    console.log('[JOB_SYNC] Fetching developer jobs from Remotive API...');
    const response = await fetch('https://remotive.com/api/remote-jobs?category=software-dev', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Remotive API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const rawJobs = (data.jobs || []) as RemotiveJob[];
    console.log(`[JOB_SYNC] Successfully fetched ${rawJobs.length} jobs. Filtering and saving...`);

    // Limit syncing to top 50 active jobs to avoid performance degradation and stay within rate limits
    const jobsToSync = rawJobs.slice(0, 50);
    let newJobsCount = 0;

    for (const rawJob of jobsToSync) {
      const externalId = `remotive-${rawJob.id}`;

      // Check if job already exists in DB
      const existing = await prisma.job.findUnique({
        where: { externalId },
      });

      if (existing) {
        continue;
      }

      // Map Remotive job properties
      const isWeb3 = checkIfWeb3(rawJob.title, rawJob.description, rawJob.tags);
      const salaryInfo = parseSalary(rawJob.salary);
      const type = parseJobType(rawJob.job_type);
      
      // Clean tags (normalize tags to trimmed titles)
      const skills = (rawJob.tags || [])
        .map(t => t.trim())
        .filter(t => t.length > 0 && t.length < 30);

      // Create new job in database
      await prisma.job.create({
        data: {
          externalId,
          title: rawJob.title,
          company: rawJob.company_name,
          companyLogo: rawJob.company_logo || null,
          description: rawJob.description,
          skills,
          salaryMin: salaryInfo.min,
          salaryMax: salaryInfo.max,
          salaryCurrency: salaryInfo.currency,
          location: rawJob.candidate_required_location || 'Remote',
          type,
          mode: 'REMOTE',
          source: 'REMOTIVE',
          sourceUrl: rawJob.url,
          isWeb3,
          experienceLevel: rawJob.tags?.some(t => t.toLowerCase().includes('senior')) ? 'Senior' : 'Mid',
          postedAt: new Date(rawJob.publication_date),
        },
      });

      newJobsCount++;
    }

    console.log(`[JOB_SYNC] Sync complete. Added ${newJobsCount} new jobs.`);
    return {
      success: true,
      totalSynced: jobsToSync.length,
      newJobs: newJobsCount,
    };
  } catch (error: any) {
    console.error('[JOB_SYNC] Error running sync jobs:', error);
    return {
      success: false,
      totalSynced: 0,
      newJobs: 0,
      error: error.message || 'Unknown error',
    };
  }
}
