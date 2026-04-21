import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";
import { readWikiLog } from "@/lib/wiki/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit")) || 50));
  const entries = await readWikiLog(auth.supabase, auth.userId, limit);
  return NextResponse.json({ entries });
}
