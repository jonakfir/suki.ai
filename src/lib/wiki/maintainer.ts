// Wiki maintainer. Runs Claude with tool-use over a user's wiki in response to
// an ingest event (new product, routine tweak, profile change, progress
// photo). Claude decides which pages to read/update, we apply the writes via
// the service-role Supabase client. Deterministic fallbacks keep the wiki
// advancing even if Claude is not configured.

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  listWikiPages,
  readWikiPage,
  upsertWikiPage,
  appendWikiLog,
  searchWiki,
} from "./store";
import { isValidWikiPath, slugify } from "./slug";
import { seedWikiForUser } from "./seed";
import type { WikiJob, WikiSourceRef } from "./types";

const MAINTAINER_MODEL = "claude-sonnet-4-6";
const MAX_TOOL_ITERATIONS = 8;

const MAINTAINER_SYSTEM = `You are Suki's Beauty Wiki maintainer. You keep a per-user, interlinked
markdown knowledge base current. The wiki is organised under these namespaces:

overview (singleton)   — the user's profile synthesis
index (singleton)      — catalog of all pages (you do NOT edit this; it is regenerated)
log (singleton)        — append-only event log (you do NOT edit this)
products/{slug}        — one per owned product
routines/{slug}        — morning, evening, weekly, wash-day, non-wash-day
concerns/{slug}        — acne, dark-spots, frizz, dry-ends, hooded-lids, etc.
ingredients/{slug}     — niacinamide, retinol, etc.
allergens/{slug}       — fragrance, lanolin, sulfates, etc.
goals/{slug}           — user-set goals
progress/{yyyy-mm}     — monthly progress synthesis
comparisons/{slug}     — filed-back outputs from /compare

Rules:
- Prefer UPDATING existing pages over creating new ones. Read the index first.
- Each page has YAML-style front matter not required, but keep the H1 title line.
- Cross-link related pages using [[namespace/slug]] syntax.
- Be concise. Summaries <= 140 chars. Page body under 8 KB.
- NEVER fabricate ingredient claims. If you are unsure, say "TBD" instead of guessing.
- NEVER touch overview, index, or log via upsert_wiki_page (index/log are off limits).
- Use search_wiki to find related pages before writing.
- Keep a warm, grounded voice — no marketing language.`;

type ClaudeTool = Anthropic.Tool;

const TOOLS: ClaudeTool[] = [
  {
    name: "list_wiki_pages",
    description: "List every existing page in this user's wiki with title + summary.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "read_wiki_page",
    description: "Read the full markdown content of a single wiki page by path.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    },
  },
  {
    name: "search_wiki",
    description: "Full-text search the wiki. Returns up to 8 matching pages with snippets.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "upsert_wiki_page",
    description: "Create or overwrite a wiki page. Cannot target overview, index, or log.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "e.g. products/la-roche-posay-effaclar" },
        title: { type: "string" },
        summary: { type: "string" },
        content: { type: "string", description: "Full markdown body" },
        source_refs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind: { type: "string" },
              id: { type: "string" },
              url: { type: "string" },
            },
            additionalProperties: false,
          },
        },
      },
      required: ["path", "title", "summary", "content"],
      additionalProperties: false,
    },
  },
  {
    name: "finish",
    description: "Call when done. Summarise what changed.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        touched_paths: { type: "array", items: { type: "string" } },
      },
      required: ["summary"],
      additionalProperties: false,
    },
  },
];

export async function runMaintainerJob(job: WikiJob): Promise<{ summary: string; touched: string[] }> {
  const admin = createAdminClient();

  // Handle seed/lint without the LLM loop — they are deterministic.
  if (job.kind === "seed") {
    const out = await seedWikiForUser(job.user_id);
    return { summary: `Seeded ${out.pages} pages.`, touched: ["overview", "index"] };
  }
  if (job.kind === "lint") {
    const out = await lintWiki(job.user_id);
    return out;
  }

  // Build the trigger context (what changed + relevant rows).
  const trigger = await buildTriggerContext(job);

  if (!process.env.ANTHROPIC_API_KEY) {
    // Fallback: do a deterministic re-seed so the wiki at least reflects DB state.
    const out = await seedWikiForUser(job.user_id);
    await appendWikiLog(admin, job.user_id, {
      kind: "ingest",
      subject: job.kind,
      summary: `Re-seeded (no Claude). ${out.pages} pages.`,
      meta: { job_id: job.id },
    });
    return { summary: `Re-seeded ${out.pages} pages (Claude disabled).`, touched: ["overview", "index"] };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const touched = new Set<string>();
  const userMessage = renderTriggerPrompt(job, trigger);

  const history: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
  let summary = "";

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const res = await client.messages.create({
      model: MAINTAINER_MODEL,
      max_tokens: 2500,
      system: MAINTAINER_SYSTEM,
      tools: TOOLS,
      messages: history,
    });

    history.push({ role: "assistant", content: res.content });

    const toolUses = res.content.filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
    if (toolUses.length === 0) {
      // Model answered without calling a tool — take its text as summary.
      const text = res.content.find((c) => c.type === "text");
      summary = text && text.type === "text" ? text.text : "No-op";
      break;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    let finished = false;
    for (const tu of toolUses) {
      const outcome = await runTool(tu, job.user_id);
      if (tu.name === "finish") {
        const inp = tu.input as { summary?: string; touched_paths?: string[] };
        summary = inp.summary ?? "done";
        for (const p of inp.touched_paths ?? []) touched.add(p);
        finished = true;
      }
      if (outcome.touched) touched.add(outcome.touched);
      results.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: outcome.output,
        is_error: outcome.isError,
      });
    }
    history.push({ role: "user", content: results });
    if (finished) break;
  }

  // Regenerate the index whenever we touched anything.
  if (touched.size > 0) {
    await regenerateIndex(job.user_id);
    touched.add("index");
  }

  await appendWikiLog(admin, job.user_id, {
    kind: "ingest",
    subject: job.kind,
    summary: summary || `${touched.size} pages updated`,
    meta: { job_id: job.id, touched: [...touched] },
  });

  return { summary: summary || "Updated wiki.", touched: [...touched] };
}

// -----------------------------------------------------------------------------
// Tool dispatch
// -----------------------------------------------------------------------------

interface ToolOutcome {
  output: string;
  isError?: boolean;
  touched?: string;
}

async function runTool(tu: Anthropic.ToolUseBlock, userId: string): Promise<ToolOutcome> {
  const admin = createAdminClient();
  try {
    if (tu.name === "list_wiki_pages") {
      const pages = await listWikiPages(admin, userId);
      return { output: JSON.stringify(pages) };
    }
    if (tu.name === "read_wiki_page") {
      const { path } = tu.input as { path: string };
      if (!isValidWikiPath(path)) return { output: `Invalid path: ${path}`, isError: true };
      const pg = await readWikiPage(admin, userId, path);
      if (!pg) return { output: "Not found", isError: true };
      return {
        output: JSON.stringify({
          path: pg.path, title: pg.title, summary: pg.summary, content: pg.content,
        }),
      };
    }
    if (tu.name === "search_wiki") {
      const { query, limit } = tu.input as { query: string; limit?: number };
      const results = await searchWiki(admin, userId, query, Math.max(1, Math.min(limit ?? 8, 20)));
      return { output: JSON.stringify(results) };
    }
    if (tu.name === "upsert_wiki_page") {
      const inp = tu.input as {
        path: string; title: string; summary: string; content: string; source_refs?: WikiSourceRef[];
      };
      if (["overview", "index", "log"].includes(inp.path)) {
        return { output: `Refusing to edit ${inp.path} — it is auto-managed.`, isError: true };
      }
      const pg = await upsertWikiPage(admin, userId, {
        path: inp.path,
        title: inp.title,
        summary: inp.summary,
        content: inp.content,
        source_refs: inp.source_refs ?? [],
      });
      return { output: `Wrote ${pg.path} v${pg.version}`, touched: pg.path };
    }
    if (tu.name === "finish") {
      return { output: "ok" };
    }
    return { output: `Unknown tool ${tu.name}`, isError: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { output: msg, isError: true };
  }
}

// -----------------------------------------------------------------------------
// Trigger context
// -----------------------------------------------------------------------------

async function buildTriggerContext(job: WikiJob): Promise<Record<string, unknown>> {
  const admin = createAdminClient();
  const ctx: Record<string, unknown> = { kind: job.kind };

  if (job.kind.startsWith("product.") && job.ref_id) {
    const { data } = await admin.from("user_products").select("*").eq("id", job.ref_id).maybeSingle();
    ctx.product = data;
  }
  if (job.kind === "routine.update") {
    const { data } = await admin
      .from("user_routine_steps").select("*").eq("user_id", job.user_id)
      .order("time_of_day").order("position");
    ctx.routine = data;
  }
  if (job.kind === "profile.update") {
    const { data } = await admin.from("users_profile").select("*").eq("user_id", job.user_id).maybeSingle();
    ctx.profile = data;
  }
  if (job.kind === "progress.photo" && job.ref_id) {
    const { data } = await admin.from("progress_photos").select("*").eq("id", job.ref_id).maybeSingle();
    ctx.photo = data;
  }
  return ctx;
}

function renderTriggerPrompt(job: WikiJob, ctx: Record<string, unknown>): string {
  return [
    `Event: ${job.kind}`,
    job.ref_id ? `Ref: ${job.ref_id}` : "",
    "",
    "Raw trigger context (JSON):",
    "```json",
    JSON.stringify(ctx, null, 2),
    "```",
    "",
    "Please update the wiki accordingly:",
    "1. Call list_wiki_pages first so you know what exists.",
    "2. Read any pages you are about to rewrite.",
    "3. Upsert the minimum set of pages that need changes.",
    "4. Call finish with a short summary + touched_paths.",
  ].filter(Boolean).join("\n");
}

// -----------------------------------------------------------------------------
// Index regeneration (deterministic, no LLM)
// -----------------------------------------------------------------------------

async function regenerateIndex(userId: string): Promise<void> {
  const admin = createAdminClient();
  const pages = await listWikiPages(admin, userId);
  const groups: Record<string, typeof pages> = {};
  for (const pg of pages) {
    const ns = pg.path.includes("/") ? pg.path.split("/")[0] : "core";
    (groups[ns] ??= []).push(pg);
  }
  const order = ["core", "overview", "products", "routines", "concerns", "ingredients", "allergens", "goals", "progress", "comparisons", "notes"];
  const body = order
    .filter((ns) => groups[ns])
    .map((ns) => {
      const list = groups[ns]
        .map((pg) => `- [[${pg.path}]] — ${pg.title}${pg.summary ? ` · _${pg.summary}_` : ""}`)
        .join("\n");
      return `## ${ns[0].toUpperCase()}${ns.slice(1)}\n\n${list}`;
    })
    .join("\n\n");

  await upsertWikiPage(admin, userId, {
    path: "index",
    title: "Index",
    summary: "Every page in your wiki.",
    content: `# Index\n\n_Auto-regenerated on every wiki update._\n\n${body}\n`,
  });
}

// -----------------------------------------------------------------------------
// Lint — cheap structural checks; LLM may be added later.
// -----------------------------------------------------------------------------

async function lintWiki(userId: string): Promise<{ summary: string; touched: string[] }> {
  const admin = createAdminClient();
  const pages = await listWikiPages(admin, userId);
  const paths = new Set(pages.map((p) => p.path));
  const findings: string[] = [];

  // orphan product pages (product deleted but page remains)
  const { data: products } = await admin.from("user_products").select("id, brand, product_name").eq("user_id", userId);
  const prodSlugs = new Set(
    (products ?? []).map((p) => slugify(`${p.brand ?? ""} ${p.product_name ?? ""}`))
  );
  for (const pg of pages) {
    if (pg.path.startsWith("products/")) {
      const slug = pg.path.slice("products/".length);
      if (!prodSlugs.has(slug)) findings.push(`Orphan product page: ${pg.path}`);
    }
  }
  // missing overview
  if (!paths.has("overview")) findings.push("Missing overview page");

  await appendWikiLog(admin, userId, {
    kind: "lint",
    subject: "lint",
    summary: findings.length ? `${findings.length} findings` : "No issues",
    meta: { findings },
  });

  return {
    summary: findings.length ? `${findings.length} findings` : "Wiki healthy",
    touched: [],
  };
}
