/**
 * Integration tests for POST /api/scan/barcode.
 *
 * Mocks (per Agent C's testing notes and the layout in route.ts):
 *   - `next/headers#cookies` — controls admin-session vs. user-session path.
 *   - `@/lib/supabase/server` / `@/lib/supabase/admin` — auth resolution.
 *   - `@/lib/open-beauty-facts#getProductByBarcode` — OBF response shape.
 *   - We import the route handler directly and invoke it with a fresh
 *     `Request`. Vitest's vi.mock hoists, so the mocks shadow the real
 *     implementations at module-load time.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Module mocks ─────────────────────────────────────────────────────────
// vi.mock factories are hoisted to the top of the file, so any variables
// they reference must be created via vi.hoisted() to be available at that
// point. Plain `const` declarations are NOT hoisted with the mock.

const {
  cookiesGetMock,
  getUserMock,
  getProductByBarcodeMock,
  normalizeBarcodeMock,
} = vi.hoisted(() => ({
  cookiesGetMock: vi.fn(),
  getUserMock: vi.fn(),
  getProductByBarcodeMock: vi.fn(),
  normalizeBarcodeMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: cookiesGetMock,
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
  })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_USER_ID: "00000000-0000-0000-0000-000000000000",
}));

vi.mock("@/lib/open-beauty-facts", () => ({
  getProductByBarcode: getProductByBarcodeMock,
  normalizeBarcode: normalizeBarcodeMock,
}));

// Import AFTER mocks are declared so the route picks up the stubs.
import { POST } from "./route";

beforeEach(() => {
  cookiesGetMock.mockReset();
  getUserMock.mockReset();
  getProductByBarcodeMock.mockReset();
  normalizeBarcodeMock.mockReset();

  // Default: a signed-in non-admin user; admin cookie absent.
  cookiesGetMock.mockReturnValue(undefined);
  getUserMock.mockResolvedValue({
    data: { user: { id: "user-1", email: "t@t" } },
  });
  // Default normalize: pass through 13-digit input untouched.
  normalizeBarcodeMock.mockImplementation((raw: string) => {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    if (trimmed.length === 13) return trimmed;
    if (trimmed.length === 12) return `0${trimmed}`;
    return null;
  });
});

function jsonReq(body: unknown): Request {
  return new Request("https://test.local/api/scan/barcode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/scan/barcode", () => {
  it("returns 401 when unauthenticated", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(jsonReq({ barcode: "5901234123457" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when barcode is missing", async () => {
    const res = await POST(jsonReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when barcode is non-string", async () => {
    const res = await POST(jsonReq({ barcode: 123456 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed barcode (wrong length)", async () => {
    normalizeBarcodeMock.mockReturnValueOnce(null);
    const res = await POST(jsonReq({ barcode: "abc" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; barcode: string };
    expect(body.error).toMatch(/invalid/i);
    expect(body.barcode).toBe("abc");
  });

  it("returns 400 when JSON body is unparseable", async () => {
    const req = new Request("https://test.local/api/scan/barcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("happy path — known EAN returns identified product + raw", async () => {
    getProductByBarcodeMock.mockResolvedValueOnce({
      barcode: "5901234123457",
      name: "Hydrating Cleanser",
      brand: "CeraVe",
      ingredients: ["water", "glycerin", "ceramide"],
      ingredients_raw: "Water, Glycerin, Ceramide NP",
      category: "cleanser",
      image_url: "https://images.openbeautyfacts.org/x.jpg",
      completeness: 0.7,
    });

    const res = await POST(jsonReq({ barcode: "5901234123457" }));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      analysis: {
        products: Array<{ name: string; brand: string; category: string }>;
      };
      raw: { barcode: string; image_url: string | null; ingredients: string[] };
    };

    expect(body.analysis.products).toHaveLength(1);
    expect(body.analysis.products[0].name).toBe("Hydrating Cleanser");
    expect(body.analysis.products[0].brand).toBe("CeraVe");
    expect(body.analysis.products[0].category).toBe("cleanser");
    expect(body.raw.barcode).toBe("5901234123457");
    expect(body.raw.ingredients).toEqual(["water", "glycerin", "ceramide"]);
  });

  it("unknown barcode → 200 with not_found error and empty products", async () => {
    getProductByBarcodeMock.mockResolvedValueOnce(null);
    const res = await POST(jsonReq({ barcode: "5901234123457" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      analysis: { products: unknown[] };
      error: string;
      barcode: string;
    };
    expect(body.analysis.products).toEqual([]);
    expect(body.error).toBe("not_found");
    expect(body.barcode).toBe("5901234123457");
  });

  it("OBF AbortError → 200 with timeout error", async () => {
    const abortErr = new Error("aborted");
    abortErr.name = "AbortError";
    getProductByBarcodeMock.mockRejectedValueOnce(abortErr);

    const res = await POST(jsonReq({ barcode: "5901234123457" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("timeout");
  });

  it("OBF generic failure → 200 with service_error", async () => {
    getProductByBarcodeMock.mockRejectedValueOnce(new Error("ETIMEDOUT"));
    const res = await POST(jsonReq({ barcode: "5901234123457" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("service_error");
  });

  it("admin session resolves via admin client, bypasses getUser", async () => {
    cookiesGetMock.mockReturnValueOnce({ value: "true" });
    getProductByBarcodeMock.mockResolvedValueOnce({
      barcode: "5901234123457",
      name: "Admin Test Product",
      brand: "Brand",
      ingredients: ["a", "b"],
      ingredients_raw: "A, B",
      category: "cleanser",
      image_url: null,
      completeness: 0.5,
    });

    const res = await POST(jsonReq({ barcode: "5901234123457" }));
    expect(res.status).toBe(200);
    // getUser should not have been called when admin cookie is present.
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("passes the *normalized* barcode to OBF lookup", async () => {
    normalizeBarcodeMock.mockReturnValueOnce("0012345678905");
    getProductByBarcodeMock.mockResolvedValueOnce(null);

    await POST(jsonReq({ barcode: "012345678905" }));
    expect(getProductByBarcodeMock).toHaveBeenCalledWith("0012345678905");
  });
});
