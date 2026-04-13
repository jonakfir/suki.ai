import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";
import { callClaude, isClaudeConfigured } from "@/lib/claude-client";

type Sup = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

interface Suggestion {
  name: string;
  brand: string;
  category: string;
  reason: string;
  price_range?: string;
  key_ingredients?: string[];
  budget_tier?: string;
  complexity_impact?: string;
  buy_url?: string | null;
  image_url?: string | null;
}

function enrich(item: Suggestion): Suggestion {
  const q = `${item.brand} ${item.name}`.trim();
  const buy_url = q
    ? `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`
    : null;
  const tags = ["skincare", item.category, "beauty"].filter(Boolean).join(",");
  const seed = encodeURIComponent(`${item.brand}-${item.name}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"));
  const image_url = `https://loremflickr.com/400/500/${encodeURIComponent(tags)}?lock=${seed.length}`;
  return { ...item, buy_url, image_url };
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get("admin-session")?.value === "true";
    let userId: string;
    let supabase: Sup;

    if (isAdmin) {
      userId = ADMIN_USER_ID;
      supabase = createAdminClient();
    } else {
      supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      userId = user.id;
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const { recId } = await request.json();
    if (!recId) return NextResponse.json({ error: "Missing recId" }, { status: 400 });

    const { data: rec } = await supabase
      .from("recommendations")
      .select("*")
      .eq("id", recId)
      .eq("user_id", userId)
      .single();

    if (!rec) return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });

    const [profileRes, allRecsRes, productsRes] = await Promise.all([
      supabase.from("users_profile").select("*").eq("user_id", userId).single(),
      supabase.from("recommendations").select("*").eq("user_id", userId),
      supabase.from("user_products").select("*").eq("user_id", userId),
    ]);

    const profile = profileRes.data;
    const allRecs = (allRecsRes.data || []) as Array<{ id: string; product_suggestion: Suggestion }>;
    const products = (productsRes.data || []) as Array<{ brand: string; product_name: string; rating: string; ingredients?: string[] }>;
    const currentSuggestion: Suggestion = rec.product_suggestion;
    const alreadyInList = allRecs
      .filter((r) => r.id !== rec.id)
      .map((r) => `${r.product_suggestion.brand} ${r.product_suggestion.name}`);
    const badReactions = products.filter((p) => p.rating === "bad_reaction");

    const prompt = `The user wants to SWAP a recommended skincare product for an alternative. Suggest ONE different product in the same category at a similar price point, respecting their profile.

USER PROFILE:
- Skin type: ${profile?.skin_type ?? "unknown"}
- Skin concerns: ${(profile?.skin_concerns || []).join(", ") || "none"}
- Age range: ${profile?.age_range ?? "unknown"}
- Allergies: ${(profile?.known_allergies || []).join(", ") || "none"}
- Budget preference: ${profile?.budget ?? "mixed"}
- Routine complexity: ${profile?.routine_complexity ?? "moderate"}

CURRENT RECOMMENDATION (swap this OUT):
${currentSuggestion.brand} — ${currentSuggestion.name}
Category: ${currentSuggestion.category}
Budget tier: ${currentSuggestion.budget_tier || "unknown"}

PRODUCTS ALREADY IN THE USER'S LIST (do NOT suggest these):
${alreadyInList.join("\n") || "—"}
${currentSuggestion.brand} ${currentSuggestion.name}

PRODUCTS THAT CAUSED BAD REACTIONS (avoid these ingredients/formulas):
${badReactions.map((p) => `- ${p.product_name} by ${p.brand}`).join("\n") || "none"}

Return ONLY valid JSON (no markdown, no preamble) in this exact shape:
{
  "name": "string",
  "brand": "string",
  "category": "${currentSuggestion.category}",
  "reason": "one short warm sentence explaining why this one fits her",
  "price_range": "$X-Y",
  "key_ingredients": ["string","string","string"],
  "budget_tier": "${currentSuggestion.budget_tier || "mid-range"}",
  "complexity_impact": "minimal" | "moderate" | "adds steps"
}

Real products only. Different brand or formula from the swap-out.`;

    const { text } = await callClaude({
      system: "You are suki., a warm skincare advisor. Return ONLY valid JSON.",
      prompt,
      maxTokens: 600,
    });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "No JSON in response" }, { status: 500 });
    const newSuggestion = enrich(JSON.parse(match[0]) as Suggestion);

    const { data: updated } = await supabase
      .from("recommendations")
      .update({
        product_suggestion: newSuggestion,
        generated_at: new Date().toISOString(),
      })
      .eq("id", recId)
      .eq("user_id", userId)
      .select()
      .single();

    return NextResponse.json({ recommendation: updated });
  } catch (error) {
    console.error("Swap failed:", error);
    const msg = error instanceof Error ? error.message : "Swap failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
