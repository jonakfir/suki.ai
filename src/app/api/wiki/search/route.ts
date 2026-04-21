import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";
import { searchWiki } from "@/lib/wiki/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;
  let body: { query?: string; limit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const query = (body.query ?? "").trim();
  const limit = Math.max(1, Math.min(20, body.limit ?? 8));
  if (!query) return NextResponse.json({ results: [] });
  const results = await searchWiki(auth.supabase, auth.userId, query, limit);
  return NextResponse.json({ results });
}
