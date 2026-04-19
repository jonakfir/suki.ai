import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";

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

export async function POST(request: Request) {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;
    const { userId, supabase } = auth;

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      imageBase64,
      mediaType,
      mode = "routine",
    } = body as {
      imageBase64: string;
      mediaType: string;
      mode?: "routine" | "catalog";
    };

    if (!imageBase64 || !mediaType) {
      return NextResponse.json(
        { error: "Missing imageBase64 or mediaType." },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });
    const imageSource = {
      type: "base64" as const,
      media_type: mediaType as
        | "image/jpeg"
        | "image/png"
        | "image/gif"
        | "image/webp",
      data: imageBase64,
    };

    // ── Catalog mode ──────────────────────────────────────────────────────────
    // Used by the onboarding flow to sort all visible products into three
    // buckets: skincare / hair / makeup.
    if (mode === "catalog") {
      const response = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 1500,
        system:
          "You are a beauty product expert. Identify and categorize beauty products from photos. Return ONLY valid JSON, no markdown or preamble.",
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: imageSource },
              {
                type: "text",
                text: `Identify every beauty product visible in this image. Sort them into three groups: Skincare, Hair care, and Makeup/cosmetics.

Return ONLY valid JSON (no markdown, no preamble, no code blocks) in exactly this shape:
{
  "skincare": [
    { "name": "product name (best guess if unclear)", "brand": "brand name or 'Unknown'", "category": "cleanser|toner|serum|moisturizer|sunscreen|exfoliant|mask|eye_cream|oil|treatment|other", "notes": "one sentence about what it does" }
  ],
  "hair": [
    { "name": "product name", "brand": "brand name or 'Unknown'", "category": "shampoo|conditioner|hair_mask|hair_oil|styling|scalp_treatment|other", "notes": "one sentence about what it does" }
  ],
  "makeup": [
    { "name": "product name", "brand": "brand name or 'Unknown'", "category": "foundation|concealer|blush|eyeshadow|mascara|lipstick|lip_gloss|powder|bronzer|highlighter|primer|setting_spray|other", "notes": "one sentence about what it does" }
  ]
}

If no products exist in a group, return an empty array for that key. Include every product you can see.`,
              },
            ],
          },
        ],
      });

      const rawText =
        response.content[0].type === "text" ? response.content[0].text : "";
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        else throw new Error("Failed to parse AI response as JSON");
      }

      return NextResponse.json({ catalog: parsed });
    }

    // ── Routine mode (default) ────────────────────────────────────────────────
    // Full analysis: identify products, spot gaps for the user's skin type,
    // and explain the correct application order.
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

    const profile = profileRes.data;
    const products = productsRes.data || [];

    const profileContext = profile
      ? `USER SKIN PROFILE:
- Skin type: ${profile.skin_type || "unknown"}
- Skin concerns: ${(profile.skin_concerns || []).join(", ") || "none specified"}
- Skin tone: ${profile.skin_tone || "not specified"}
- Age range: ${profile.age_range || "not specified"}
- Known allergies/sensitivities: ${(profile.known_allergies || []).join(", ") || "none"}
- Budget preference: ${profile.budget || "mixed"}
- Routine complexity preference: ${profile.routine_complexity || "moderate"}`
      : "USER SKIN PROFILE: Not available.";

    const currentProducts =
      products.length > 0
        ? `PRODUCTS ALREADY IN THEIR ROUTINE:\n${products
            .filter((p: { is_current: boolean }) => p.is_current)
            .map(
              (p: {
                product_name: string;
                brand: string;
                category: string;
              }) => `- ${p.product_name} by ${p.brand} (${p.category})`
            )
            .join("\n") || "None logged yet"}`
        : "PRODUCTS ALREADY IN THEIR ROUTINE: None logged yet.";

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2000,
      system:
        "You are suki., a warm and knowledgeable skincare advisor. Analyze skincare product photos and return ONLY valid JSON, no markdown or preamble.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: imageSource },
            {
              type: "text",
              text: `Analyze this photo of skincare products. ${profileContext}

${currentProducts}

Provide a comprehensive analysis with three sections:

1. IDENTIFIED PRODUCTS: List every skincare product you can see in the image.
2. MISSING PRODUCTS: Based on the user's skin profile and what's visible, identify gaps in their routine.
3. ROUTINE ORDER: Explain how to use the identified products in the correct application order.

Return ONLY valid JSON (no markdown, no preamble, no code blocks) in exactly this shape:
{
  "products": [
    {
      "name": "string",
      "brand": "string",
      "category": "string",
      "notes": "string"
    }
  ],
  "missing": [
    {
      "category": "string",
      "why": "string",
      "suggestions": ["string"]
    }
  ],
  "routine": [
    {
      "step": number,
      "time": "AM" | "PM" | "AM/PM",
      "product": "string",
      "how_to_use": "string"
    }
  ]
}`,
            },
          ],
        },
      ],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      else throw new Error("Failed to parse AI response as JSON");
    }

    return NextResponse.json({ analysis: parsed });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Scan analysis failed:", msg);
    return NextResponse.json(
      { error: "Failed to analyze image", detail: msg },
      { status: 500 }
    );
  }
}
