import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueWikiJob } from "@/lib/wiki/store";
import { resolveAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizedForBulk(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  // Two modes:
  // - Logged-in user POSTing → lint just their wiki
  // - Vercel cron with CRON_SECRET → lint all users
  if (authorizedForBulk(req)) {
    const admin = createAdminClient();
    const { data } = await admin.from("user_wiki_pages").select("user_id").limit(1000);
    const users = new Set((data ?? []).map((r) => r.user_id as string));
    const queued: string[] = [];
    for (const uid of users) {
      const job = await enqueueWikiJob(uid, "lint", null, {});
      queued.push(job.id);
    }
    return NextResponse.json({ ok: true, queued: queued.length });
  }

  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;
  const job = await enqueueWikiJob(auth.userId, "lint", null, {});
  return NextResponse.json({ ok: true, job });
}

export async function GET(req: Request) {
  return POST(req);
}
