/**
 * Chainable Supabase client mock.
 *
 * The Supabase JS client exposes a fluent builder:
 *   supabase.from("t").select("*").eq("k", v).single()
 * Every intermediate call returns a builder; the terminal call resolves to
 * `{ data, error }`. We approximate that with a Proxy that returns itself for
 * any builder method and exposes a `.thenResolve(...)` helper to set the
 * eventual `{ data, error }` for the `await`.
 *
 * Usage:
 *   const sb = makeSupabaseMock({
 *     "users_profile.select": { data: { id: "u1" }, error: null },
 *     "product_outcomes.upsert": { data: null, error: null },
 *   });
 *   sb.from("users_profile").select("*").eq("id", "u1").single();
 *
 * Keys: "<table>.<terminal-method>" where terminal-method is one of
 *   select | insert | update | upsert | delete | rpc | single | maybeSingle
 *
 * The mock also tracks every call (`sb.__calls`) so tests can assert that
 * `from("t").upsert(...)` was invoked with the expected payload.
 */
import { vi } from "vitest";

export interface SupabaseMockResult<T = unknown> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

type ResultMap = Record<string, SupabaseMockResult | undefined>;

export interface SupabaseMockCall {
  table: string | null;
  method: string;
  args: unknown[];
}

export interface SupabaseMock {
  from: (table: string) => SupabaseChain;
  rpc: (fn: string, args?: unknown) => SupabaseChain;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
  storage: {
    from: (bucket: string) => SupabaseStorageChain;
  };
  __calls: SupabaseMockCall[];
  __setResult: (key: string, result: SupabaseMockResult) => void;
}

export interface SupabaseChain {
  select: (...a: unknown[]) => SupabaseChain;
  insert: (...a: unknown[]) => SupabaseChain;
  update: (...a: unknown[]) => SupabaseChain;
  upsert: (...a: unknown[]) => SupabaseChain;
  delete: (...a: unknown[]) => SupabaseChain;
  eq: (...a: unknown[]) => SupabaseChain;
  in: (...a: unknown[]) => SupabaseChain;
  gte: (...a: unknown[]) => SupabaseChain;
  lte: (...a: unknown[]) => SupabaseChain;
  order: (...a: unknown[]) => SupabaseChain;
  limit: (...a: unknown[]) => SupabaseChain;
  single: () => Promise<SupabaseMockResult>;
  maybeSingle: () => Promise<SupabaseMockResult>;
  then: (resolve: (v: SupabaseMockResult) => unknown) => Promise<unknown>;
}

export interface SupabaseStorageChain {
  upload: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  download: ReturnType<typeof vi.fn>;
  createSignedUrl: ReturnType<typeof vi.fn>;
  getPublicUrl: ReturnType<typeof vi.fn>;
}

const TERMINAL_METHODS = new Set([
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
  "single",
  "maybeSingle",
]);

export function makeSupabaseMock(initial: ResultMap = {}): SupabaseMock {
  const results: ResultMap = { ...initial };
  const calls: SupabaseMockCall[] = [];

  function makeChain(table: string | null): SupabaseChain {
    let lastTerminal: string | null = null;

    const chain: Record<string, unknown> = {};

    const recordAndChain = (method: string) =>
      (...args: unknown[]) => {
        calls.push({ table, method, args });
        if (TERMINAL_METHODS.has(method)) {
          lastTerminal = method;
        }
        return chain;
      };

    for (const m of [
      "select",
      "insert",
      "update",
      "upsert",
      "delete",
      "eq",
      "in",
      "gte",
      "lte",
      "order",
      "limit",
    ]) {
      chain[m] = recordAndChain(m);
    }

    const resolveFor = (method: string) => {
      const key = `${table}.${method}`;
      const fallback: SupabaseMockResult = { data: null, error: null };
      return results[key] ?? fallback;
    };

    chain.single = vi.fn(async () => resolveFor("single"));
    chain.maybeSingle = vi.fn(async () => resolveFor("maybeSingle"));

    // Make the chain thenable so `await sb.from("t").select(...)` resolves.
    chain.then = (resolve: (v: SupabaseMockResult) => unknown) => {
      const method = lastTerminal ?? "select";
      return Promise.resolve(resolveFor(method)).then(resolve);
    };

    return chain as unknown as SupabaseChain;
  }

  const storage = (bucket: string): SupabaseStorageChain => {
    const recordOp = (op: string) =>
      vi.fn((...args: unknown[]) => {
        calls.push({ table: `storage:${bucket}`, method: op, args });
        const key = `storage:${bucket}.${op}`;
        return Promise.resolve(results[key] ?? { data: null, error: null });
      });
    return {
      upload: recordOp("upload"),
      remove: recordOp("remove"),
      download: recordOp("download"),
      createSignedUrl: recordOp("createSignedUrl"),
      getPublicUrl: vi.fn((path: string) => ({
        data: { publicUrl: `https://stub.local/${bucket}/${path}` },
      })),
    };
  };

  const mock: SupabaseMock = {
    from: (table: string) => makeChain(table),
    rpc: (fn: string, args?: unknown) => {
      const chain = makeChain(`rpc:${fn}`);
      calls.push({ table: `rpc:${fn}`, method: "rpc", args: [args] });
      return chain;
    },
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "u1", email: "t@test" } },
        error: null,
      })),
    },
    storage: {
      from: storage,
    },
    __calls: calls,
    __setResult: (key, result) => {
      results[key] = result;
    },
  };

  return mock;
}

/**
 * Convenience: build the bare-minimum Next.js Request the route handlers
 * expect. Auth/cookie info is injected via the Supabase mock or by stubbing
 * `next/headers#cookies` at the test boundary.
 */
export function makeJsonRequest(url: string, body: unknown, init: RequestInit = {}): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
    ...init,
  });
}
