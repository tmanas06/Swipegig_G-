import { prisma } from '@/lib/prisma';
import { syncJobsFromAPIs } from '@/lib/job-sync';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ sync?: string; clear?: string }>;
}

export default async function DebugViewPage({ searchParams }: Props) {
  const params = await searchParams;
  const sync = params.sync === 'true';
  const clear = params.clear === 'true';

  let syncResult: any = null;
  let clearResult: any = null;

  if (clear) {
    try {
      // Clear jobs not marked as saved or applied to avoid foreign key violations
      const savedJobIds = (await prisma.savedJob.findMany({ select: { jobId: true } })).map(j => j.jobId);
      const appliedJobIds = (await prisma.application.findMany({ select: { jobId: true } })).map(j => j.jobId);
      const keepIds = Array.from(new Set([...savedJobIds, ...appliedJobIds]));

      const deleteResult = await prisma.job.deleteMany({
        where: {
          id: {
            notIn: keepIds,
          },
        },
      });
      clearResult = { success: true, deleted: deleteResult.count };
    } catch (err: any) {
      clearResult = { success: false, error: err.message };
    }
  }

  if (sync) {
    console.log('[DEBUG_VIEW] Triggering live jobs sync from APIs...');
    try {
      syncResult = await syncJobsFromAPIs();
    } catch (err: any) {
      syncResult = { success: false, error: err.message };
    }
  }

  const totalJobs = await prisma.job.count();
  
  const sources = await prisma.job.groupBy({
    by: ['source'],
    _count: {
      id: true,
    },
  });

  const jobs = await prisma.job.findMany({
    select: {
      id: true,
      title: true,
      company: true,
      source: true,
      createdAt: true,
      externalId: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b border-slate-700 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Database Debug Dashboard</h1>
            <p className="text-slate-400 mt-1">Inspect jobs, trigger syncs, and clear database tables.</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/debug-view?sync=true"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Trigger API Sync
            </Link>
            <Link
              href="/debug-view?clear=true"
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              onClick={(e) => {
                if (!confirm('Are you sure you want to delete all non-saved/non-applied jobs?')) {
                  e.preventDefault();
                }
              }}
            >
              Clear Database
            </Link>
            <Link
              href="/feed"
              className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Go to Feed
            </Link>
          </div>
        </header>

        {clearResult && (
          <section className={`p-4 rounded-xl border ${clearResult.success ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-rose-950/50 border-rose-800 text-rose-300'}`}>
            <h2 className="font-bold text-lg">Clear Operation Result</h2>
            <pre className="mt-2 text-sm bg-black/30 p-3 rounded overflow-auto font-mono">
              {JSON.stringify(clearResult, null, 2)}
            </pre>
          </section>
        )}

        {syncResult && (
          <section className={`p-4 rounded-xl border ${syncResult.success ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-rose-950/50 border-rose-800 text-rose-300'}`}>
            <h2 className="font-bold text-lg">API Sync Result</h2>
            <pre className="mt-2 text-sm bg-black/30 p-3 rounded overflow-auto font-mono">
              {JSON.stringify(syncResult, null, 2)}
            </pre>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Total Jobs</h3>
            <p className="text-4xl font-extrabold mt-2 text-indigo-400">{totalJobs}</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 md:col-span-2">
            <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Sources Breakdown</h3>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {sources.map((s) => (
                <div key={s.source} className="flex justify-between border-b border-slate-700 pb-1">
                  <span className="font-mono text-slate-300">{s.source}</span>
                  <span className="font-bold text-slate-100">{s._count.id}</span>
                </div>
              ))}
              {sources.length === 0 && (
                <p className="text-slate-500 text-sm">No jobs in database</p>
              )}
            </div>
          </div>
        </section>

        <section className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="font-bold text-xl">Jobs List ({jobs.length})</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-700/50 text-slate-300 sticky top-0">
                <tr>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">External ID</th>
                  <th className="px-6 py-3">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-750">
                    <td className="px-6 py-4 font-semibold text-white">{j.title}</td>
                    <td className="px-6 py-4 text-slate-300">{j.company}</td>
                    <td className="px-6 py-4"><span className="px-2 py-0.5 rounded bg-slate-700 text-xs font-mono">{j.source}</span></td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">{j.externalId || 'null'}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{new Date(j.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No jobs found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
