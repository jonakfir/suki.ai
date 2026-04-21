import { NextResponse } from "next/server";
import { claimNextWikiJob, finishWikiJob } from "@/lib/wiki/store";
import { runMaintainerJob } from "@/lib/wiki/maintainer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Shared auth: either a logged-in session (any user may drain a single job,
// typically their own right after enqueuing) or a CRON_SECRET header for the
// Vercel cron that drains across all users.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode — allow
  const got = req.headers.get("authorization");
  return got === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const batch = Math.max(1, Math.min(10, Number(searchParams.get("batch")) || 1));

  const results: { job_id: string; status: string; summary?: string; error?: string }[] = [];
  for (let i = 0; i < batch; i++) {
    const job = await claimNextWikiJob();
    if (!job) break;
    try {
      const out = await runMaintainerJob(job);
      await finishWikiJob(job.id, { status: "done" });
      results.push({ job_id: job.id, status: "done", summary: out.summary });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await finishWikiJob(job.id, { status: "failed", error: msg });
      results.push({ job_id: job.id, status: "failed", error: msg });
    }
  }
  return NextResponse.json({ ok: true, drained: results.length, results });
}

export async function GET(req: Request) {
  return POST(req);
}
