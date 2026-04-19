import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";

type SupabaseLike =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createAdminClient>;

async function resolveAuth(): Promise<
  { userId: string; supabase: SupabaseLike } | { error: Response }
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
const MAKEUP_CATEGORIES = new Set([
  "foundation", "concealer", "powder", "blush", "bronzer", "highlighter",
  "lipstick", "lip_gloss", "lip_liner", "eyeshadow", "eyeliner", "mascara",
  "brow", "primer", "setting_spray", "makeup_remover",
]);

const HAIR_HINTS = [
  "shampoo", "conditioner", "hair", "scalp", "frizz", "curl",
  "dry shampoo", "heat protect", "leave-in", "leave in",
];
const MAKEUP_HINTS = [
  "foundation", "concealer", "powder", "blush", "bronzer", "highlighter",
  "lipstick", "lip gloss", "lip liner", "eyeshadow", "eye shadow", "eyeliner",
  "mascara", "brow", "primer", "setting spray", "makeup remover",
];

function normalizeCategory(raw: unknown): string {
  if (typeof raw !== "string") return "other";
  const c = raw.toLowerCase().replace(/\s+/g, "_");
  if (
    SKINCARE_CATEGORIES.has(c) ||
    HAIR_CATEGORIES.has(c) ||
    MAKEUP_CATEGORIES.has(c)
  ) {
    return c;
  }
  return "other";
}

function deriveDomain(
  category: string,
  rawText?: string,
  hintDomain?: string
): "skincare" | "haircare" | "makeup" {
  if (hintDomain === "haircare" || hintDomain === "makeup" || hintDomain === "skincare") {
    return hintDomain;
  }
  if (HAIR_CATEGORIES.has(category)) return "haircare";
  if (MAKEUP_CATEGORIES.has(category)) return "makeup";
  const hint = (rawText || "").toLowerCase();
  if (hint) {
    if (HAIR_HINTS.some((h) => hint.includes(h))) return "haircare";
    if (MAKEUP_HINTS.some((h) => hint.includes(h))) return "makeup";
  }
  return "skincare";
}

interface IncomingProduct {
  name: string;
  brand: string;
  category: string;
  notes?: string;
  domain?: "skincare" | "haircare" | "makeup";
}

export async function POST(request: Request) {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const products: IncomingProduct[] = body.products;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "No products provided." }, { status: 400 });
    }

    const rows = products.map((p) => {
      const category = normalizeCategory(p.category);
      const domain = deriveDomain(category, p.category, p.domain);
      return {
        user_id: auth.userId,
        product_name: p.name || "Unknown product",
        brand: p.brand || "Unknown",
        category,
        domain,
        notes: p.notes || "",
        rating: "neutral" as const,
        is_current: true,
        is_saved: true,
        ingredients: [],
        image_url: null,
        barcode: null,
      };
    });

    const { data, error } = await auth.supabase
      .from("user_products")
      .insert(rows)
      .select();

    if (error) throw error;
    return NextResponse.json({ saved: data?.length ?? rows.length });
  } catch (error) {
    console.error("Batch product save failed:", error);
    const msg = error instanceof Error ? error.message : "Failed to save products";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
