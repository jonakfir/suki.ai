import Anthropic from "@anthropic-ai/sdk";

const PROXY_TIMEOUT_MS = 120_000;

interface ClaudeCallOptions {
  system: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
}

interface ClaudeCallResult {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    model?: string;
  };
}

function isProxyConfigured(): boolean {
  return !!(process.env.SUKI_PROXY_URL && process.env.SUKI_PROXY_SECRET);
}

export function isClaudeConfigured(): boolean {
  return isProxyConfigured() || !!process.env.ANTHROPIC_API_KEY;
}

async function callProxy(opts: ClaudeCallOptions): Promise<ClaudeCallResult> {
  const url = process.env.SUKI_PROXY_URL!.trim().replace(/\/$/, "");
  const secret = process.env.SUKI_PROXY_SECRET!.trim();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${url}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Daytrip-Secret": secret,
      },
      body: JSON.stringify({
        system: opts.system,
        prompt: opts.prompt,
        model: opts.model ?? "claude-sonnet-4-6",
        maxTokens: opts.maxTokens ?? 4000,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`Proxy timeout after ${PROXY_TIMEOUT_MS / 1000}s`);
    }
    throw new Error(
      `Proxy fetch failed: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Proxy returned ${res.status}: ${text.slice(0, 300)}`);
  }

  let data: {
    text?: string;
    error?: string;
    usage?: { inputTokens?: number; outputTokens?: number; model?: string };
  };
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(
      `Proxy returned non-JSON: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  if (data.error) throw new Error(`Proxy error: ${data.error}`);
  if (!data.text) throw new Error("Proxy returned no text");

  return {
    text: data.text,
    usage: {
      inputTokens: data.usage?.inputTokens ?? 0,
      outputTokens: data.usage?.outputTokens ?? 0,
      model: data.usage?.model,
    },
  };
}

async function callSdk(opts: ClaudeCallOptions): Promise<ClaudeCallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: opts.model ?? "claude-sonnet-4-6",
    max_tokens: opts.maxTokens ?? 4000,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return {
    text,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: opts.model ?? "claude-sonnet-4-6",
    },
  };
}

export async function callClaude(
  opts: ClaudeCallOptions
): Promise<ClaudeCallResult> {
  if (isProxyConfigured()) {
    try {
      return await callProxy(opts);
    } catch (proxyErr) {
      const msg =
        proxyErr instanceof Error ? proxyErr.message : String(proxyErr);
      console.warn(`Proxy failed, falling back to SDK: ${msg}`);
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error(
          `Claude proxy unavailable and ANTHROPIC_API_KEY is not set. Proxy error: ${msg}`
        );
      }
      return await callSdk(opts);
    }
  }
  return callSdk(opts);
}
