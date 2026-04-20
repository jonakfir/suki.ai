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

/**
 * Returns true if an ingredient string looks like OCR garbage or a non-ingredient
 * artifact (e.g. "2021502 3", "INGREDIENTS", single letters).
 */
function isJunkIngredient(s: string): boolean {
  const t = s.trim();
  if (t.length < 3) return true;
  // Pure numbers / numbers with spaces (barcode fragments)
  if (/^\d[\d\s]*$/.test(t)) return true;
  // Digits mixed with very few letters — e.g. "2021502 3", "50ml", "12g"
  if (/\d/.test(t) && t.replace(/[\d\s.]/g, "").length < 3) return true;
  // All-caps single words that are labels, not ingredients (e.g. "INGREDIENTS")
  if (/^[A-Z]{3,}$/.test(t) && ["INGREDIENTS", "COMPOSITION", "INCI", "AQUA"].includes(t)) return true;
  return false;
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
      .filter((s) => !isJunkIngredient(s))
      .slice(0, 20);
    return { list, raw: raw || list.join(", ") };
  }

  if (raw) {
    const list = raw
      .split(/,\s*/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !isJunkIngredient(s))
      .slice(0, 20);
    return { list, raw };
  }

  return { list: [], raw: "" };
}

/** Minimum number of real (non-junk) ingredients for a product to qualify. */
const MIN_INGREDIENT_COUNT = 1;

/** Minimum OBF completeness score (0–1) to include a product. */
const MIN_COMPLETENESS = 0.05;

function toOBFProduct(p: OBFRawProduct): OBFProduct | null {
  if (!p.product_name?.trim()) return null;

  // Completeness gate — very incomplete entries are unreliable
  if ((p.completeness ?? 0) < MIN_COMPLETENESS) return null;

  const { list, raw } = extractIngredients(p);
  if (list.length < MIN_INGREDIENT_COUNT) return null;

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
 * 1. Run brand-tag search and free-text search in parallel
 * 2. Merge and dedupe by barcode
 * 3. Post-filter: keep only products where at least one query word appears
 *    as a case-insensitive substring in the brand name or product name
 *    (e.g. "wow" matches brand "Color Wow", "coat" matches name "Dream Coat")
 */
export async function searchProducts(
  query: string,
  pageSize = 20
): Promise<OBFProduct[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OBF_TIMEOUT_MS);

  try {
    const lower = query.toLowerCase().trim();
    const queryWords = lower.split(/\s+/).filter(Boolean);

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
      "color wow",
      "colour wow",
    ];

    let brandGuess = lower.split(/\s+/)[0];
    for (const b of MULTI_WORD_BRANDS) {
      if (lower.startsWith(b)) {
        brandGuess = b;
        break;
      }
    }
    const brandTag = brandGuess.replace(/['\s.]+/g, "-").replace(/-+/g, "-");

    // Run brand-tag search and free-text search in parallel
    const [brandResults, textResults] = await Promise.all([
      fetchOBF(
        new URLSearchParams({ brands_tags: brandTag, page_size: String(pageSize) }),
        controller.signal
      ),
      fetchOBF(
        new URLSearchParams({ q: query, page_size: String(pageSize) }),
        controller.signal
      ),
    ]);

    // Merge and dedupe by barcode (brand results first for ranking)
    const seen = new Set<string>();
    const merged: OBFProduct[] = [];
    for (const p of [...brandResults, ...textResults]) {
      if (!seen.has(p.barcode)) {
        seen.add(p.barcode);
        merged.push(p);
      }
    }

    // Post-filter: keep products where any query word is a substring of name or brand.
    // This makes "wow" match "Color Wow", "coat" match "Dream Coat", etc.
    const relevant = merged.filter((p) => {
      const nameLower = p.name.toLowerCase();
      const brandLower = p.brand.toLowerCase();
      return queryWords.some((w) => nameLower.includes(w) || brandLower.includes(w));
    });

    // Fall back to all merged results only if the relevance filter eliminates everything
    const results = relevant.length > 0 ? relevant : merged;

    return results.sort((a, b) => b.completeness - a.completeness);
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
