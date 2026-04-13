import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { callClaude, isClaudeConfigured } from "@/lib/claude-client";
import { createClient } from "@/lib/supabase/server";
import { searchProducts, type OBFProduct } from "@/lib/open-beauty-facts";

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

/* ── OBF ranking prompt — Claude picks the best matches ── */
const RANK_SYSTEM = `You are a skincare product expert. You will receive a list of real products from a database and a user search query. Pick the 5 most relevant products and return them ranked.

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
- Estimate price_range from your knowledge of the brand/product`;

function buildRankPrompt(query: string, products: OBFProduct[]): string {
  const listing = products
    .map(
      (p, i) =>
        `[${i}] ${p.brand} — ${p.name} (ingredients: ${p.ingredients.slice(0, 8).join(", ")})`
    )
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
  pick: RankPick
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

    /* ── Step 1: Try Open Beauty Facts ── */
    const obfResults = await searchProducts(trimmed);

    /* ── Step 2: If OBF has results, let Claude rank them ── */
    if (obfResults.length > 0) {
      try {
        const { text } = await callClaude({
          system: RANK_SYSTEM,
          prompt: buildRankPrompt(trimmed, obfResults),
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
                p.index < obfResults.length
            )
            .slice(0, 5)
            .map((pick) => enrichProduct(obfResults[pick.index], pick));

          if (products.length > 0) {
            return NextResponse.json({ products });
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
