import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";
import {
  listWikiPages,
  readWikiPage,
  upsertWikiPage,
  deleteWikiPage,
} from "@/lib/wiki/store";
import { isValidWikiPath } from "@/lib/wiki/slug";
import type { WikiSourceRef } from "@/lib/wiki/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) {
    const pages = await listWikiPages(auth.supabase, auth.userId);
    return NextResponse.json({ pages });
  }
  if (!isValidWikiPath(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  const page = await readWikiPage(auth.supabase, auth.userId, path);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ page });
}

export async function POST(req: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;

  let body: {
    path?: string;
    title?: string;
    summary?: string;
    content?: string;
    source_refs?: WikiSourceRef[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { path, title, summary = "", content = "", source_refs = [] } = body;
  if (!path || !isValidWikiPath(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  try {
    const page = await upsertWikiPage(auth.supabase, auth.userId, {
      path,
      title,
      summary,
      content,
      source_refs,
    });
    return NextResponse.json({ page });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  if (!path || !isValidWikiPath(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  // Core pages cannot be deleted.
  if (["overview", "index", "log"].includes(path)) {
    return NextResponse.json({ error: "Cannot delete core page" }, { status: 400 });
  }
  await deleteWikiPage(auth.supabase, auth.userId, path);
  return NextResponse.json({ ok: true });
}
