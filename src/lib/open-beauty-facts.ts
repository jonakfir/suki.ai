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

/**
 * Expand a UPC-E (8 digits) code into the equivalent UPC-A (12 digits).
 * Returns null if the input is not a valid UPC-E.
 *
 * Reference: https://en.wikipedia.org/wiki/Universal_Product_Code#UPC-E
 */
function upcE_to_upcA(upcE: string): string | null {
  if (!/^\d{8}$/.test(upcE)) return null;
  const numberSystem = upcE[0];
  if (numberSystem !== "0" && numberSystem !== "1") return null;
  const body = upcE.slice(1, 7);
  const check = upcE[7];

  const m1 = body[0];
  const m2 = body[1];
  const m3 = body[2];
  const m4 = body[3];
  const m5 = body[4];
  const last = body[5];

  let manufacturer: string;
  let item: string;
  switch (last) {
    case "0":
    case "1":
    case "2":
      manufacturer = `${m1}${m2}${last}00`;
      item = `00${m3}${m4}${m5}`;
      break;
    case "3":
      manufacturer = `${m1}${m2}${m3}00`;
      item = `000${m4}${m5}`;
      break;
    case "4":
      manufacturer = `${m1}${m2}${m3}${m4}0`;
      item = `0000${m5}`;
      break;
    default:
      manufacturer = `${m1}${m2}${m3}${m4}${m5}`;
      item = `0000${last}`;
      break;
  }
  return `${numberSystem}${manufacturer}${item}${check}`;
}

/**
 * Normalize a raw barcode string into a canonical EAN-13.
 *
 * - Strip whitespace.
 * - Reject non-digit characters.
 * - UPC-E (8 digits) → expand to UPC-A → left-pad to EAN-13.
 * - UPC-A (12 digits) → left-pad with "0" to EAN-13.
 * - EAN-8 (8 digits, not a UPC-E) and EAN-13 (13 digits) → pass through.
 * - Anything else → null.
 */
export function normalizeBarcode(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  if (trimmed.length === 8) {
    // Could be UPC-E or EAN-8. Try UPC-E expansion when leading digit is 0 or 1.
    if (trimmed[0] === "0" || trimmed[0] === "1") {
      const upcA = upcE_to_upcA(trimmed);
      if (upcA) return `0${upcA}`;
    }
    return trimmed;
  }
  if (trimmed.length === 12) return `0${trimmed}`;
  if (trimmed.length === 13) return trimmed;
  return null;
}

/**
 * Look up a single product on Open Beauty Facts by its (normalized) barcode.
 *
 * Uses the v2 product endpoint with the same FIELDS / 5s timeout / User-Agent
 * as `searchProducts`. Returns null when the product is unknown or fails the
 * same completeness/ingredient gates we apply to search results.
 */
export async function getProductByBarcode(
  barcode: string
): Promise<OBFProduct | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OBF_TIMEOUT_MS);

  try {
    const url = `${OBF_BASE}/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "SukiAI/1.0 (skincare-advisor)" },
    });

    if (!res.ok) {
      console.warn(`OBF product lookup returned ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      status?: number;
      status_verbose?: string;
      product?: OBFRawProduct;
    };
    if (data.status !== 1 || !data.product) return null;

    return toOBFProduct(data.product);
  } finally {
    clearTimeout(timeoutId);
  }
}
