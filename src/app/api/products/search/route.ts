import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { callClaude, isClaudeConfigured } from "@/lib/claude-client";
import { createClient } from "@/lib/supabase/server";

const SYSTEM = `You are a skincare product knowledge base. When given a search query, return 5 real, commonly available skincare products that match. Prefer well-known brands (CeraVe, The Ordinary, La Roche-Posay, Paula's Choice, COSRX, Neutrogena, Kiehl's, Drunk Elephant, Tatcha, SkinCeuticals, etc.).

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

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get("admin-session")?.value === "true";
    if (!isAdmin) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query } = await request.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json({ error: "Query too short" }, { status: 400 });
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json({ error: "Claude not configured" }, { status: 503 });
    }

    const { text } = await callClaude({
      system: SYSTEM,
      prompt: `Search query: "${query.trim()}"`,
      maxTokens: 1500,
    });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "No JSON in response" }, { status: 500 });
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
      const seed = encodeURIComponent(`${p.brand}-${p.product_name}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"));
      const image_url = `https://loremflickr.com/400/500/${encodeURIComponent(tags)}?lock=${seed.length}`;
      return { ...p, buy_url, image_url };
    });
    return NextResponse.json({ products: enriched });
  } catch (error) {
    console.error("Product search failed:", error);
    const msg = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
