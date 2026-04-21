# Suki Beauty Wiki — Plan

Adapting Karpathy's LLM Wiki pattern (https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
into Suki so every user has a persistent, compounding knowledge base about her skin, hair, and
makeup journey that Suki (the AI) continuously maintains.

## Why this wins for Suki

Today, every AI chat turn in Suki re-derives knowledge from raw user_products + routine_steps +
profile rows. Ask "will this new retinol pill with my current PM routine?" and Claude has to
re-read everything, re-cross-reference ingredients, re-reason about sensitivity, every single time.
Nothing compounds. Progress photos do not inform tomorrow's recommendations. Allergen learnings
from week 3 are forgotten by week 12.

A Beauty Wiki flips that. Every ingest (new product, new progress photo, new journal entry, new
purchase) triggers Suki to read the raw source once and update a synthesized, interlinked set of
markdown pages about the user. Every later query is answered against the wiki, not from scratch.

What this unlocks:

1. Real memory. "Your niacinamide 10 percent worked for your jaw breakouts in February but stopped
   helping after you added the vitamin C. Drop one of them." This requires persistent synthesis.
2. Proactive detection. A nightly lint pass flags contradictions (your gentle cleanser contains an
   allergen you flagged last month), stale routines (no progress in 60 days), and missing data.
3. Cheaper, faster chat. Each message fires a search over a few hundred tokens of curated wiki
   pages, not thousands of raw rows plus reasoning.
4. A shareable artifact. Export the wiki as a PDF and the user has her "beauty bible". A
   dermatologist consult input. A differentiator vs every other skincare app.
5. Cross-domain reasoning. Because haircare, skincare, and makeup wiki pages are interlinked, Suki
   can notice that the same silicone driving hair buildup is also sitting on the forehead in the
   foundation.

## Architecture

Three layers, matching the gist:

### Raw sources (immutable)
Already in Postgres: user_products, user_routine_steps, users_profile, progress_photos,
compare_history, purchase_receipts. Plus future: journal_entries, chat_transcripts, upload photos.
The wiki never rewrites these. It reads them.

### The wiki (LLM-owned markdown)
A new Supabase table `user_wiki_pages`:

```
id            uuid pk
user_id       uuid fk -> auth.users (RLS: owner + service role only)
path          text  (e.g. "overview", "products/la-roche-posay-effaclar", "concerns/acne")
title         text
summary       text  (one-line, shown in index)
content       text  (full markdown)
version       int   (increments on every write)
source_refs   jsonb (list of {type, id} that contributed)
updated_at    timestamptz
embedding     vector(1536)  (for semantic search once volume warrants)

unique(user_id, path)
index on user_id, path
gin on to_tsvector('english', content)  -- FTS
```

Page types and naming convention:

```
overview                       profile at a glance (skin type, goals, budget, preference mode)
index                          auto-generated catalog of all pages for this user
log                            append-only event log
products/{slug}                one page per owned product
routines/morning | evening | weekly | wash-day | non-wash-day
concerns/{slug}                acne, dark-spots, frizz, dry-ends, hooded-lids, etc.
ingredients/{slug}             niacinamide, retinol, salicylic, dimethicone
allergens/{slug}               fragrance, lanolin, sulfates, etc.
progress/{yyyy-mm}             monthly synthesis of progress photos + notes
goals/{slug}                   "clear jawline by June", "less frizz on wash day 3"
comparisons/{slug}             outputs of /compare filed back in as wiki pages
```

### The schema (how Suki writes the wiki)
A new file `src/lib/ai/wiki-system-prompt.ts` exports the CLAUDE.md-equivalent system prompt
injected into every Suki AI chat call. It tells Claude the conventions (slug format, required
frontmatter, cross-link style, when to update vs create, when to log), mirrors Karpathy's
"disciplined wiki maintainer" framing, and plugs into Anthropic tool-use so Claude can read and
write pages deterministically.

## Operations, mapped onto Suki flows

**Ingest (product add)**
User taps Add Product -> types brand + product name -> Claude vision parses the bottle photo.
After the row lands in user_products, enqueue a job that:
1. Fetches product ingredients, category, conflicts.
2. Reads: overview, matching routine page, ingredients/* pages, concerns/* pages for user goals.
3. Writes: products/{slug}.md (entity page), updates routine page to include it, adds it to any
   ingredients/* pages, flags conflicts on allergens/* or concerns/* pages.
4. Appends to log: `## [2026-04-20] ingest | product | {brand} {name}`.

**Ingest (progress photo)**
Similar. Reads the photo with vision, drops a dated bullet into progress/{yyyy-mm}.md, updates
concerns/* pages with new evidence, possibly revises the synthesis on overview.md.

**Ingest (chat insight)**
If the user tells Suki "sunscreen makes my eyes burn", Claude writes that into allergens or
concerns and appends to log. Future chats remember without re-asking.

**Query (any AI chat turn)**
1. Vector/FTS search over wiki_pages for top 5-8 chunks.
2. Always include overview.md and index.md.
3. Answer with [[wiki-links]] citations; optionally file the answer back as a new
   comparisons/* or concerns/* page when the user says "save this".

**Lint (nightly cron)**
For each active user, Claude runs a health check: contradictions, stale claims, orphan pages,
concerns with no attached products, routines missing SPF, allergens contradicted by owned
products. Drops a diff summary into log.md and surfaces a "Suki noticed 3 things" pill on the
Today home.

## API surface (Next.js App Router)

```
POST /api/wiki/ingest       body: { kind, ref_id }   enqueue a maintenance run
GET  /api/wiki/page         ?path=overview           read a page
POST /api/wiki/page         body: { path, title, summary, content, source_refs }
POST /api/wiki/search       body: { query, limit }   FTS then vector rerank
POST /api/wiki/lint         run the nightly lint on demand
GET  /api/wiki/index        return parsed index.md
```

All routes use the existing resolveAuth() helper (admin cookie + real user precedence fix
already shipped) and RLS. Writes use the service-role client from the server only.

## Claude tool definitions

```ts
list_wiki_pages()                               -> [{path, title, summary, updated_at}]
read_wiki_page(path)                            -> {content, source_refs}
upsert_wiki_page(path, title, summary, content) -> {version}
append_to_log(entry)                            -> ok
search_wiki(query, limit=8)                     -> [{path, snippet, score}]
```

These go in `src/lib/ai/wiki-tools.ts` and are passed to every Anthropic call that runs inside a
Suki session. A small planner prompt decides which tools to call given the user turn.

## Rollout, phased

**Phase 1 (1-2 days) — foundation**
- migration 007_wiki.sql: table + RLS + FTS index
- `src/lib/wiki/*`: page CRUD, slugify, log append
- API: /api/wiki/page, /api/wiki/search, /api/wiki/index
- Seed script: for each existing user, generate overview.md from users_profile + owned products
- No UI yet

**Phase 2 (2-3 days) — ingest on mutations**
- Hook into existing "add product", "update routine step", "add progress photo" code paths
- Enqueue a wiki maintenance job (BullMQ or simple Postgres queue table)
- Background worker runs Claude with tools to update pages
- Log entries on every ingest

**Phase 3 (2 days) — chat uses the wiki**
- Update AIChatWidget system prompt to include wiki awareness
- Every turn: pre-search wiki, include overview + matching pages in context
- Offer "save this answer to my wiki" CTA on useful replies

**Phase 4 (2 days) — surfacing + lint**
- New /me/wiki page: markdown viewer, graph-ish links, search bar, log timeline
- Nightly cron /api/wiki/lint (Vercel cron)
- Today home pill: "Suki noticed 3 things in your wiki"

**Phase 5 (optional) — power features**
- pgvector embeddings for semantic search beyond FTS
- Export wiki as PDF beauty bible
- Share a read-only slice with a derm via a signed link

## What it gives the user in plain English

Suki stops feeling like a chatbot with product rows and starts feeling like an ever-learning
beauty assistant. Every product, every photo, every question makes her picture of you sharper.
Ask her anything and she cites her own notes about you. Open your profile and there is a book
Suki has been writing about your skin, growing every week.

## What it gives us

A real moat. Chat-only skincare apps look identical from the outside. A Suki account with a
6-month compounding wiki is extremely hard to leave because the intelligence is not the model,
it is the synthesized notes about that specific user. And because the wiki is markdown rows in
Postgres, it is cheap, portable, exportable, and auditable.
