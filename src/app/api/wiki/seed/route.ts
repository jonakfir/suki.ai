import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";
import { seedWikiForUser } from "@/lib/wiki/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;
  try {
    const out = await seedWikiForUser(auth.userId);
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
