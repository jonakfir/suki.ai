import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";
import { callClaude, isClaudeConfigured } from "@/lib/claude-client";

type Sup = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

interface PlanStep {
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

    const body = await request.json();
    const currentStep = body.step as PlanStep | undefined;
    const usedNames: string[] = Array.isArray(body.usedNames) ? body.usedNames : [];
    if (!currentStep || !currentStep.product_name) {
      return NextResponse.json({ error: "Missing step" }, { status: 400 });
    }

    const profileRes = await supabase
      .from("users_profile")
      .select("*")
      .eq("user_id", userId)
      .single();
    const profile = profileRes.data;

    const prompt = `The user wants to SWAP one step in her skincare routine for a different product. Replace it with ONE alternative in the same category and time-of-day, tailored to her.

USER PROFILE:
- Skin type: ${profile?.skin_type ?? "unknown"}
- Skin concerns: ${(profile?.skin_concerns || []).join(", ") || "none"}
- Age range: ${profile?.age_range ?? "unknown"}
- Allergies: ${(profile?.known_allergies || []).join(", ") || "none"}
- Budget: ${profile?.budget ?? "mixed"}
- Routine complexity: ${profile?.routine_complexity ?? "moderate"}

CURRENT STEP (swap this out):
- ${currentStep.brand} — ${currentStep.product_name}
- Category: ${currentStep.category}
- Time of day: ${currentStep.time_of_day}
- Frequency: ${currentStep.frequency}

ALREADY IN THIS ROUTINE (do NOT suggest these):
${usedNames.join("\n") || "—"}
${currentStep.brand} ${currentStep.product_name}

Return ONLY valid JSON (no markdown, no preamble) in this exact shape:
{
  "order": ${currentStep.order},
  "time_of_day": "${currentStep.time_of_day}",
  "product_name": "string",
  "brand": "string",
  "category": "${currentStep.category}",
  "how_to": "short how-to instruction",
  "frequency": "string",
  "amount": "string",
  "why_it_matters": "one short warm sentence personal to her"
}

Real products only. Different brand or formula from the swap-out.`;

    const { text } = await callClaude({
      system: "You are suki., a warm skincare advisor. Return ONLY valid JSON.",
      prompt,
      maxTokens: 500,
    });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "No JSON in response" }, { status: 500 });
    }
    const step = JSON.parse(match[0]) as PlanStep;
    step.time_of_day = currentStep.time_of_day;
    step.order = currentStep.order;

    return NextResponse.json({ step });
  } catch (error) {
    console.error("Plan swap failed:", error);
    const msg = error instanceof Error ? error.message : "Plan swap failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
