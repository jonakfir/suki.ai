import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";

type SupabaseLike = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

async function resolveAuth(): Promise<
  { userId: string; supabase: SupabaseLike } | { error: Response }
> {
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
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

const SKINCARE_CATEGORIES = new Set([
  "cleanser", "toner", "serum", "moisturizer", "sunscreen",
  "exfoliant", "mask", "eye_cream", "oil", "treatment", "other",
]);
const HAIR_CATEGORIES = new Set([
  "shampoo", "conditioner", "hair_mask", "hair_oil", "hair_styling",
  "scalp_treatment", "heat_protectant", "leave_in",
]);

// Loose heuristics for categories Claude sometimes returns that aren't in our
// enum — they let us at least route the product to the right domain.
const HAIR_HINTS = [
  "shampoo", "conditioner", "hair", "scalp", "frizz", "curl",
  "dry shampoo", "heat protect", "leave-in", "leave in",
];
const MAKEUP_HINTS = [
  "foundation", "concealer", "powder", "blush", "bronzer", "highlighter",
  "lipstick", "lip gloss", "lip liner", "eyeshadow", "eye shadow", "eyeliner",
  "mascara", "brow", "primer", "setting spray", "makeup remover",
];
const MAKEUP_CATEGORIES = new Set([
  "foundation", "concealer", "powder", "blush", "bronzer", "highlighter",
  "lipstick", "lip_gloss", "lip_liner", "eyeshadow", "eyeliner", "mascara",
  "brow", "primer", "setting_spray", "makeup_remover",
]);

function normalizeCategory(raw: unknown): string {
  if (typeof raw !== "string") return "other";
  const c = raw.toLowerCase().replace(/\s+/g, "_");
  if (SKINCARE_CATEGORIES.has(c) || HAIR_CATEGORIES.has(c) || MAKEUP_CATEGORIES.has(c)) {
    return c;
  }
  return "other";
}

function deriveDomain(
  category: string,
  rawCategoryText?: string
): "skincare" | "haircare" | "makeup" {
  if (HAIR_CATEGORIES.has(category)) return "haircare";
  if (MAKEUP_CATEGORIES.has(category)) return "makeup";
  // Fallback: look at the raw text Claude sent us before normalization.
  const hint = (rawCategoryText || "").toLowerCase();
  if (hint) {
    if (HAIR_HINTS.some((h) => hint.includes(h))) return "haircare";
    if (MAKEUP_HINTS.some((h) => hint.includes(h))) return "makeup";
  }
  return "skincare";
}

export async function POST(request: Request) {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { productId, suggestion } = body as {
      productId?: string;
      suggestion?: {
        product_name?: string;
        name?: string;
        brand?: string;
        category?: string;
        ingredients?: string[];
        key_ingredients?: string[];
        image_url?: string;
        barcode?: string;
      };
    };

    if (productId) {
      const { data, error } = await auth.supabase
        .from("user_products")
        .update({ is_saved: true })
        .eq("id", productId)
        .eq("user_id", auth.userId)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ product: data });
    }

    if (suggestion) {
      const product_name = suggestion.product_name || suggestion.name || "";
      const brand = suggestion.brand || "";
      if (!product_name || !brand) {
        return NextResponse.json({ error: "Missing product_name or brand" }, { status: 400 });
      }
      const ingredients = suggestion.ingredients || suggestion.key_ingredients || [];
      const category = normalizeCategory(suggestion.category);
      // Pass the raw text so we can salvage the domain for unknown categories.
      const domain = deriveDomain(category, suggestion.category);
      const { data, error } = await auth.supabase
        .from("user_products")
        .insert({
          user_id: auth.userId,
          product_name,
          brand,
          category,
          domain,
          rating: "neutral",
          notes: "",
          is_current: false,
          is_saved: true,
          ingredients,
          image_url: suggestion.image_url || null,
          barcode: suggestion.barcode || null,
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ product: data });
    }

    return NextResponse.json({ error: "Missing productId or suggestion" }, { status: 400 });
  } catch (error) {
    console.error("Failed to save product:", error);
    const msg = error instanceof Error ? error.message : "Failed to save product";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;

    const body = await request.json().catch(() => ({}));
    const productId: string | undefined = body.productId;
    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    const { data, error } = await auth.supabase
      .from("user_products")
      .update({ is_saved: false })
      .eq("id", productId)
      .eq("user_id", auth.userId)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ product: data });
  } catch (error) {
    console.error("Failed to unsave product:", error);
    const msg = error instanceof Error ? error.message : "Failed to unsave product";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
