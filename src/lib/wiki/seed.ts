// Deterministic initial synthesis — no LLM required. Generates the overview
// and index pages from whatever structured data the user already has so chat
// has something to ground against on first open, even before any ingest jobs
// have run.

import { createAdminClient } from "@/lib/supabase/admin";
import { upsertWikiPage, appendWikiLog, listWikiPages } from "./store";
import { productSlug, buildPath } from "./slug";

interface ProfileRow {
  user_id: string;
  skin_type?: string | null;
  skin_concerns?: string[] | null;
  allergies?: string[] | null;
  budget_tier?: string | null;
  preference_mode?: string | null;
  race?: string | null;
  hair_type?: string | null;
  hair_concerns?: string[] | null;
  initial_products_using?: string | null;
  initial_products_bad?: string | null;
  initial_hair_products?: string | null;
  initial_makeup_products?: string | null;
}

interface ProductRow {
  id: string;
  user_id: string;
  brand: string | null;
  product_name: string | null;
  category: string | null;
  domain: string | null;
  shade_name: string | null;
  rating: string | null;
  created_at: string;
}

export async function seedWikiForUser(userId: string): Promise<{ pages: number }> {
  const admin = createAdminClient();

  const [{ data: profile }, { data: products }] = await Promise.all([
    admin.from("users_profile").select("*").eq("user_id", userId).maybeSingle(),
    admin
      .from("user_products")
      .select("id, user_id, brand, product_name, category, domain, shade_name, rating, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const p = (profile ?? {}) as ProfileRow;
  const prods = ((products ?? []) as ProductRow[]) ?? [];

  let count = 0;

  // overview.md
  const overviewContent = renderOverview(p, prods);
  await upsertWikiPage(admin, userId, {
    path: "overview",
    title: "Overview",
    summary: "Who you are in Suki's eyes — skin, hair, goals, and constraints at a glance.",
    content: overviewContent,
    source_refs: [{ kind: "profile" }],
  });
  count++;

  // One product page per owned product, minimal stub that the maintainer will
  // enrich on the next ingest pass.
  for (const prod of prods) {
    const path = buildPath("products", productSlug(prod.brand, prod.product_name));
    const title = [prod.brand, prod.product_name].filter(Boolean).join(" ") || "Unnamed product";
    const content = renderProductStub(prod);
    await upsertWikiPage(admin, userId, {
      path,
      title,
      summary: `${prod.brand ?? ""} · ${prod.category ?? ""}`.trim().replace(/^·\s*/, ""),
      content,
      source_refs: [{ kind: "product", id: prod.id }],
    });
    count++;
  }

  // index.md — regenerated from current pages
  const pages = await listWikiPages(admin, userId);
  const indexContent = renderIndex(pages);
  await upsertWikiPage(admin, userId, {
    path: "index",
    title: "Index",
    summary: "Every page in your wiki, grouped by section.",
    content: indexContent,
  });
  count++;

  await appendWikiLog(admin, userId, {
    kind: "ingest",
    subject: "seed",
    summary: `Seeded ${count} pages from profile + ${prods.length} products.`,
    meta: { products: prods.length },
  });

  return { pages: count };
}

function renderOverview(p: ProfileRow, prods: ProductRow[]): string {
  const line = (label: string, val: string | null | undefined) =>
    val ? `- **${label}:** ${val}` : "";
  const list = (label: string, vals: string[] | null | undefined) =>
    vals && vals.length ? `- **${label}:** ${vals.join(", ")}` : "";

  const byDomain = {
    skincare: prods.filter((x) => (x.domain ?? "skincare") === "skincare").length,
    haircare: prods.filter((x) => x.domain === "haircare").length,
    makeup:   prods.filter((x) => x.domain === "makeup").length,
  };

  const initialText = [
    p.initial_products_using ? `Currently using (self-reported): ${p.initial_products_using}` : "",
    p.initial_products_bad   ? `Bad reactions (self-reported): ${p.initial_products_bad}`   : "",
    p.initial_hair_products  ? `Hair products (self-reported): ${p.initial_hair_products}`  : "",
    p.initial_makeup_products? `Makeup products (self-reported): ${p.initial_makeup_products}` : "",
  ].filter(Boolean).join("\n\n");

  return [
    `# Overview`,
    ``,
    `_Auto-maintained by Suki. Read-only for humans; edits happen by chatting with Suki._`,
    ``,
    `## Skin`,
    line("Type", p.skin_type),
    list("Concerns", p.skin_concerns),
    list("Allergies / flagged ingredients", p.allergies),
    line("Race / Fitzpatrick context", p.race),
    ``,
    `## Hair`,
    line("Type", p.hair_type),
    list("Concerns", p.hair_concerns),
    ``,
    `## Preferences`,
    line("Budget tier", p.budget_tier),
    line("Recommendation mode", p.preference_mode),
    ``,
    `## Collection`,
    `- Skincare products: ${byDomain.skincare}`,
    `- Haircare products: ${byDomain.haircare}`,
    `- Makeup products: ${byDomain.makeup}`,
    ``,
    initialText ? `## From onboarding\n\n${initialText}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function renderProductStub(p: ProductRow): string {
  return [
    `# ${[p.brand, p.product_name].filter(Boolean).join(" ") || "Unnamed product"}`,
    ``,
    `- **Brand:** ${p.brand ?? "—"}`,
    `- **Category:** ${p.category ?? "—"}`,
    `- **Domain:** ${p.domain ?? "skincare"}`,
    p.shade_name ? `- **Shade:** ${p.shade_name}` : "",
    p.rating ? `- **Rating:** ${p.rating}` : "",
    `- **Added:** ${new Date(p.created_at).toISOString().slice(0, 10)}`,
    ``,
    `_Ingredient breakdown, fit, and alternatives will be filled in the next maintenance pass._`,
  ]
    .filter(Boolean)
    .join("\n");
}

function renderIndex(
  pages: { path: string; title: string; summary: string }[]
): string {
  const groups: Record<string, typeof pages> = {};
  for (const pg of pages) {
    const ns = pg.path.includes("/") ? pg.path.split("/")[0] : "core";
    (groups[ns] ??= []).push(pg);
  }
  const order = ["core", "overview", "products", "routines", "concerns", "ingredients", "allergens", "goals", "progress", "comparisons", "notes"];
  const nsLabel: Record<string, string> = {
    core: "Core",
    overview: "Overview",
    products: "Products",
    routines: "Routines",
    concerns: "Concerns",
    ingredients: "Ingredients",
    allergens: "Allergens",
    goals: "Goals",
    progress: "Progress",
    comparisons: "Comparisons",
    notes: "Notes",
  };

  const body = order
    .filter((ns) => groups[ns])
    .map((ns) => {
      const list = groups[ns]
        .map((pg) => `- [[${pg.path}]] — ${pg.title}${pg.summary ? ` · _${pg.summary}_` : ""}`)
        .join("\n");
      return `## ${nsLabel[ns]}\n\n${list}`;
    })
    .join("\n\n");

  return `# Index\n\n_Auto-regenerated on every wiki update._\n\n${body}\n`;
}
