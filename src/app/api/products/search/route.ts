import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { callClaude, isClaudeConfigured } from "@/lib/claude-client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";
import { searchProducts, type OBFProduct } from "@/lib/open-beauty-facts";
import {
  analyzeIngredients,
  checkAllergens,
  scoreSkinFit,
  type IngredientAnalysis,
} from "@/lib/ingredient-db";

/* ── Claude-only fallback prompt (original behavior) ── */
const FALLBACK_SYSTEM = `You are a skincare product knowledge base. When given a search query, return 5 real, commonly available skincare products that match. Prefer well-known brands (CeraVe, The Ordinary, La Roche-Posay, Paula's Choice, COSRX, Neutrogena, Kiehl's, Drunk Elephant, Tatcha, SkinCeuticals, etc.).

Return ONLY valid JSON in this exact shape, no preamble:
{
  "products": [
    {
      "product_name": "string",
      "brand": "string",
      "category": "cleanser|toner|serum|moisturizer|sunscreen|exfoliant|mask|eye_cream|oil|treatment|other",
      "ingredients": ["string", "string"],
      "price_range": "$X-Y",
      "description": "one short sentence"
    }
  ]
}

Rules:
- Real products only, no fictional ones
- "ingredients" should list 3-6 key actives (not the full INCI list)
- "category" must exactly match one of the allowed values
- Keep descriptions under 15 words`;

/* ── Response shape for ingredient analysis ── */
interface ProductIngredientAnalysis {
  concerns_addressed: string[];
  warnings: string[];
  skin_fit_score: number;
  has_fragrance: boolean;
  comedogenic_score: number;
}

/* ── OBF ranking prompt — Claude picks the best matches ── */
const RANK_SYSTEM = `You are a skincare product expert. You will receive a list of real products from a database and a user search query. Each product may include ingredient analysis data (skin fit score, warnings, concerns addressed). Use this data to make better picks — prefer products with higher skin fit scores and fewer warnings.

For each product, return the category (must be one of: cleanser, toner, serum, moisturizer, sunscreen, exfoliant, mask, eye_cream, oil, treatment, other), an estimated price range, and a short description.

Return ONLY valid JSON in this exact shape, no preamble:
{
  "picks": [
    {
      "index": 0,
      "category": "serum",
      "price_range": "$X-Y",
      "description": "one short sentence"
    }
  ]
}

Rules:
- "index" is the zero-based index from the product list provided
- Pick at most 5, fewer if the list is small
- "description" under 15 words
- Estimate price_range from your knowledge of the brand/product
- Prefer products with higher skin_fit_score and fewer warnings`;

interface AnalysisWithScore {
  analysis: IngredientAnalysis;
  skin_fit_score: number;
}

function buildRankPrompt(
  query: string,
  products: OBFProduct[],
  analysisMap?: Map<number, AnalysisWithScore>
): string {
  const listing = products
    .map((p, i) => {
      let line = `[${i}] ${p.brand} — ${p.name} (ingredients: ${p.ingredients.slice(0, 8).join(", ")})`;
      const entry = analysisMap?.get(i);
      if (entry) {
        line += ` | skin_fit_score: ${entry.skin_fit_score}`;
        if (entry.analysis.concerns_addressed.length > 0) {
          line += ` | addresses: ${entry.analysis.concerns_addressed.join(", ")}`;
        }
        if (entry.analysis.warnings.length > 0) {
          line += ` | warnings: ${entry.analysis.warnings.join("; ")}`;
        }
      }
      return line;
    })
    .join("\n");
  return `Search query: "${query}"\n\nProducts:\n${listing}`;
}

interface RankPick {
  index: number;
  category: string;
  price_range: string;
  description: string;
}

function enrichProduct(
  obf: OBFProduct,
  pick: RankPick,
  ingredientAnalysis?: ProductIngredientAnalysis
): Record<string, unknown> {
  const q = `${obf.brand} ${obf.name}`.trim();
  const buy_url = q
    ? `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`
    : null;
  return {
    product_name: obf.name,
    brand: obf.brand,
    category: pick.category,
    ingredients: obf.ingredients.slice(0, 8),
    price_range: pick.price_range,
    description: pick.description,
    buy_url,
    image_url: obf.image_url,
    barcode: obf.barcode,
    source: "open_beauty_facts",
    ...(ingredientAnalysis ? { ingredient_analysis: ingredientAnalysis } : {}),
  };
}

/**
 * Fetch the authenticated user's skin profile (skin_type, skin_concerns,
 * known_allergies). Returns null fields when the profile doesn't exist or
 * the user is unauthenticated — callers should treat null as "skip".
 */
async function fetchUserProfile(isAdmin: boolean): Promise<{
  skinType: string | null;
  skinConcerns: string[];
  knownAllergies: string[];
}> {
  const empty = { skinType: null, skinConcerns: [], knownAllergies: [] };
  try {
    const supabase = isAdmin ? createAdminClient() : await createClient();
    const userId = isAdmin
      ? ADMIN_USER_ID
      : (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return empty;
    const { data } = await supabase
      .from("users_profile")
      .select("skin_type, skin_concerns, known_allergies")
      .eq("user_id", userId)
      .single();
    if (!data) return empty;
    return {
      skinType: data.skin_type ?? null,
      skinConcerns: data.skin_concerns ?? [],
      knownAllergies: data.known_allergies ?? [],
    };
  } catch {
    return empty;
  }
}

/**
 * Run ingredient analysis on a list of OBF products. Returns a map from
 * product index to its analysis + skin-fit score.
 */
function analyzeProducts(
  products: OBFProduct[],
  skinType: string | null,
  concerns: string[]
): Map<number, AnalysisWithScore> {
  const map = new Map<number, AnalysisWithScore>();
  for (let i = 0; i < products.length; i++) {
    const analysis = analyzeIngredients(products[i].ingredients);
    const skin_fit_score = scoreSkinFit(analysis, skinType ?? "normal", concerns);
    map.set(i, { analysis, skin_fit_score });
  }
  return map;
}

/**
 * Convert an AnalysisWithScore into the response-friendly shape.
 */
function toProductAnalysis(entry: AnalysisWithScore): ProductIngredientAnalysis {
  return {
    concerns_addressed: entry.analysis.concerns_addressed,
    warnings: entry.analysis.warnings,
    skin_fit_score: entry.skin_fit_score,
    has_fragrance: entry.analysis.has_fragrance,
    comedogenic_score: entry.analysis.comedogenic_score,
  };
}

export async function POST(request: Request) {
  try {
    /* ── Auth ── */
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get("admin-session")?.value === "true";
    if (!isAdmin) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query } = await request.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json({ error: "Query too short" }, { status: 400 });
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json(
        { error: "Claude not configured" },
        { status: 503 }
      );
    }

    const trimmed = query.trim();

    /* ── Fetch user profile (non-blocking — falls back to defaults) ── */
    const { skinType, skinConcerns, knownAllergies } =
      await fetchUserProfile(isAdmin);

    /* ── Step 1: Try Open Beauty Facts ── */
    const obfResults = await searchProducts(trimmed);

    /* ── Step 2: If OBF has results, run ingredient analysis & let Claude rank ── */
    if (obfResults.length > 0) {
      try {
        /* ── 2a: Ingredient analysis on every OBF result ── */
        const analysisMap = analyzeProducts(obfResults, skinType, skinConcerns);

        /* ── 2b: Allergen filtering — remove products that match known allergies ── */
        let filteredProducts = obfResults;
        let filteredAnalysisMap = analysisMap;

        if (knownAllergies.length > 0) {
          const safeIndices: number[] = [];
          for (let i = 0; i < obfResults.length; i++) {
            const hits = checkAllergens(obfResults[i].ingredients, knownAllergies);
            if (hits.length === 0) {
              safeIndices.push(i);
            }
          }
          filteredProducts = safeIndices.map((i) => obfResults[i]);
          filteredAnalysisMap = new Map<number, AnalysisWithScore>();
          safeIndices.forEach((origIdx, newIdx) => {
            const entry = analysisMap.get(origIdx);
            if (entry) filteredAnalysisMap.set(newIdx, entry);
          });
        }

        if (filteredProducts.length === 0) {
          // All products filtered out by allergens — fall through to Claude-only
        } else {
          /* ── 2c: Claude ranking with ingredient intelligence ── */
          const { text } = await callClaude({
            system: RANK_SYSTEM,
            prompt: buildRankPrompt(trimmed, filteredProducts, filteredAnalysisMap),
            maxTokens: 800,
          });

          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]) as { picks: RankPick[] };
            const products = (parsed.picks ?? [])
              .filter(
                (p) =>
                  typeof p.index === "number" &&
                  p.index >= 0 &&
                  p.index < filteredProducts.length
              )
              .slice(0, 5)
              .map((pick) => {
                const entry = filteredAnalysisMap.get(pick.index);
                return enrichProduct(
                  filteredProducts[pick.index],
                  pick,
                  entry ? toProductAnalysis(entry) : undefined
                );
              });

            if (products.length > 0) {
              return NextResponse.json({ products });
            }
          }
        }
      } catch (rankErr) {
        console.warn("OBF ranking failed, falling back to Claude-only:", rankErr);
      }
    }

    /* ── Step 3: Fallback — Claude-only search (original behavior) ── */
    const { text } = await callClaude({
      system: FALLBACK_SYSTEM,
      prompt: `Search query: "${trimmed}"`,
      maxTokens: 1500,
    });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json(
        { error: "No JSON in response" },
        { status: 500 }
      );
    }
    const parsed = JSON.parse(match[0]) as {
      products: Array<{
        product_name: string;
        brand: string;
        category: string;
        ingredients: string[];
        price_range: string;
        description: string;
      }>;
    };

    const enriched = (parsed.products ?? []).map((p) => {
      const q = `${p.brand} ${p.product_name}`.trim();
      const buy_url = q
        ? `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`
        : null;
      const tags = ["skincare", p.category, "beauty"].filter(Boolean).join(",");
      const seed = encodeURIComponent(
        `${p.brand}-${p.product_name}`
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
      );
      const image_url = `https://loremflickr.com/400/500/${encodeURIComponent(tags)}?lock=${seed.length}`;
      return { ...p, buy_url, image_url, source: "claude" };
    });
    return NextResponse.json({ products: enriched });
  } catch (error) {
    console.error("Product search failed:", error);
    const msg = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
