import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";
import { callClaude, isClaudeConfigured } from "@/lib/claude-client";

type Sup = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

export interface PlanStep {
  order: number;
  time_of_day: "morning" | "evening" | "weekly";
  product_name: string;
  brand: string;
  category: string;
  how_to: string;
  frequency: string;
  amount: string;
  why_it_matters: string;
}

export interface RoutinePlan {
  greeting: string;
  morning: PlanStep[];
  evening: PlanStep[];
  weekly: PlanStep[];
  rules: string[];
  avoid_pairings: string[];
  watch_out_for: string[];
  encouragement: string;
  generated_at: string;
}

export async function POST() {
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

    const [profileRes, productsRes, recsRes] = await Promise.all([
      supabase.from("users_profile").select("*").eq("user_id", userId).single(),
      supabase.from("user_products").select("*").eq("user_id", userId),
      supabase
        .from("recommendations")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "add")
        .eq("is_dismissed", false),
    ]);

    const profile = profileRes.data;
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found. Complete onboarding first." },
        { status: 400 }
      );
    }
    const products = (productsRes.data || []) as Array<{
      product_name: string;
      brand: string;
      category: string;
      is_current: boolean;
      rating: string;
      ingredients: string[];
    }>;
    const recs = (recsRes.data || []) as Array<{
      product_suggestion: { name: string; brand: string; category: string };
    }>;

    const currentRoutine = products.filter((p) => p.is_current);
    const lovedProducts = products.filter((p) => p.rating === "love");

    const prompt = `You are suki., a warm, smart older-sister skincare advisor. Build a personalised routine plan.

USER PROFILE:
- Skin type: ${profile.skin_type}
- Concerns: ${(profile.skin_concerns || []).join(", ") || "none"}
- Tone: ${profile.skin_tone || "—"}
- Age: ${profile.age_range || "—"}
- Allergies: ${(profile.known_allergies || []).join(", ") || "none"}
- Budget: ${profile.budget || "mixed"}
- Complexity: ${profile.routine_complexity || "moderate"}

CURRENT ROUTINE:
${currentRoutine.map((p) => `- ${p.product_name} by ${p.brand} (${p.category})`).join("\n") || "Nothing yet"}

LOVED PRODUCTS:
${lovedProducts.map((p) => `- ${p.product_name} by ${p.brand}`).join("\n") || "None yet"}

SUKI'S TOP RECOMMENDED ADDS:
${recs.map((r) => `- ${r.product_suggestion.name} by ${r.product_suggestion.brand} (${r.product_suggestion.category})`).join("\n") || "None generated yet"}

Build a full morning / evening / weekly routine using a mix of her current products and the recommended adds. Match her complexity preference (${profile.routine_complexity}):
- "minimal" → 3-4 steps AM, 3-4 PM, 0-1 weekly
- "moderate" → 5-6 steps AM, 5-6 PM, 1-2 weekly
- "full" → 7-9 steps AM, 7-9 PM, 2-3 weekly

Return ONLY valid JSON in this exact shape, no markdown, no preamble:
{
  "greeting": "one short warm opener using 'you' (1 sentence, friendly older-sister tone)",
  "morning": [
    {
      "order": 1,
      "time_of_day": "morning",
      "product_name": "string",
      "brand": "string",
      "category": "cleanser|toner|serum|moisturizer|sunscreen|exfoliant|eye_cream|oil|treatment|other",
      "how_to": "short instruction (how to apply)",
      "frequency": "e.g. 'Daily' | 'Every other day' | 'Only on non-retinol days'",
      "amount": "e.g. 'pea-sized' | '2-3 drops' | 'two finger lengths'",
      "why_it_matters": "one short sentence, warm, personal"
    }
  ],
  "evening": [ ...same shape, time_of_day:"evening" ],
  "weekly": [ ...same shape, time_of_day:"weekly" ],
  "rules": ["3-5 short actionable rules like 'Always SPF in the morning — yes, even inside'"],
  "avoid_pairings": ["2-3 things not to use together, e.g. 'Retinol + strong acids same night'"],
  "watch_out_for": ["2-3 warning signs tailored to her skin, e.g. 'Flaking after retinol week 1 is normal — slow down if it stings'"],
  "encouragement": "one warm closing sentence"
}

Tone: warm, smart, zero condescension, girly without being juvenile. Use "you" not "the user". No emojis.`;

    const { text } = await callClaude({
      system: "You are suki., a warm, smart skincare advisor. Return ONLY valid JSON.",
      prompt,
      maxTokens: 3000,
    });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "No JSON in response" }, { status: 500 });
    }
    const parsed = JSON.parse(match[0]) as RoutinePlan;

    const plan: RoutinePlan = {
      greeting: parsed.greeting || "",
      morning: parsed.morning || [],
      evening: parsed.evening || [],
      weekly: parsed.weekly || [],
      rules: parsed.rules || [],
      avoid_pairings: parsed.avoid_pairings || [],
      watch_out_for: parsed.watch_out_for || [],
      encouragement: parsed.encouragement || "",
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Plan generation failed:", error);
    const msg = error instanceof Error ? error.message : "Plan failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
