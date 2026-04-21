import { NextResponse } from "next/server";
import { callClaude, isClaudeConfigured } from "@/lib/claude-client";
import { resolveAuth, type ApiSupabase } from "@/lib/api-auth";
import { readWikiPage, searchWiki, appendWikiLog } from "@/lib/wiki/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_SYSTEM = `You are suki., a warm, expert beauty AI advisor spanning skincare, haircare, and makeup.
You understand ingredients deeply (actives, interactions, comedogenicity, pH, barrier health) and how they cross domains.
You give personalized, honest guidance — never hype. If the user mentions allergies, sensitivities, or a bad reaction, respect them absolutely.
When recommending a routine, explain the reasoning briefly so the user learns.
Keep responses concise (under 200 words) unless the user asks for more depth.
Use short bullet points when listing steps or products.
Never prescribe medication or claim to diagnose medical conditions — suggest a dermatologist for anything beyond cosmetic skincare.

Beauty Wiki awareness:
You have a per-user Beauty Wiki — a compounding knowledge base of notes about this specific user
(overview, products, routines, concerns, allergens, ingredients). When context from the wiki is
provided below, TRUST IT over your base knowledge about beauty in general, and cite pages with
[[namespace/slug]] style tags so the user can follow up.`;

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  if (!isClaudeConfigured()) {
    return NextResponse.json(
      { error: "Claude not configured on this server." },
      { status: 503 }
    );
  }

  let body: { messages?: Msg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const messages = body.messages ?? [];
  if (!messages.length) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  // Pull wiki context for the logged-in user. If there is no session (e.g.
  // anonymous landing), skip gracefully.
  const auth = await resolveAuth();
  const wikiContext = "error" in auth
    ? ""
    : await buildWikiContext(auth.supabase, auth.userId, messages).catch((e) => {
        console.warn("wiki context failed:", e);
        return "";
      });

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "suki."}: ${m.content}`)
    .join("\n\n");

  const system = wikiContext
    ? `${BASE_SYSTEM}\n\n# User's Beauty Wiki (relevant excerpt)\n\n${wikiContext}`
    : BASE_SYSTEM;

  try {
    const result = await callClaude({
      system,
      prompt: transcript,
      maxTokens: 800,
    });

    // Best-effort: log the query for the wiki timeline.
    if (!("error" in auth)) {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      appendWikiLog(auth.supabase, auth.userId, {
        kind: "query",
        subject: (lastUser?.content ?? "").slice(0, 120),
        summary: result.text.slice(0, 240),
      }).catch(() => {});
    }

    return NextResponse.json({ text: result.text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function buildWikiContext(
  db: ApiSupabase,
  userId: string,
  messages: Msg[]
): Promise<string> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const [overview, hits] = await Promise.all([
    readWikiPage(db, userId, "overview"),
    lastUser ? searchWiki(db, userId, lastUser, 5) : Promise.resolve([]),
  ]);

  const parts: string[] = [];
  if (overview) {
    parts.push(
      `## overview\n\n${trimTo(overview.content, 1800)}`
    );
  }
  if (hits.length > 0) {
    parts.push("## matching pages");
    for (const h of hits) {
      parts.push(`### [[${h.path}]] — ${h.title}\n${h.summary}\n\n${trimTo(h.snippet, 500)}`);
    }
  }
  return parts.join("\n\n");
}

function trimTo(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n…(truncated)`;
}
