import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";
import { callClaude, isClaudeConfigured } from "@/lib/claude-client";

type Sup = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

async function resolveAuth(): Promise<
  { userId: string; supabase: Sup } | { error: Response }
> {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin-session")?.value === "true";
  if (isAdmin) {
    return { userId: ADMIN_USER_ID, supabase: createAdminClient() };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId: user.id, supabase };
}

export async function GET() {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.supabase
    .from("recommendations")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ recommendations: data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;
  const { id, is_dismissed } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await auth.supabase
    .from("recommendations")
    .update({ is_dismissed: is_dismissed ?? true })
    .eq("id", id)
    .eq("user_id", auth.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get("admin-session")?.value === "true";

    let userId: string;
    let supabase;

    if (isAdmin) {
      userId = ADMIN_USER_ID;
      supabase = createAdminClient();
    } else {
      supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = user.id;
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json(
        { error: "AI not configured. Set SUKI_PROXY_URL + SUKI_PROXY_SECRET or ANTHROPIC_API_KEY." },
        { status: 503 }
      );
    }

    // Fetch profile and products
    const [profileRes, productsRes] = await Promise.all([
      supabase
        .from("users_profile")
        .select("*")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("user_products")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (!profileRes.data) {
      return NextResponse.json(
        { error: "Profile not found. Complete onboarding first." },
        { status: 400 }
      );
    }

    const profile = profileRes.data;
    const products = productsRes.data || [];

    const lovedProducts = products.filter(
      (p: { rating: string }) => p.rating === "love"
    );
    const badProducts = products.filter(
      (p: { rating: string }) => p.rating === "bad_reaction"
    );
    const currentProducts = products.filter(
      (p: { is_current: boolean }) => p.is_current
    );

    const prompt = `You are suki., a warm and knowledgeable skincare advisor. Based on this user's skin profile and product history, generate personalized skincare recommendations.

USER PROFILE:
- Skin type: ${profile.skin_type}
- Skin concerns: ${(profile.skin_concerns || []).join(", ") || "none specified"}
- Skin tone: ${profile.skin_tone || "not specified"}
- Age range: ${profile.age_range || "not specified"}
- Known allergies/sensitivities: ${(profile.known_allergies || []).join(", ") || "none"}
- Budget preference: ${profile.budget || "mixed"}
- Routine complexity preference: ${profile.routine_complexity || "moderate"}

PRODUCTS THEY LOVE:
${lovedProducts.map((p: { product_name: string; brand: string; category: string; ingredients: string[] }) => `- ${p.product_name} by ${p.brand} (${p.category}) — ingredients: ${(p.ingredients || []).join(", ") || "unknown"}`).join("\n") || "None logged yet"}

PRODUCTS THAT CAUSED BAD REACTIONS:
${badProducts.map((p: { product_name: string; brand: string; notes: string; ingredients: string[] }) => `- ${p.product_name} by ${p.brand} — notes: ${p.notes || "none"} — ingredients: ${(p.ingredients || []).join(", ") || "unknown"}`).join("\n") || "None logged yet"}

CURRENT ROUTINE:
${currentProducts.map((p: { product_name: string; brand: string; category: string }) => `- ${p.product_name} by ${p.brand} (${p.category})`).join("\n") || "No current routine"}

IMPORTANT:
- NEVER recommend products containing ingredients the user is allergic to
- Match the budget preference (${profile.budget})
- Match the routine complexity preference (${profile.routine_complexity})
- Learn from products they love (similar ingredients/brands are good)
- Learn from bad reactions (avoid similar ingredients/formulations)
- Be specific with real product names and brands
- Explain WHY each product works for their specific skin in 1-2 warm sentences

Return ONLY valid JSON (no markdown, no preamble, no code blocks) in exactly this shape:
{
  "add": [
    {
      "name": "string",
      "brand": "string",
      "category": "string",
      "reason": "string",
      "price_range": "string",
      "key_ingredients": ["string"],
      "budget_tier": "drugstore" | "mid-range" | "luxury",
      "complexity_impact": "minimal" | "moderate" | "adds steps"
    }
  ],
  "avoid": [
    {
      "name": "string",
      "brand": "string",
      "category": "string",
      "reason": "string",
      "key_ingredients": ["string"]
    }
  ]
}

Return exactly 5 items in "add" and 5 items in "avoid".`;

    const result = await callClaude({
      system: "You are suki., a warm and knowledgeable skincare advisor. Return ONLY valid JSON, no markdown or preamble.",
      prompt,
      model: "claude-sonnet-4-6",
      maxTokens: 2000,
    });

    const responseText = result.text;

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    await supabase
      .from("recommendations")
      .delete()
      .eq("user_id", userId);

    const enrich = (item: Record<string, unknown>) => {
      const name = typeof item.name === "string" ? item.name : "";
      const brand = typeof item.brand === "string" ? item.brand : "";
      const category = typeof item.category === "string" ? item.category : "";
      const q = `${brand} ${name}`.trim();
      const buy_url = q
        ? `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`
        : null;
      const tags = ["skincare", category, "beauty"].filter(Boolean).join(",");
      const seed = encodeURIComponent(`${brand}-${name}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"));
      const image_url = `https://loremflickr.com/400/500/${encodeURIComponent(tags)}?lock=${seed.length}`;
      return { ...item, buy_url, image_url };
    };

    const now = new Date().toISOString();
    const recsToInsert = [
      ...(parsed.add || []).map((item: Record<string, unknown>) => ({
        user_id: userId,
        type: "add" as const,
        product_suggestion: enrich(item),
        generated_at: now,
        is_dismissed: false,
      })),
      ...(parsed.avoid || []).map((item: Record<string, unknown>) => ({
        user_id: userId,
        type: "avoid" as const,
        product_suggestion: enrich(item),
        generated_at: now,
        is_dismissed: false,
      })),
    ];

    const { data: inserted } = await supabase
      .from("recommendations")
      .insert(recsToInsert)
      .select();

    return NextResponse.json({ recommendations: inserted });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Recommendation generation failed:", msg);
    return NextResponse.json(
      { error: "Failed to generate recommendations", detail: msg },
      { status: 500 }
    );
  }
}
