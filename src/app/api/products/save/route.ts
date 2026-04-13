import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";

type SupabaseLike = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

async function resolveAuth(): Promise<
  { userId: string; supabase: SupabaseLike } | { error: Response }
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

const VALID_CATEGORIES = [
  "cleanser", "toner", "serum", "moisturizer", "sunscreen",
  "exfoliant", "mask", "eye_cream", "oil", "treatment", "other",
];

function normalizeCategory(raw: unknown): string {
  if (typeof raw !== "string") return "other";
  const c = raw.toLowerCase().replace(/\s+/g, "_");
  return VALID_CATEGORIES.includes(c) ? c : "other";
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
      const { data, error } = await auth.supabase
        .from("user_products")
        .insert({
          user_id: auth.userId,
          product_name,
          brand,
          category: normalizeCategory(suggestion.category),
          rating: "neutral",
          notes: "",
          is_current: false,
          is_saved: true,
          ingredients,
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
