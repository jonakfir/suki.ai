import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";
import { enqueueWikiJob } from "@/lib/wiki/store";

type SupabaseLike = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

const HAIR_CATEGORIES = new Set([
  "shampoo", "conditioner", "hair_mask", "hair_oil", "hair_styling",
  "scalp_treatment", "heat_protectant", "leave_in",
]);
const MAKEUP_CATEGORIES = new Set([
  "foundation", "concealer", "powder", "blush", "bronzer", "highlighter",
  "lipstick", "lip_gloss", "lip_liner", "eyeshadow", "eyeliner", "mascara",
  "brow", "primer", "setting_spray", "makeup_remover",
]);

function deriveDomain(category: string): "skincare" | "haircare" | "makeup" {
  if (HAIR_CATEGORIES.has(category)) return "haircare";
  if (MAKEUP_CATEGORIES.has(category)) return "makeup";
  return "skincare";
}

function sanitizeUrl(u: unknown): string | null {
  if (typeof u !== "string") return null;
  const trimmed = u.trim();
  if (!trimmed) return null;
  // Only allow http(s) — no javascript:, data:, file:, etc.
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    // Will throw on malformed.
    new URL(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}

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
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId: user.id, supabase };
}

export async function GET() {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;

    const { data, error } = await auth.supabase
      .from("user_products")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ products: data ?? [] });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch products";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;

    const body = await request.json();

    const category = (body.category || "other") as string;
    // Always derive domain from category — never trust a client-supplied value.
    const domain = deriveDomain(category);

    const { data, error } = await auth.supabase
      .from("user_products")
      .insert({
        user_id: auth.userId,
        product_name: String(body.product_name || "").trim(),
        brand: String(body.brand || "").trim(),
        category,
        domain,
        rating: body.rating || "neutral",
        notes: typeof body.notes === "string" ? body.notes : "",
        is_current: body.is_current === true,
        ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
        image_url: sanitizeUrl(body.image_url),
        barcode: typeof body.barcode === "string" ? body.barcode : null,
        shade_name: domain === "makeup" && typeof body.shade_name === "string" ? body.shade_name : null,
        shade_hex: domain === "makeup" && typeof body.shade_hex === "string" ? body.shade_hex : null,
        shade_finish: domain === "makeup" && typeof body.shade_finish === "string" ? body.shade_finish : null,
      })
      .select()
      .single();

    if (error) throw error;
    // Fire-and-forget: enqueue a wiki maintenance job.
    enqueueWikiJob(auth.userId, "product.add", data.id, {}).catch((e) => {
      console.warn("wiki enqueue (product.add) failed:", e);
    });
    return NextResponse.json({ product: data });
  } catch (error) {
    console.error("Failed to add product:", error);
    const msg = error instanceof Error ? error.message : "Failed to add product";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Whitelist the fields clients are allowed to PATCH — do not let them
    // overwrite user_id, created_at, etc.
    const PATCH_FIELDS = [
      "product_name", "brand", "category",
      "rating", "notes", "is_current", "ingredients",
      "image_url", "barcode", "is_saved",
      "shade_name", "shade_hex", "shade_finish",
    ] as const;
    const update: Record<string, unknown> = {};
    for (const key of PATCH_FIELDS) {
      if (key in body) update[key] = body[key];
    }
    // image_url: only accept http(s) URLs.
    if ("image_url" in update) {
      update.image_url = sanitizeUrl(update.image_url);
    }
    // Domain is always derived from category — never accepted from client.
    if (typeof update.category === "string") {
      update.domain = deriveDomain(update.category);
    }

    const { data, error } = await auth.supabase
      .from("user_products")
      .update(update)
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select()
      .single();

    if (error) throw error;
    enqueueWikiJob(auth.userId, "product.update", id, {}).catch((e) => {
      console.warn("wiki enqueue (product.update) failed:", e);
    });
    return NextResponse.json({ product: data });
  } catch (error) {
    console.error("Failed to update product:", error);
    const msg = error instanceof Error ? error.message : "Failed to update product";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { error } = await auth.supabase
      .from("user_products")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId);

    if (error) throw error;
    enqueueWikiJob(auth.userId, "product.delete", id, {}).catch((e) => {
      console.warn("wiki enqueue (product.delete) failed:", e);
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    const msg = error instanceof Error ? error.message : "Failed to delete product";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
