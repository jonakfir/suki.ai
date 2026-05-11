/**
 * Tests for the barcode `createDetector` factory.
 *
 * Most of `detector.ts` is browser-API bound (MediaStream, BarcodeDetector,
 * ZXing). We exercise the two contract-level properties that don't require
 * a live camera:
 *
 *   1. The native path advertises only the four target formats
 *      (ean_13, ean_8, upc_a, upc_e).
 *   2. The detector latches — a second `onDetected` invocation within the
 *      same session must be dropped.
 *
 * The ZXing fallback path requires dynamic-imports of `@zxing/browser` and
 * a working DOM video element; it's covered manually in QA per Agent A's
 * note. We assert here that the factory falls *back* when the native API
 * isn't present.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDetector } from "./detector";

interface DetectResult {
  rawValue: string;
  format: string;
}

class FakeBarcodeDetector {
  static lastCtorOpts: { formats?: string[] } | undefined;
  static lastInstance: FakeBarcodeDetector | undefined;
  static getSupportedFormats = vi.fn(async () => [
    "ean_13",
    "ean_8",
    "upc_a",
    "upc_e",
    "qr_code", // extra — should still be acceptable
  ]);

  detectResults: DetectResult[] = [];
  detect: ReturnType<typeof vi.fn>;

  constructor(opts?: { formats?: string[] }) {
    FakeBarcodeDetector.lastCtorOpts = opts;
    FakeBarcodeDetector.lastInstance = this;
    this.detect = vi.fn(async () => this.detectResults);
  }
}

function stubNativeDetector(impl?: () => void) {
  (window as unknown as { BarcodeDetector: typeof FakeBarcodeDetector }).BarcodeDetector =
    FakeBarcodeDetector;
  impl?.();
}

function unstubNativeDetector() {
  // @ts-expect-error clean up
  delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
}

afterEach(() => {
  unstubNativeDetector();
  vi.restoreAllMocks();
});

describe("createDetector — native path", () => {
  it("passes only EAN/UPC formats to the native BarcodeDetector ctor", async () => {
    stubNativeDetector();
    await createDetector();
    expect(FakeBarcodeDetector.lastCtorOpts).toBeDefined();
    const formats = FakeBarcodeDetector.lastCtorOpts?.formats ?? [];
    expect(formats.sort()).toEqual(["ean_13", "ean_8", "upc_a", "upc_e"].sort());
  });

  it("checks supported formats and accepts when at least one EAN/UPC is supported", async () => {
    stubNativeDetector();
    FakeBarcodeDetector.getSupportedFormats.mockResolvedValueOnce(["ean_13"]);
    const detector = await createDetector();
    expect(detector).toBeDefined();
    expect(typeof detector.decodeFromVideo).toBe("function");
  });
});

describe("createDetector — latch behavior", () => {
  it("fires onDetected at most once across many frames", async () => {
    stubNativeDetector();

    // Construct a fake <video> with the bits the detector touches.
    const video = {
      readyState: 4,
      videoWidth: 640,
      videoHeight: 480,
    } as unknown as HTMLVideoElement;

    // requestVideoFrameCallback / requestAnimationFrame shims that fire
    // synchronously so we don't have to wait for real frames.
    let scheduleCount = 0;
    (window as unknown as { requestAnimationFrame: typeof window.requestAnimationFrame })
      .requestAnimationFrame = ((cb: FrameRequestCallback) => {
      scheduleCount += 1;
      if (scheduleCount > 50) return 0; // safety stop
      cb(0);
      return scheduleCount;
    }) as typeof window.requestAnimationFrame;

    (window as unknown as { cancelAnimationFrame: typeof window.cancelAnimationFrame })
      .cancelAnimationFrame = (() => undefined) as typeof window.cancelAnimationFrame;

    const detector = await createDetector();
    const onDetected = vi.fn();
    const stop = await detector.decodeFromVideo(video, onDetected);

    const detectMock = FakeBarcodeDetector.lastInstance!.detect;
    detectMock.mockImplementation(async () => [
      { rawValue: "5901234123457", format: "ean_13" },
    ]);
    // Give the microtask queue room to flush.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    stop();

    // Latch fires exactly once even though the underlying detect() might
    // be called multiple times before the latch flag flips.
    expect(onDetected).toHaveBeenCalledTimes(1);
    expect(onDetected).toHaveBeenCalledWith("5901234123457", "ean_13");
  });

  it("subsequent invocations within the same session are dropped", async () => {
    stubNativeDetector();

    const video = {
      readyState: 4,
      videoWidth: 640,
      videoHeight: 480,
    } as unknown as HTMLVideoElement;

    let scheduleCount = 0;
    (window as unknown as { requestAnimationFrame: typeof window.requestAnimationFrame })
      .requestAnimationFrame = ((cb: FrameRequestCallback) => {
      scheduleCount += 1;
      if (scheduleCount > 20) return 0;
      cb(0);
      return scheduleCount;
    }) as typeof window.requestAnimationFrame;
    (window as unknown as { cancelAnimationFrame: typeof window.cancelAnimationFrame })
      .cancelAnimationFrame = (() => undefined) as typeof window.cancelAnimationFrame;

    const detector = await createDetector();
    const onDetected = vi.fn();
    const stop = await detector.decodeFromVideo(video, onDetected);

    const detectMock = FakeBarcodeDetector.lastInstance!.detect;
    // Always returns the same result every frame — should still latch.
    detectMock.mockResolvedValue([
      { rawValue: "0012345678905", format: "upc_a" },
    ]);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    stop();

    expect(onDetected).toHaveBeenCalledTimes(1);
  });
});

describe("createDetector — fallback selection", () => {
  it("falls back to ZXing path when native BarcodeDetector is absent", async () => {
    // No native stub installed → must take the dynamic-import branch.
    unstubNativeDetector();

    // Mock the dynamic imports so we don't actually pull in 400KB of ZXing.
    vi.doMock("@zxing/browser", () => ({
      BrowserMultiFormatReader: vi.fn().mockImplementation(() => ({
        decodeFromVideoElement: vi.fn(async () => ({ stop: vi.fn() })),
        decodeFromImageElement: vi.fn(async () => null),
      })),
    }));
    vi.doMock("@zxing/library", () => ({
      DecodeHintType: { POSSIBLE_FORMATS: 1, TRY_HARDER: 2 },
      BarcodeFormat: {
        EAN_13: 10,
        EAN_8: 11,
        UPC_A: 12,
        UPC_E: 13,
      },
    }));

    const detector = await createDetector();
    expect(detector).toBeDefined();
    expect(typeof detector.decodeFromVideo).toBe("function");
    expect(typeof detector.stop).toBe("function");
  });
});
