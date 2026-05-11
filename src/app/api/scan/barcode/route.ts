import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";
import {
  getProductByBarcode,
  normalizeBarcode,
} from "@/lib/open-beauty-facts";

type Sup =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createAdminClient>;

/**
 * Mirrors the auth resolution pattern used by `src/app/api/scan/route.ts`
 * so this endpoint behaves identically for admin sessions vs. signed-in users.
 */
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

interface BarcodeRequestBody {
  barcode?: unknown;
}

/**
 * POST /api/scan/barcode
 *
 * Body: { barcode: string }
 *
 * Resolves a scanned/typed barcode against Open Beauty Facts and returns a
 * shape the existing scan UI already consumes (one-element `products`
 * array, empty `missing`/`routine`).
 *
 * Response variants:
 *  - 200 hit:    { analysis: { products: [...], missing: [], routine: [] },
 *                  raw: { barcode, image_url, ingredients } }
 *  - 200 miss:   { analysis: { products: [], missing: [], routine: [] },
 *                  error: 'not_found', barcode }
 *  - 200 OBF dn: { analysis: { products: [], missing: [], routine: [] },
 *                  error: 'timeout' | 'service_error', barcode }
 *  - 400:        invalid_barcode
 *  - 401:        Unauthorized
 */
export async function POST(request: Request) {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;

    let body: BarcodeRequestBody;
    try {
      body = (await request.json()) as BarcodeRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const rawBarcode = body.barcode;
    if (typeof rawBarcode !== "string" || !rawBarcode.trim()) {
      return NextResponse.json(
        { error: "Missing barcode." },
        { status: 400 }
      );
    }

    const normalized = normalizeBarcode(rawBarcode);
    if (
      !normalized ||
      (normalized.length !== 8 &&
        normalized.length !== 12 &&
        normalized.length !== 13)
    ) {
      return NextResponse.json(
        { error: "Invalid barcode format.", barcode: rawBarcode },
        { status: 400 }
      );
    }

    let product;
    try {
      product = await getProductByBarcode(normalized);
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      const empty = { products: [], missing: [], routine: [] };
      return NextResponse.json({
        analysis: empty,
        error: isAbort ? "timeout" : "service_error",
        barcode: normalized,
      });
    }

    if (!product) {
      return NextResponse.json({
        analysis: { products: [], missing: [], routine: [] },
        error: "not_found",
        barcode: normalized,
      });
    }

    return NextResponse.json({
      analysis: {
        products: [
          {
            name: product.name,
            brand: product.brand,
            category: product.category,
            notes: product.ingredients_raw
              ? `Key ingredients: ${product.ingredients.slice(0, 5).join(", ")}`
              : "",
          },
        ],
        missing: [],
        routine: [],
      },
      raw: {
        barcode: product.barcode || normalized,
        image_url: product.image_url,
        ingredients: product.ingredients,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Barcode scan failed:", msg);
    return NextResponse.json(
      { error: "Failed to resolve barcode", detail: msg },
      { status: 500 }
    );
  }
}
