// Low-level Supabase-backed CRUD for wiki pages, log, and job queue. All
// callers pass in a Supabase client (either user-scoped with RLS, or the
// service-role admin client from a background worker).

import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient as createServerClient } from "@/lib/supabase/server";
import { isValidWikiPath } from "./slug";
import type {
  WikiPage,
  WikiPageInput,
  WikiJob,
  WikiJobKind,
  WikiLogEntry,
  WikiSourceRef,
} from "./types";

type AnySupabase =
  | Awaited<ReturnType<typeof createServerClient>>
  | ReturnType<typeof createAdminClient>;

// -----------------------------------------------------------------------------
// Pages
// -----------------------------------------------------------------------------

export async function listWikiPages(
  db: AnySupabase,
  userId: string
): Promise<Pick<WikiPage, "path" | "title" | "summary" | "version" | "updated_at">[]> {
  const { data, error } = await db
    .from("user_wiki_pages")
    .select("path, title, summary, version, updated_at")
    .eq("user_id", userId)
    .order("path", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WikiPage[];
}

export async function readWikiPage(
  db: AnySupabase,
  userId: string,
  path: string
): Promise<WikiPage | null> {
  if (!isValidWikiPath(path)) throw new Error(`Invalid wiki path: ${path}`);
  const { data, error } = await db
    .from("user_wiki_pages")
    .select("*")
    .eq("user_id", userId)
    .eq("path", path)
    .maybeSingle();
  if (error) throw error;
  return (data as WikiPage | null) ?? null;
}

export async function upsertWikiPage(
  db: AnySupabase,
  userId: string,
  input: WikiPageInput
): Promise<WikiPage> {
  if (!isValidWikiPath(input.path)) {
    throw new Error(`Invalid wiki path: ${input.path}`);
  }
  if (!input.title?.trim()) throw new Error("Wiki page needs a title");
  if (input.content.length > 40_000) {
    throw new Error(`Wiki page content too large (${input.content.length} bytes)`);
  }

  const row = {
    user_id: userId,
    path: input.path,
    title: input.title.trim(),
    summary: (input.summary ?? "").trim(),
    content: input.content,
    source_refs: input.source_refs ?? [],
  };

  const { data, error } = await db
    .from("user_wiki_pages")
    .upsert(row, { onConflict: "user_id,path" })
    .select("*")
    .single();
  if (error) throw error;
  return data as WikiPage;
}

export async function deleteWikiPage(
  db: AnySupabase,
  userId: string,
  path: string
): Promise<void> {
  const { error } = await db
    .from("user_wiki_pages")
    .delete()
    .eq("user_id", userId)
    .eq("path", path);
  if (error) throw error;
}

/** Full-text search over the user's pages. Simple plainto_tsquery for now. */
export async function searchWiki(
  db: AnySupabase,
  userId: string,
  query: string,
  limit = 8
): Promise<{ path: string; title: string; summary: string; snippet: string }[]> {
  const q = (query || "").trim();
  if (!q) return [];

  // Supabase JS lacks full FTS helpers; use the admin client's RPC-free fallback:
  // we hit textSearch via the built-in ts_vector/tsquery shorthand.
  const { data, error } = await db
    .from("user_wiki_pages")
    .select("path, title, summary, content")
    .eq("user_id", userId)
    .textSearch("content", q, { type: "websearch", config: "english" })
    .limit(limit);
  if (error) {
    // Fallback: ilike search on title + summary for short queries.
    const ilikeTerm = `%${q.replace(/[%_]/g, "")}%`;
    const { data: d2, error: e2 } = await db
      .from("user_wiki_pages")
      .select("path, title, summary, content")
      .eq("user_id", userId)
      .or(`title.ilike.${ilikeTerm},summary.ilike.${ilikeTerm},content.ilike.${ilikeTerm}`)
      .limit(limit);
    if (e2) throw e2;
    return (d2 ?? []).map((p) => ({
      path: p.path as string,
      title: p.title as string,
      summary: p.summary as string,
      snippet: makeSnippet(p.content as string, q),
    }));
  }
  return (data ?? []).map((p) => ({
    path: p.path as string,
    title: p.title as string,
    summary: p.summary as string,
    snippet: makeSnippet(p.content as string, q),
  }));
}

function makeSnippet(content: string, q: string): string {
  if (!content) return "";
  const lc = content.toLowerCase();
  const idx = lc.indexOf(q.toLowerCase());
  const start = idx >= 0 ? Math.max(0, idx - 80) : 0;
  return content.slice(start, start + 240).replace(/\s+/g, " ").trim();
}

// -----------------------------------------------------------------------------
// Log
// -----------------------------------------------------------------------------

export async function appendWikiLog(
  db: AnySupabase,
  userId: string,
  entry: {
    kind: WikiLogEntry["kind"];
    subject: string;
    summary?: string;
    meta?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await db.from("user_wiki_log").insert({
    user_id: userId,
    kind: entry.kind,
    subject: entry.subject,
    summary: entry.summary ?? "",
    meta: entry.meta ?? {},
  });
  if (error) throw error;
}

export async function readWikiLog(
  db: AnySupabase,
  userId: string,
  limit = 50
): Promise<WikiLogEntry[]> {
  const { data, error } = await db
    .from("user_wiki_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WikiLogEntry[];
}

// -----------------------------------------------------------------------------
// Jobs
// -----------------------------------------------------------------------------

export async function enqueueWikiJob(
  userId: string,
  kind: WikiJobKind,
  refId: string | null = null,
  payload: Record<string, unknown> = {}
): Promise<WikiJob> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_wiki_jobs")
    .insert({ user_id: userId, kind, ref_id: refId, payload, status: "queued" })
    .select("*")
    .single();
  if (error) throw error;
  return data as WikiJob;
}

/** Claim the oldest queued job atomically. */
export async function claimNextWikiJob(): Promise<WikiJob | null> {
  const admin = createAdminClient();
  // Two-step: pick one queued job, then mark running with an update that guards
  // against other workers winning the same row.
  const { data: candidates, error: selErr } = await admin
    .from("user_wiki_jobs")
    .select("id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);
  if (selErr) throw selErr;
  const cand = candidates?.[0];
  if (!cand) return null;

  const { data: claimed, error: updErr } = await admin
    .from("user_wiki_jobs")
    .update({ status: "running", started_at: new Date().toISOString(), attempts: 1 })
    .eq("id", cand.id)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();
  if (updErr) throw updErr;
  return (claimed as WikiJob | null) ?? null;
}

export async function finishWikiJob(
  jobId: string,
  result: { status: "done" | "failed"; error?: string }
): Promise<void> {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    status: result.status,
    finished_at: new Date().toISOString(),
  };
  if (result.error) patch.last_error = result.error;
  const { error } = await admin.from("user_wiki_jobs").update(patch).eq("id", jobId);
  if (error) throw error;
}

export async function listRecentJobs(userId: string, limit = 20): Promise<WikiJob[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_wiki_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WikiJob[];
}

export type { WikiPage, WikiPageInput, WikiJob, WikiSourceRef, WikiLogEntry };
