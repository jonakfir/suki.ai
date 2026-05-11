import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";
import { type OutcomeKey, type ProductDomain } from "@/lib/cohort";

/**
 * POST /api/products/outcomes — upsert a single outcome row for the caller.
 * GET  /api/products/outcomes — list the caller's own outcomes (paginated).
 *
 * Not yet consumed by the v1 scan UI — Agent C's follow-up will wire it into
 * the "How did this product treat you?" prompt that appears 4 weeks after a
 * save. Shipped now so the data model is reachable and migration 010 has a
 * write path beyond the rating-based backfill.
 */

const OUTCOMES: ReadonlySet<OutcomeKey> = new Set<OutcomeKey>([
  "helped",
  "no_change",
  "caused_breakouts",
  "caused_irritation",
  "caused_dryness",
  "caused_oiliness",
  "other_negative",
]);

const DOMAINS: ReadonlySet<ProductDomain> = new Set<ProductDomain>([
  "skincare",
  "haircare",
  "makeup",
]);

const MAX_NOTES_LEN = 500;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

interface OutcomeBody {
  name?: unknown;
  brand?: unknown;
  domain?: unknown;
  outcome?: unknown;
  severity?: unknown;
  after_weeks?: unknown;
  notes?: unknown;
  is_anonymous?: unknown;
}

function asInt(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.trunc(v);
  if (n < min || n > max) return null;
  return n;
}

export async function POST(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;

  let body: OutcomeBody;
  try {
    body = (await request.json()) as OutcomeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const brand = typeof body.brand === "string" ? body.brand.trim() : "";
  if (!name || !brand) {
    return NextResponse.json(
      { error: "Missing name or brand." },
      { status: 400 }
    );
  }

  const domain =
    typeof body.domain === "string" &&
    (DOMAINS as Set<string>).has(body.domain)
      ? (body.domain as ProductDomain)
      : "skincare";

  const outcome =
    typeof body.outcome === "string" &&
    (OUTCOMES as Set<string>).has(body.outcome)
      ? (body.outcome as OutcomeKey)
      : null;
  if (!outcome) {
    return NextResponse.json(
      { error: "Invalid or missing outcome." },
      { status: 400 }
    );
  }

  const severity = body.severity === undefined ? null : asInt(body.severity, 1, 5);
  if (body.severity !== undefined && severity === null) {
    return NextResponse.json(
      { error: "severity must be an integer in [1,5]." },
      { status: 400 }
    );
  }
  const after_weeks =
    body.after_weeks === undefined ? null : asInt(body.after_weeks, 0, 104);
  if (body.after_weeks !== undefined && after_weeks === null) {
    return NextResponse.json(
      { error: "after_weeks must be an integer in [0,104]." },
      { status: 400 }
    );
  }

  const notes =
    typeof body.notes === "string" ? body.notes.trim().slice(0, MAX_NOTES_LEN) : "";
  const is_anonymous =
    typeof body.is_anonymous === "boolean" ? body.is_anonymous : true;

  // ON CONFLICT (user_id, product_key) DO UPDATE — supabase-js translates
  // upsert with `onConflict` into the same statement.
  const { data, error } = await auth.supabase
    .from("product_outcomes")
    .upsert(
      {
        user_id: auth.userId,
        product_name: name,
        brand,
        domain,
        outcome,
        severity,
        after_weeks,
        notes,
        is_anonymous,
      },
      { onConflict: "user_id,product_key" }
    )
    .select()
    .single();

  if (error) {
    console.error("[outcomes] upsert failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ outcome: data });
}

export async function GET(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "", 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const cursor = searchParams.get("cursor"); // ISO timestamp

  let q = auth.supabase
    .from("product_outcomes")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    q = q.lt("created_at", cursor);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[outcomes] list failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const outcomes = rows.slice(0, limit);
  const nextCursor =
    rows.length > limit ? outcomes[outcomes.length - 1]?.created_at ?? null : null;

  return NextResponse.json({ outcomes, nextCursor });
}
