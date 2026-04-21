import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";
import { enqueueWikiJob } from "@/lib/wiki/store";
import type { WikiJobKind } from "@/lib/wiki/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: WikiJobKind[] = [
  "product.add",
  "product.update",
  "product.delete",
  "routine.update",
  "profile.update",
  "progress.photo",
  "seed",
];

export async function POST(req: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;

  let body: { kind?: WikiJobKind; ref_id?: string | null; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const kind = body.kind;
  if (!kind || !ALLOWED.includes(kind)) {
    return NextResponse.json({ error: "Bad kind" }, { status: 400 });
  }
  const job = await enqueueWikiJob(auth.userId, kind, body.ref_id ?? null, body.payload ?? {});
  return NextResponse.json({ ok: true, job });
}
