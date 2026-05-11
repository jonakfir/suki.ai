/**
 * Barcode detector abstraction.
 *
 * Tries to use the browser-native `BarcodeDetector` API first. When that is
 * unavailable (Safari < 17, most desktop Firefox, etc.) we dynamic-import
 * `@zxing/browser` so Chromium users never pay for the ~120 KB fallback.
 *
 * Supported formats: ean_13, ean_8, upc_a, upc_e.
 *
 * Each detector latches on the first hit — ZXing emits the same code 5-10
 * times/second otherwise and we want exactly one `onDetected` per scan.
 */

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;
export type SupportedFormat = (typeof FORMATS)[number];

export interface DetectorHandle {
  /**
   * Continuously decode frames from a playing <video>. Resolves to a function
   * that stops the loop. The `onDetected` callback fires at most once.
   */
  decodeFromVideo: (
    video: HTMLVideoElement,
    onDetected: (barcode: string, format: SupportedFormat) => void
  ) => Promise<() => void>;
  /**
   * Single-shot decode from a still image (used by the file-upload fallback
   * when getUserMedia is denied). Resolves with the raw code or null.
   */
  decodeFromImage: (
    source: HTMLImageElement | Blob | File
  ) => Promise<{ barcode: string; format: SupportedFormat } | null>;
  /** Releases any internal resources (zxing controls etc). Idempotent. */
  stop: () => void;
}

/** Narrow typing for the still-unstandardised BarcodeDetector global. */
interface NativeBarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}
interface NativeBarcodeDetector {
  detect: (source: CanvasImageSource | ImageBitmapSource) => Promise<
    Array<{ rawValue: string; format: string }>
  >;
}

interface VideoFrameCallbackWindow extends Window {
  BarcodeDetector?: NativeBarcodeDetectorCtor;
}

function hasNativeBarcodeDetector(): boolean {
  if (typeof window === "undefined") return false;
  return typeof (window as VideoFrameCallbackWindow).BarcodeDetector === "function";
}

/**
 * Best-effort: confirm the native detector actually advertises at least one
 * of our target formats. (Some Chromium builds expose the class but only
 * support QR codes.)
 */
async function nativeSupportsTargetFormats(): Promise<boolean> {
  const ctor = (window as VideoFrameCallbackWindow).BarcodeDetector;
  if (!ctor || typeof ctor.getSupportedFormats !== "function") {
    // No introspection — assume it works and let detect() fail open.
    return true;
  }
  try {
    const supported = await ctor.getSupportedFormats();
    return FORMATS.some((f) => supported.includes(f));
  } catch {
    return true;
  }
}

function toNativeFormat(format: string): SupportedFormat | null {
  return (FORMATS as readonly string[]).includes(format)
    ? (format as SupportedFormat)
    : null;
}

// ── Native path ─────────────────────────────────────────────────────────────

function createNativeDetector(): DetectorHandle {
  const ctor = (window as VideoFrameCallbackWindow).BarcodeDetector!;
  const detector = new ctor({ formats: [...FORMATS] });
  let stopped = false;

  return {
    async decodeFromVideo(video, onDetected) {
      let latched = false;
      let rafId = 0;
      let vfcId = 0;

      // requestVideoFrameCallback gives us cadence aligned with the camera
      // frame rate — much cheaper than RAF polling. Fall back to RAF when
      // the method is missing (Safari < 15.4).
      const supportsVfc =
        typeof (video as unknown as { requestVideoFrameCallback?: unknown })
          .requestVideoFrameCallback === "function";

      const tick = async () => {
        if (stopped || latched) return;
        if (video.readyState < 2 || video.videoWidth === 0) {
          schedule();
          return;
        }
        try {
          const results = await detector.detect(video);
          if (results.length > 0) {
            const r = results[0];
            const fmt = toNativeFormat(r.format);
            if (fmt && r.rawValue) {
              latched = true;
              onDetected(r.rawValue, fmt);
              return;
            }
          }
        } catch (err) {
          // detect() throws if the source isn't ready yet — just keep going.
          if (process.env.NODE_ENV !== "production") {
            console.debug("[barcode-detector] detect threw", err);
          }
        }
        schedule();
      };

      const schedule = () => {
        if (stopped || latched) return;
        if (supportsVfc) {
          vfcId = (
            video as unknown as {
              requestVideoFrameCallback: (cb: () => void) => number;
            }
          ).requestVideoFrameCallback(() => {
            void tick();
          });
        } else {
          rafId = window.requestAnimationFrame(() => {
            void tick();
          });
        }
      };

      schedule();

      return () => {
        stopped = true;
        if (rafId) window.cancelAnimationFrame(rafId);
        if (
          vfcId &&
          typeof (video as unknown as { cancelVideoFrameCallback?: unknown })
            .cancelVideoFrameCallback === "function"
        ) {
          (
            video as unknown as {
              cancelVideoFrameCallback: (id: number) => void;
            }
          ).cancelVideoFrameCallback(vfcId);
        }
      };
    },

    async decodeFromImage(source) {
      let bitmap: ImageBitmap | HTMLImageElement;
      if (source instanceof Blob) {
        bitmap = await createImageBitmap(source);
      } else {
        bitmap = source;
      }
      try {
        const results = await detector.detect(bitmap);
        for (const r of results) {
          const fmt = toNativeFormat(r.format);
          if (fmt && r.rawValue) return { barcode: r.rawValue, format: fmt };
        }
      } catch {
        return null;
      }
      return null;
    },

    stop() {
      stopped = true;
    },
  };
}

// ── ZXing fallback ──────────────────────────────────────────────────────────

async function createZXingDetector(): Promise<DetectorHandle> {
  // Dynamic so this never lands in the main bundle.
  const browser = await import("@zxing/browser");
  const lib = await import("@zxing/library");

  const hints = new Map<number, unknown>();
  hints.set(lib.DecodeHintType.POSSIBLE_FORMATS, [
    lib.BarcodeFormat.EAN_13,
    lib.BarcodeFormat.EAN_8,
    lib.BarcodeFormat.UPC_A,
    lib.BarcodeFormat.UPC_E,
  ]);
  hints.set(lib.DecodeHintType.TRY_HARDER, true);

  const reader = new browser.BrowserMultiFormatReader(hints);

  const zxingFormatToOurs = (n: number | undefined): SupportedFormat | null => {
    if (n === lib.BarcodeFormat.EAN_13) return "ean_13";
    if (n === lib.BarcodeFormat.EAN_8) return "ean_8";
    if (n === lib.BarcodeFormat.UPC_A) return "upc_a";
    if (n === lib.BarcodeFormat.UPC_E) return "upc_e";
    return null;
  };

  let activeControls: { stop: () => void } | null = null;
  let stopped = false;

  return {
    async decodeFromVideo(video, onDetected) {
      let latched = false;
      const controls = await reader.decodeFromVideoElement(
        video,
        (result) => {
          if (stopped || latched || !result) return;
          const text = result.getText();
          if (!text) return;
          const fmt = zxingFormatToOurs(result.getBarcodeFormat());
          if (!fmt) return;
          latched = true;
          onDetected(text, fmt);
        }
      );
      activeControls = controls;
      return () => {
        try {
          controls.stop();
        } catch {
          /* noop */
        }
      };
    },

    async decodeFromImage(source) {
      let img: HTMLImageElement;
      let objectUrl: string | null = null;
      if (source instanceof HTMLImageElement) {
        img = source;
      } else {
        objectUrl = URL.createObjectURL(source);
        img = new Image();
        img.src = objectUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () =>
            reject(new Error("Failed to load image for barcode decode"));
        });
      }
      try {
        const res = await reader.decodeFromImageElement(img);
        const text = res?.getText();
        if (!text) return null;
        const fmt = zxingFormatToOurs(res.getBarcodeFormat()) ?? "ean_13";
        return { barcode: text, format: fmt };
      } catch {
        return null;
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    },

    stop() {
      stopped = true;
      if (activeControls) {
        try {
          activeControls.stop();
        } catch {
          /* noop */
        }
        activeControls = null;
      }
    },
  };
}

// ── Public factory ──────────────────────────────────────────────────────────

/**
 * Build a detector. Resolves to the native implementation when possible and
 * dynamically imports the ZXing fallback only when needed.
 */
export async function createDetector(): Promise<DetectorHandle> {
  if (hasNativeBarcodeDetector() && (await nativeSupportsTargetFormats())) {
    return createNativeDetector();
  }
  return createZXingDetector();
}
