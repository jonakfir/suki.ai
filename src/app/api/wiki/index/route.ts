import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";
import { listWikiPages } from "@/lib/wiki/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;
  const pages = await listWikiPages(auth.supabase, auth.userId);
  const grouped: Record<string, typeof pages> = {};
  for (const p of pages) {
    const ns = p.path.includes("/") ? p.path.split("/")[0] : "core";
    (grouped[ns] ??= []).push(p);
  }
  return NextResponse.json({ pages, grouped });
}
