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

    const { data, error } = await auth.supabase
      .from("user_products")
      .insert({
        user_id: auth.userId,
        product_name: body.product_name,
        brand: body.brand,
        category: body.category || "other",
        rating: body.rating || "neutral",
        notes: body.notes || "",
        is_current: body.is_current || false,
        ingredients: body.ingredients || [],
        image_url: body.image_url || null,
        barcode: body.barcode || null,
      })
      .select()
      .single();

    if (error) throw error;
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
    const { id, ...fields } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { data, error } = await auth.supabase
      .from("user_products")
      .update(fields)
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select()
      .single();

    if (error) throw error;
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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    const msg = error instanceof Error ? error.message : "Failed to delete product";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
