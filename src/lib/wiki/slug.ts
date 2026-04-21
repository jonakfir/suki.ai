// Shared slug + path helpers. Paths are URL-safe and namespaced; we keep them
// human-readable so debugging via Supabase is pleasant.

const ALLOWED_NAMESPACES = new Set([
  "overview",
  "index",
  "log",
  "products",
  "routines",
  "concerns",
  "ingredients",
  "allergens",
  "goals",
  "progress",
  "comparisons",
  "notes",
]);

export function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")    // strip diacritics
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

/** Build a canonical wiki path like "products/la-roche-posay-effaclar". */
export function buildPath(namespace: string, ...parts: string[]): string {
  const ns = namespace.trim().toLowerCase();
  if (!ALLOWED_NAMESPACES.has(ns)) {
    throw new Error(`Unknown wiki namespace: ${namespace}`);
  }
  const singletons = new Set(["overview", "index", "log"]);
  if (singletons.has(ns)) return ns;
  const slugged = parts.filter(Boolean).map(slugify).join("-");
  if (!slugged) throw new Error(`Empty slug for namespace ${ns}`);
  return `${ns}/${slugged}`;
}

/** Lightweight guard for paths coming from the API / Claude tool calls. */
export function isValidWikiPath(p: unknown): p is string {
  if (typeof p !== "string") return false;
  if (!p || p.length > 160) return false;
  if (!/^[a-z0-9]+(?:\/[a-z0-9][a-z0-9-]*)?$/.test(p)) return false;
  const ns = p.split("/")[0];
  return ALLOWED_NAMESPACES.has(ns);
}

export function productSlug(brand: string | null | undefined, name: string | null | undefined): string {
  const bits = [brand, name].filter(Boolean).join(" ");
  return slugify(bits || "product");
}
