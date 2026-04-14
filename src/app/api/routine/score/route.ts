import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";
import { callClaude, isClaudeConfigured } from "@/lib/claude-client";
import {
  analyzeIngredients,
  scoreSkinFit,
  checkAllergens,
} from "@/lib/ingredient-db";

type Sup =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createAdminClient>;

async function resolveAuth(): Promise<
  { userId: string; supabase: Sup } | { error: Response }
> {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin-session")?.value === "true";
  if (isAdmin) {
    return { userId: ADMIN_USER_ID, supabase: createAdminClient() };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId: user.id, supabase };
}

/* ── helpers ─────────────────────────────────────────────────── */

interface RoutineProduct {
  product_name: string;
  brand: string;
  category: string;
  ingredients: string[];
  image_url?: string;
}

function scoreToGrade(score: number): string {
  if (score >= 7) return "A+";
  if (score >= 5) return "A";
  if (score >= 3) return "B+";
  if (score >= 1) return "B";
  if (score >= -1) return "C";
  if (score >= -4) return "D";
  return "F";
}

interface ScoredProduct {
  product_name: string;
  brand: string;
  category: string;
  image_url: string | null;
  grade: string;
  score: number;
  allergen_flags: string[];
  concerns_addressed: string[];
  warnings: string[];
  has_fragrance: boolean;
  has_alcohol: boolean;
  comedogenic_score: number;
}

function scoreProducts(
  products: RoutineProduct[],
  skinType: string,
  concerns: string[],
  allergies: string[]
): ScoredProduct[] {
  return products.map((p) => {
    const analysis = analyzeIngredients(p.ingredients || []);
    const score = scoreSkinFit(analysis, skinType, concerns);
    const allergen_flags = checkAllergens(p.ingredients || [], allergies);
    return {
      product_name: p.product_name,
      brand: p.brand,
      category: p.category,
      image_url: p.image_url || null,
      grade: scoreToGrade(score),
      score,
      allergen_flags,
      concerns_addressed: analysis.concerns_addressed,
      warnings: analysis.warnings,
      has_fragrance: analysis.has_fragrance,
      has_alcohol: analysis.has_alcohol,
      comedogenic_score: analysis.comedogenic_score,
    };
  });
}

function averageGrade(scored: ScoredProduct[]): { grade: string; score: number } {
  if (scored.length === 0) return { grade: "N/A", score: 0 };
  const avg = scored.reduce((sum, p) => sum + p.score, 0) / scored.length;
  return { grade: scoreToGrade(avg), score: Math.round(avg * 10) / 10 };
}

/* ── route ───────────────────────────────────────────────────── */

export async function POST(request: Request) {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const morning: RoutineProduct[] = body.morning || [];
    const evening: RoutineProduct[] = body.evening || [];

    if (morning.length === 0 && evening.length === 0) {
      return NextResponse.json(
        { error: "Add at least one product to score." },
        { status: 400 }
      );
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json(
        {
          error:
            "AI not configured. Set SUKI_PROXY_URL + SUKI_PROXY_SECRET or ANTHROPIC_API_KEY.",
        },
        { status: 503 }
      );
    }

    // Fetch user profile
    const { data: profile } = await auth.supabase
      .from("users_profile")
      .select("*")
      .eq("user_id", auth.userId)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found. Complete onboarding first." },
        { status: 400 }
      );
    }

    const skinType = profile.skin_type || "normal";
    const concerns: string[] = profile.skin_concerns || [];
    const allergies: string[] = profile.known_allergies || [];

    // Score each product locally
    const scoredMorning = scoreProducts(morning, skinType, concerns, allergies);
    const scoredEvening = scoreProducts(evening, skinType, concerns, allergies);

    const morningAvg = averageGrade(scoredMorning);
    const eveningAvg = averageGrade(scoredEvening);

    // Combined average
    const allScored = [...scoredMorning, ...scoredEvening];
    const overallAvg = averageGrade(allScored);

    // Build Claude prompt for holistic analysis
    const formatProducts = (products: ScoredProduct[], label: string) =>
      products.length === 0
        ? `${label}: (empty)`
        : `${label}:\n${products.map((p, i) => `  ${i + 1}. ${p.product_name} by ${p.brand} (${p.category}) — local grade: ${p.grade} (${p.score}), allergen flags: ${p.allergen_flags.length > 0 ? p.allergen_flags.join(", ") : "none"}, warnings: ${p.warnings.length > 0 ? p.warnings.join(", ") : "none"}, fragrance: ${p.has_fragrance}, alcohol: ${p.has_alcohol}, comedogenic: ${p.comedogenic_score}`).join("\n")}`;

    const prompt = `You are suki., a warm and expert skincare advisor. Analyze this user's current routine and give actionable feedback.

USER PROFILE:
- Skin type: ${skinType}
- Skin concerns: ${concerns.join(", ") || "none specified"}
- Skin tone: ${profile.skin_tone || "not specified"}
- Age range: ${profile.age_range || "not specified"}
- Known allergies/sensitivities: ${allergies.join(", ") || "none"}
- Budget preference: ${profile.budget || "mixed"}
- Routine complexity preference: ${profile.routine_complexity || "moderate"}

CURRENT ROUTINE (with pre-computed ingredient scores):
${formatProducts(scoredMorning, "MORNING")}

${formatProducts(scoredEvening, "EVENING")}

Overall local score: ${overallAvg.grade} (${overallAvg.score})

INSTRUCTIONS:
1. Give a warm overall summary (2-3 sentences) of how this routine fits their skin.
2. For EACH product, give 1-2 sentences of commentary (what's good, what's concerning, how it interacts with other products in the routine).
3. Identify missing routine steps (e.g. no sunscreen in morning, no cleanser in evening) — suggest a specific real product for each gap.
4. Suggest specific replacements for any poorly-fitting products — explain why the replacement is better.
5. Give 2-3 practical tips for using these products together (layering order, timing, etc.).

NEVER recommend products containing: ${allergies.join(", ") || "nothing specific"}
Match the budget preference: ${profile.budget || "mixed"}

Return ONLY valid JSON (no markdown, no preamble, no code blocks) in exactly this shape:
{
  "overall_summary": "string",
  "product_commentary": [
    {
      "product_name": "string",
      "brand": "string",
      "time_of_day": "morning" | "evening",
      "commentary": "string",
      "grade_adjustment": "string or null"
    }
  ],
  "missing_steps": [
    {
      "time_of_day": "morning" | "evening",
      "category": "string",
      "reason": "string",
      "suggestion": {
        "name": "string",
        "brand": "string",
        "reason": "string",
        "price_range": "string"
      }
    }
  ],
  "replacements": [
    {
      "replace_product": "string",
      "replace_brand": "string",
      "time_of_day": "morning" | "evening",
      "with_name": "string",
      "with_brand": "string",
      "with_category": "string",
      "reason": "string",
      "price_range": "string"
    }
  ],
  "tips": ["string"]
}`;

    const result = await callClaude({
      system:
        "You are suki., a warm and knowledgeable skincare advisor. Return ONLY valid JSON, no markdown or preamble.",
      prompt,
      model: "claude-sonnet-4-6",
      maxTokens: 2500,
    });

    let parsed;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    // Merge Claude commentary into scored products
    const commentary = parsed.product_commentary || [];
    for (const c of commentary) {
      const target = [...scoredMorning, ...scoredEvening].find(
        (p) =>
          p.product_name.toLowerCase() === (c.product_name || "").toLowerCase() &&
          p.brand.toLowerCase() === (c.brand || "").toLowerCase()
      );
      if (target) {
        (target as ScoredProduct & { commentary?: string }).commentary =
          c.commentary || "";
      }
    }

    return NextResponse.json({
      overall_grade: overallAvg.grade,
      overall_score: overallAvg.score,
      overall_summary: parsed.overall_summary || "",
      morning: {
        grade: morningAvg.grade,
        score: morningAvg.score,
        products: scoredMorning,
      },
      evening: {
        grade: eveningAvg.grade,
        score: eveningAvg.score,
        products: scoredEvening,
      },
      missing_steps: parsed.missing_steps || [],
      replacements: parsed.replacements || [],
      tips: parsed.tips || [],
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Routine scoring failed:", msg);
    return NextResponse.json(
      { error: "Failed to score routine", detail: msg },
      { status: 500 }
    );
  }
}
