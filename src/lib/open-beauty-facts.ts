/**
 * Open Beauty Facts API client for real skincare product data.
 * https://world.openbeautyfacts.org/
 */

const OBF_BASE = "https://world.openbeautyfacts.org/api/v2";
const OBF_TIMEOUT_MS = 5_000;

const CATEGORY_MAP: Record<string, string> = {
  cleansers: "cleanser",
  "face-cleansers": "cleanser",
  "facial-cleansers": "cleanser",
  toners: "toner",
  "facial-toners": "toner",
  serums: "serum",
  "face-serums": "serum",
  moisturizers: "moisturizer",
  "face-moisturizers": "moisturizer",
  "face-creams": "moisturizer",
  sunscreens: "sunscreen",
  "sun-care": "sunscreen",
  "spf-moisturizers": "sunscreen",
  exfoliants: "exfoliant",
  "face-exfoliants": "exfoliant",
  peels: "exfoliant",
  masks: "mask",
  "face-masks": "mask",
  "eye-creams": "eye_cream",
  "eye-care": "eye_cream",
  oils: "oil",
  "face-oils": "oil",
  treatments: "treatment",
  "acne-treatments": "treatment",
  "anti-aging": "treatment",
};

export interface OBFProduct {
  barcode: string;
  name: string;
  brand: string;
  ingredients: string[];
  ingredients_raw: string;
  category: string;
  image_url: string | null;
  completeness: number;
}

interface OBFIngredient {
  id?: string;
  text?: string;
  percent_estimate?: number;
}

interface OBFRawProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  ingredients?: OBFIngredient[];
  ingredients_text?: string;
  categories_tags?: string[];
  image_front_url?: string;
  completeness?: number;
}

function mapCategory(tags: string[] | undefined): string {
  if (!tags) return "other";
  for (const tag of tags) {
    const key = tag.replace(/^en:/, "").toLowerCase();
    if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  }
  if (tags.some((t) => /skincare|skin-care|face-care/i.test(t))) return "treatment";
  return "other";
}

function extractIngredients(product: OBFRawProduct): {
  list: string[];
  raw: string;
} {
  const raw = product.ingredients_text ?? "";

  if (product.ingredients?.length) {
    const list = product.ingredients
      .map((i) => i.text ?? i.id?.replace(/^en:/, "") ?? "")
      .filter(Boolean)
      .slice(0, 20);
    return { list, raw: raw || list.join(", ") };
  }

  if (raw) {
    const list = raw
      .split(/,\s*/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
    return { list, raw };
  }

  return { list: [], raw: "" };
}

function toOBFProduct(p: OBFRawProduct): OBFProduct | null {
  if (!p.product_name?.trim()) return null;

  const { list, raw } = extractIngredients(p);
  if (list.length === 0) return null;

  return {
    barcode: p.code ?? "",
    name: p.product_name.trim(),
    brand: (p.brands ?? "").split(",")[0].trim() || "Unknown",
    ingredients: list,
    ingredients_raw: raw,
    category: mapCategory(p.categories_tags),
    image_url: p.image_front_url ?? null,
    completeness: p.completeness ?? 0,
  };
}

const FIELDS =
  "code,product_name,brands,ingredients,ingredients_text,ingredients_tags,categories_tags,image_front_url,completeness";

async function fetchOBF(
  params: URLSearchParams,
  signal: AbortSignal
): Promise<OBFProduct[]> {
  params.set("fields", FIELDS);

  const res = await fetch(`${OBF_BASE}/search?${params}`, {
    signal,
    headers: { "User-Agent": "SukiAI/1.0 (skincare-advisor)" },
  });

  if (!res.ok) {
    console.warn(`OBF returned ${res.status}`);
    return [];
  }

  const data = (await res.json()) as { products?: OBFRawProduct[] };
  if (!data.products?.length) return [];

  return data.products
    .map(toOBFProduct)
    .filter((p): p is OBFProduct => p !== null)
    .sort((a, b) => b.completeness - a.completeness);
}

/**
 * Search Open Beauty Facts for skincare products.
 *
 * Strategy:
 * 1. Try brand-tag search (precise) — e.g. "cerave" → brands_tags=cerave
 * 2. If < 3 results, also try free-text search with the full query
 * 3. Merge, dedupe by barcode, return sorted by completeness
 */
export async function searchProducts(
  query: string,
  pageSize = 20
): Promise<OBFProduct[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OBF_TIMEOUT_MS);

  try {
    const lower = query.toLowerCase().trim();

    // Known multi-word brand prefixes (OBF uses hyphenated brand tags)
    const MULTI_WORD_BRANDS = [
      "the ordinary",
      "la roche-posay",
      "la roche posay",
      "paula's choice",
      "paulas choice",
      "drunk elephant",
      "sunday riley",
      "dr. jart",
      "dr jart",
      "mario badescu",
      "peter thomas roth",
      "first aid beauty",
      "youth to the people",
      "fresh beauty",
      "it cosmetics",
      "ole henriksen",
      "derma e",
      "tree hut",
    ];

    let brandGuess = lower.split(/\s+/)[0];
    let productHint = lower.split(/\s+/).slice(1).join(" ");
    for (const b of MULTI_WORD_BRANDS) {
      if (lower.startsWith(b)) {
        brandGuess = b;
        productHint = lower.slice(b.length).trim();
        break;
      }
    }
    const brandTag = brandGuess.replace(/['\s.]+/g, "-").replace(/-+/g, "-");

    // Strategy 1: brand-tag search (most precise)
    const brandParams = new URLSearchParams({
      brands_tags: brandTag,
      page_size: String(pageSize),
    });
    const brandResults = await fetchOBF(brandParams, controller.signal);

    // If there's a product hint, filter brand results by name match
    let filtered = brandResults;
    if (productHint) {
      const hintWords = productHint.split(/\s+/);
      const nameMatched = brandResults.filter((p) => {
        const name = p.name.toLowerCase();
        return hintWords.some((w) => name.includes(w));
      });
      if (nameMatched.length > 0) filtered = nameMatched;
    }

    // Strategy 2: if brand search found < 3 usable products, try free-text
    if (filtered.length < 3) {
      const textParams = new URLSearchParams({
        q: query,
        page_size: String(pageSize),
      });
      const textResults = await fetchOBF(textParams, controller.signal);

      // Merge and dedupe by barcode
      const seen = new Set(filtered.map((p) => p.barcode));
      for (const p of textResults) {
        if (!seen.has(p.barcode)) {
          seen.add(p.barcode);
          filtered.push(p);
        }
      }
    }

    return filtered.sort((a, b) => b.completeness - a.completeness);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      console.warn("OBF search timed out");
    } else {
      console.warn("OBF search failed:", e);
    }
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
