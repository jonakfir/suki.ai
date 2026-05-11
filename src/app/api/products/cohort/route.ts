import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";
import {
  productKey,
  formatCohortLabel,
  type CohortInfo,
  type OutcomeKey,
  type ProductDomain,
} from "@/lib/cohort";

/**
 * POST /api/products/cohort
 *
 * Body: { products: Array<{ name: string; brand: string; domain?: ProductDomain }> }
 *
 * Returns per-product cohort summaries that the scan UI can render under each
 * identified product card.
 *
 * Auth: same `resolveAuth()` helper used by `/api/social/*` (signed admin
 * cookie + Supabase session fallback). The requester's profile is fetched
 * server-side — clients never get to lie about their cohort.
 *
 * Response: `{ results: Array<{ product_key, name, brand, cohort: CohortInfo | null }> }`
 */

interface IncomingProduct {
  name?: unknown;
  brand?: unknown;
  domain?: unknown;
}

interface CohortRow {
  product_key: string;
  sample_size: number;
  positive_pct: number;
  top_outcome: OutcomeKey;
  top_outcome_pct: number;
  is_fallback: boolean;
}

const MAX_PRODUCTS = 24;
const ALLOWED_DOMAINS: ReadonlySet<ProductDomain> = new Set<ProductDomain>([
  "skincare",
  "haircare",
  "makeup",
]);

function asDomain(input: unknown): ProductDomain {
  if (
    typeof input === "string" &&
    (ALLOWED_DOMAINS as Set<string>).has(input)
  ) {
    return input as ProductDomain;
  }
  return "skincare";
}

export async function POST(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;

  let body: { products?: IncomingProduct[] };
  try {
    body = (await request.json()) as { products?: IncomingProduct[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const incoming = Array.isArray(body.products) ? body.products : [];
  if (incoming.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // Normalize + dedupe by product_key (the SQL function dedupes anyway, but
  // we keep the response order tied to the request and avoid sending the
  // same key twice).
  type Normalized = {
    name: string;
    brand: string;
    domain: ProductDomain;
    product_key: string;
  };
  const normalized: Normalized[] = [];
  const seen = new Set<string>();
  for (const raw of incoming.slice(0, MAX_PRODUCTS)) {
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
    if (!name || !brand) continue;
    const domain = asDomain(raw.domain);
    const key = productKey(name, brand, domain);
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ name, brand, domain, product_key: key });
  }

  if (normalized.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const { data: profile } = await auth.supabase
    .from("users_profile")
    .select("skin_type, skin_concerns")
    .eq("user_id", auth.userId)
    .maybeSingle();

  const cohortLabel = formatCohortLabel({
    skin_type: profile?.skin_type ?? null,
    skin_concerns: profile?.skin_concerns ?? null,
  });

  const keys = normalized.map((n) => n.product_key);
  const { data: rpcRows, error: rpcError } = await auth.supabase.rpc(
    "get_product_cohort_stats",
    { p_user_id: auth.userId, p_keys: keys }
  );

  if (rpcError) {
    console.error("[cohort] rpc get_product_cohort_stats failed:", rpcError);
    return NextResponse.json(
      { error: "Failed to compute cohort stats" },
      { status: 500 }
    );
  }

  const byKey = new Map<string, CohortRow>();
  for (const r of (rpcRows ?? []) as CohortRow[]) {
    byKey.set(r.product_key, r);
  }

  const results = normalized.map((p) => {
    const row = byKey.get(p.product_key);
    let cohort: CohortInfo | null = null;
    if (row && row.sample_size > 0) {
      cohort = {
        sample_size: row.sample_size,
        positive_pct: row.positive_pct,
        top_outcome: row.top_outcome,
        top_outcome_pct: row.top_outcome_pct,
        is_fallback: row.is_fallback,
        cohort_label: cohortLabel,
      };
    }
    return {
      product_key: p.product_key,
      name: p.name,
      brand: p.brand,
      cohort,
    };
  });

  return NextResponse.json({ results });
}
