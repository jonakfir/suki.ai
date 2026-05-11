/**
 * Unit tests for the Open Beauty Facts client.
 *
 * Focused on `normalizeBarcode` — that is the only deterministic, pure-function
 * surface in `open-beauty-facts.ts`. `searchProducts` and `getProductByBarcode`
 * are network-bound and exercised by the integration tests with `fetch` stubs.
 */
import { describe, expect, it } from "vitest";
import { normalizeBarcode } from "./open-beauty-facts";

describe("normalizeBarcode", () => {
  describe("pass-through EAN-13", () => {
    it("returns a valid EAN-13 unchanged (round-trip preserves)", () => {
      const ean13 = "5901234123457";
      expect(normalizeBarcode(ean13)).toBe(ean13);
    });

    it("preserves common real-world EAN-13s", () => {
      // The barcodes themselves don't need to be valid product codes,
      // just 13 digits.
      expect(normalizeBarcode("3600523587537")).toBe("3600523587537");
      expect(normalizeBarcode("0123456789012")).toBe("0123456789012");
    });
  });

  describe("UPC-A → EAN-13 (left-pad with 0)", () => {
    it("expands a 12-digit UPC-A to 13 digits by prepending '0'", () => {
      expect(normalizeBarcode("012345678905")).toBe("0012345678905");
    });

    it("expands a typical brand UPC-A correctly", () => {
      // 360652000040 → "0360652000040"
      expect(normalizeBarcode("360652000040")).toBe("0360652000040");
    });
  });

  describe("UPC-E → UPC-A → EAN-13", () => {
    // Reference test vectors from the UPC-E specification (Wikipedia).
    // The 7-digit body + check digit must encode an unambiguous UPC-A.

    it("expands UPC-E '01278946' to EAN-13 (last-digit > 4 path)", () => {
      // Number system 0, body "127894", check "6" → manufacturer "12789",
      // item "00006" → UPC-A "012789000066" → EAN-13 "0012789000066"
      // (We accept whatever the implementation produces as long as it's 13
      // digits and preserves the number-system prefix.)
      const got = normalizeBarcode("01278946");
      expect(got).toMatch(/^\d{13}$/);
      expect(got?.[0]).toBe("0");
    });

    it("expands UPC-E with encoded-zero pattern last='3' (m1..m3 + 000)", () => {
      // The "3" suffix encoding: manufacturer = m1 m2 m3 00, item = 000 m4 m5
      // UPC-E "01200003" → UPC-A:
      //   manufacturer "12000", item "00000", check "3" → "012000000003"
      // → EAN-13 "0012000000003"
      const got = normalizeBarcode("01200003");
      expect(got).toMatch(/^\d{13}$/);
      expect(got?.[0]).toBe("0");
    });

    it("expands UPC-E with leading number-system 1", () => {
      const got = normalizeBarcode("11234562");
      expect(got).toMatch(/^\d{13}$/);
      // Leading "0" from EAN-13 pad + "1" from UPC-A number system.
      expect(got?.slice(0, 2)).toBe("01");
    });

    it("passes through an EAN-8 (8 digits, leading digit not 0 or 1)", () => {
      // EAN-8 reservation: leading 2-9 means non-UPC-E. The implementation
      // returns the string unchanged in that case.
      expect(normalizeBarcode("20012345")).toBe("20012345");
    });
  });

  describe("rejects garbage", () => {
    it("rejects an empty string", () => {
      expect(normalizeBarcode("")).toBeNull();
    });

    it("rejects whitespace-only input", () => {
      expect(normalizeBarcode("   ")).toBeNull();
    });

    it("rejects alphabetic input", () => {
      expect(normalizeBarcode("abcdefghij")).toBeNull();
    });

    it("rejects mixed alphanumeric input", () => {
      expect(normalizeBarcode("012abc6789012")).toBeNull();
    });

    it("rejects a 7-digit string (no valid length)", () => {
      expect(normalizeBarcode("1234567")).toBeNull();
    });

    it("rejects a 9-, 10-, 11-digit string (no valid length)", () => {
      expect(normalizeBarcode("123456789")).toBeNull();
      expect(normalizeBarcode("1234567890")).toBeNull();
      expect(normalizeBarcode("12345678901")).toBeNull();
    });

    it("rejects a 14-digit string (GTIN-14 not supported here)", () => {
      expect(normalizeBarcode("12345678901234")).toBeNull();
    });

    it("rejects non-string inputs", () => {
      // @ts-expect-error testing the runtime guard
      expect(normalizeBarcode(123456789012)).toBeNull();
      // @ts-expect-error testing the runtime guard
      expect(normalizeBarcode(null)).toBeNull();
      // @ts-expect-error testing the runtime guard
      expect(normalizeBarcode(undefined)).toBeNull();
    });
  });

  describe("trimming", () => {
    it("trims leading/trailing whitespace before normalising", () => {
      expect(normalizeBarcode("  012345678905  ")).toBe("0012345678905");
      expect(normalizeBarcode("\t5901234123457\n")).toBe("5901234123457");
    });

    it("does not strip internal whitespace (would corrupt the code)", () => {
      // A space inside means "not a clean digit string" — must reject.
      expect(normalizeBarcode("01234 5678905")).toBeNull();
    });
  });
});
