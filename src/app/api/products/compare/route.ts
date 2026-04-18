import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callClaude, isClaudeConfigured } from "@/lib/claude-client";
import { ADMIN_USER_ID } from "@/lib/admin";
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";
import { rateLimit, clientIp } from "@/lib/rate-limit";

interface Alternative {
  name: string;
  brand: string;
  price_range?: string;
  why?: string;
}

interface CompareResponse {
  product_name: string;
  brand?: string;
  category?: string;
  domain?: "skincare" | "haircare" | "makeup" | "other";
  summary: string;
  key_ingredients?: string[];
  good_for?: string[];
  watch_out_for?: string[];
  fit_for_you?: string;       // personalized commentary
  cheaper_alternatives?: Alternative[];
  premium_alternatives?: Alternative[];
  best_overall?: Alternative;
}

const SYSTEM_PROMPT = `You are Suki, a skincare / haircare / makeup expert.
You are given either a text description of a product or a photo of one.
You explain what the product is in plain language, who it's for, what the key
ingredients do, what to watch out for, and — critically — find SIMILAR products
at different price points. Prefer honest over enthusiastic. Be specific.

You always respond with a single JSON object. No code fences, no prose outside
JSON. Do not invent brands or SKUs. If you are unsure about the exact product,
say so in the summary and give guidance for the product CATEGORY.`;

function buildUserPrompt(opts: {
  text?: string;
  profileSummary?: string;
  preferenceMode?: string;
}) {
  const parts: string[] = [];
  parts.push("Task: describe this product and find similar options at different price points.");

  if (opts.text) parts.push(`Product description from user: ${opts.text}`);
  if (opts.profileSummary) parts.push(`User profile: ${opts.profileSummary}`);
  if (opts.preferenceMode) {
    const hint: Record<string, string> = {
      budget: "User values drugstore / under $25 picks. Heavily favor low-cost alternatives.",
      simple: "User wants minimal routines. Prefer multi-tasking products.",
      high_end: "User prefers premium / luxury brands with strong formulations.",
      most_recommended: "Prefer the most widely loved picks regardless of price.",
    };
    parts.push(`Preference mode: ${opts.preferenceMode} — ${hint[opts.preferenceMode] ?? ""}`);
  }

  parts.push(
    `Return ONLY this JSON schema (omit optional fields you're unsure about):
{
  "product_name": string,
  "brand": string | null,
  "category": string | null,
  "domain": "skincare" | "haircare" | "makeup" | "other",
  "summary": string (2-3 sentences, plain language),
  "key_ingredients": string[] (up to 6),
  "good_for": string[] (up to 5 bullet phrases),
  "watch_out_for": string[] (up to 4 bullet phrases),
  "fit_for_you": string | null (1-2 sentences personalized for the user profile),
  "cheaper_alternatives": [{"name": string, "brand": string, "price_range": string, "why": string}] (2-3),
  "premium_alternatives": [{"name": string, "brand": string, "price_range": string, "why": string}] (1-2),
  "best_overall": {"name": string, "brand": string, "price_range": string, "why": string}
}`
  );
  return parts.join("\n\n");
}

function summarizeProfile(p: Record<string, unknown> | null): string {
  if (!p) return "No profile on file.";
  const parts: string[] = [];
  if (p.skin_type) parts.push(`skin: ${p.skin_type}`);
  if (Array.isArray(p.skin_concerns) && p.skin_concerns.length)
    parts.push(`concerns: ${(p.skin_concerns as string[]).join(", ")}`);
  if (p.skin_tone) parts.push(`tone: ${p.skin_tone}`);
  if (p.age_range) parts.push(`age: ${p.age_range}`);
  if (p.budget) parts.push(`budget: ${p.budget}`);
  if (Array.isArray(p.known_allergies) && (p.known_allergies as string[]).length)
    parts.push(`allergies: ${(p.known_allergies as string[]).join(", ")}`);
  if (p.hair_type) parts.push(`hair: ${p.hair_type}`);
  if (Array.isArray(p.hair_concerns) && (p.hair_concerns as string[]).length)
    parts.push(`hair concerns: ${(p.hair_concerns as string[]).join(", ")}`);
  if (p.undertone) parts.push(`undertone: ${p.undertone}`);
  if (p.makeup_style) parts.push(`makeup: ${p.makeup_style}`);
  return parts.join("; ") || "Profile exists but is minimal.";
}

function stripCodeFence(s: string): string {
  return s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function extractJson(raw: string): string | null {
  // Try a straight parse first after fence strip.
  const fenced = stripCodeFence(raw);
  try {
    JSON.parse(fenced);
    return fenced;
  } catch {}
  // Fallback: extract the first top-level object. Handles "Here's your JSON:\n```json\n{..}```"
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    JSON.parse(match[0]);
    return match[0];
  } catch {
    return null;
  }
}

// Minimal request limit: body payloads include base64 images which can be large.
// (Next.js default limit for App Router route handlers is generous — this is a safety cap.)
const MAX_BODY_BYTES = 8 * 1024 * 1024; // 8 MB

// Raise the default App Router body-size limit for this route so photo uploads work.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isClaudeConfigured()) {
    return NextResponse.json(
      { error: "Claude is not configured." },
      { status: 500 }
    );
  }

  // Auth gate: must be signed-in user or admin session.
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  let authedUserId: string | null = null;
  if (isAdmin) {
    authedUserId = ADMIN_USER_ID;
  } else {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      authedUserId = user?.id ?? null;
    } catch {
      authedUserId = null;
    }
  }
  if (!authedUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 compares per minute per user, hard-block another minute if tripped.
  // Also per-IP as a safety net against a single abuser rotating accounts.
  const ip = clientIp(req.headers);
  const userRl = rateLimit({
    key: `compare:u:${authedUserId}`,
    limit: 10,
    windowMs: 60_000,
    blockMs: 60_000,
  });
  const ipRl = rateLimit({
    key: `compare:ip:${ip}`,
    limit: 30,
    windowMs: 60_000,
    blockMs: 60_000,
  });
  if (!userRl.ok || !ipRl.ok) {
    const retry =
      Math.max(userRl.retryAfterSeconds ?? 0, ipRl.retryAfterSeconds ?? 0) || 60;
    return NextResponse.json(
      { error: `Too many requests — try again in ${retry}s.` },
      {
        status: 429,
        headers: { "Retry-After": String(retry) },
      }
    );
  }

  // Quick body-size guard
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: `Body too large (limit ${Math.floor(MAX_BODY_BYTES / 1024 / 1024)} MB).` },
      { status: 413 }
    );
  }

  let body: {
    text?: string;
    imageBase64?: string;
    imageMime?: string;
    preferenceMode?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";

  if (!text && !imageBase64) {
    return NextResponse.json(
      { error: "Provide 'text' or 'imageBase64'." },
      { status: 400 }
    );
  }

  // Load current user profile (best-effort) using the already-resolved userId.
  let profile: Record<string, unknown> | null = null;
  try {
    const supabase = isAdmin ? createAdminClient() : await createClient();
    const { data } = await supabase
      .from("users_profile")
      .select("*")
      .eq("user_id", authedUserId)
      .single();
    if (data) profile = data as Record<string, unknown>;
  } catch (e) {
    console.warn("compare: failed to load profile", e);
  }

  // Client-provided preference mode wins over DB.
  const ALLOWED_MODES = new Set([
    "budget",
    "simple",
    "high_end",
    "most_recommended",
  ]);
  const clientMode =
    typeof body.preferenceMode === "string" &&
    ALLOWED_MODES.has(body.preferenceMode)
      ? body.preferenceMode
      : undefined;
  const profileMode =
    typeof profile?.preference_mode === "string" &&
    ALLOWED_MODES.has(profile.preference_mode as string)
      ? (profile.preference_mode as string)
      : undefined;

  const prompt = buildUserPrompt({
    text: text || (imageBase64 ? "(See attached image.)" : undefined),
    profileSummary: summarizeProfile(profile),
    preferenceMode: clientMode ?? profileMode ?? "most_recommended",
  });

  const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const rawMime = typeof body.imageMime === "string" ? body.imageMime : "";
  // Only enforce mime if an image was actually supplied.
  if (imageBase64 && (!rawMime || !allowedMime.includes(rawMime))) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." },
      { status: 415 }
    );
  }
  const imageMime = rawMime || "image/jpeg";

  let raw: string;
  try {
    const result = await callClaude({
      system: SYSTEM_PROMPT,
      prompt,
      maxTokens: 1400,
      image: imageBase64
        ? { base64: imageBase64, mediaType: imageMime }
        : null,
    });
    raw = result.text;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Claude call failed: ${msg}` }, { status: 502 });
  }

  const jsonStr = extractJson(raw);
  if (!jsonStr) {
    return NextResponse.json(
      { error: "Model returned non-JSON.", raw: raw.slice(0, 400) },
      { status: 502 }
    );
  }
  let parsed: CompareResponse;
  try {
    parsed = JSON.parse(jsonStr) as CompareResponse;
  } catch {
    return NextResponse.json(
      { error: "Model returned non-JSON.", raw: raw.slice(0, 400) },
      { status: 502 }
    );
  }

  // Safety: ensure product_name exists so the client never crashes.
  if (!parsed.product_name || !parsed.product_name.trim()) {
    parsed.product_name = text || "Unknown product";
  }
  if (!parsed.summary) {
    parsed.summary = "Couldn't read this clearly. Try a closer photo or type the product name.";
  }

  return NextResponse.json(parsed);
}
