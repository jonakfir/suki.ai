import { NextResponse } from "next/server";
import { callClaude, isClaudeConfigured } from "@/lib/claude-client";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are suki., a warm, expert skincare AI advisor.
You understand ingredients deeply (actives, interactions, comedogenicity, pH, barrier health).
You give personalized, honest guidance — never hype. If a user mentions allergies, sensitivities, or a bad reaction, respect them absolutely.
When recommending a routine, explain the reasoning briefly so the user learns.
Keep responses concise (under 200 words) unless the user asks for more depth.
Use short bullet points when listing steps or products.
Never prescribe medication or claim to diagnose medical conditions — suggest a dermatologist for anything beyond cosmetic skincare.`;

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

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "suki."}: ${m.content}`)
    .join("\n\n");

  try {
    const result = await callClaude({
      system: SYSTEM,
      prompt: transcript,
      maxTokens: 800,
    });
    return NextResponse.json({ text: result.text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
