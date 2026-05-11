"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ScanLine, X } from "lucide-react";
import { createDetector, type DetectorHandle } from "@/lib/barcode/detector";

export type BarcodeScannerError =
  | { kind: "permission_denied"; message: string }
  | { kind: "no_camera"; message: string }
  | { kind: "decoder_failed"; message: string };

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onError: (err: BarcodeScannerError) => void;
  onCancel: () => void;
  /** Allows the parent to inject a "Use photo instead" link inline. */
  onUsePhotoInstead?: () => void;
}

/**
 * Live barcode scanning surface. Owns the MediaStream, the <video>, and the
 * detector lifecycle. Calls `onDetected` exactly once per mount — the underlying
 * detector latches on the first hit, but we double-belt-and-suspenders here.
 *
 * iOS Safari requirements honored:
 *  - playsInline, muted, autoplay
 *  - `await video.play()` is invoked inside the same task as the click
 *    that mounts the component (the parent triggers mount on a user gesture).
 */
export function BarcodeScanner({
  onDetected,
  onError,
  onCancel,
  onUsePhotoInstead,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<DetectorHandle | null>(null);
  const stopDecodeRef = useRef<(() => void) | null>(null);
  const firedRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "scanning" | "stopped">("starting");

  const teardown = useCallback(() => {
    if (stopDecodeRef.current) {
      try {
        stopDecodeRef.current();
      } catch {
        /* noop */
      }
      stopDecodeRef.current = null;
    }
    if (detectorRef.current) {
      try {
        detectorRef.current.stop();
      } catch {
        /* noop */
      }
      detectorRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          /* noop */
        }
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {
        /* noop */
      }
    }
    setStatus("stopped");
  }, []);

  const fireDetected = useCallback(
    (barcode: string) => {
      if (firedRef.current) return;
      firedRef.current = true;
      // Stop the camera immediately to free the LED and to let us paint a
      // freeze frame (the parent toggles state on the first detection).
      teardown();
      onDetected(barcode);
    },
    [onDetected, teardown]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Guard: getUserMedia missing entirely (very old browser / insecure ctx).
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        onError({
          kind: "no_camera",
          message: "Your browser does not support camera access on this page.",
        });
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
          },
          audio: false,
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (
          name === "NotAllowedError" ||
          name === "SecurityError" ||
          name === "PermissionDeniedError"
        ) {
          onError({
            kind: "permission_denied",
            message: "Camera access was blocked. You can upload a photo of the barcode instead.",
          });
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          onError({
            kind: "no_camera",
            message: "No camera found on this device.",
          });
        } else {
          onError({
            kind: "decoder_failed",
            message:
              err instanceof Error ? err.message : "Failed to start the camera.",
          });
        }
        return;
      }

      if (cancelled) {
        for (const t of stream.getTracks()) t.stop();
        return;
      }
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        for (const t of stream.getTracks()) t.stop();
        return;
      }
      video.srcObject = stream;
      // iOS Safari needs these attrs *and* an awaited play() inside the
      // user-gesture task. Component mount happens during the click handler,
      // so the await chain below is still inside the gesture's microtask
      // queue.
      video.muted = true;
      video.playsInline = true;
      try {
        await video.play();
      } catch (err) {
        // Autoplay blocked — surface as decoder error so the parent can
        // suggest the upload fallback.
        onError({
          kind: "decoder_failed",
          message:
            err instanceof Error
              ? `Couldn't start the camera preview: ${err.message}`
              : "Couldn't start the camera preview.",
        });
        return;
      }

      if (cancelled) return;
      setStatus("scanning");

      let detector: DetectorHandle;
      try {
        detector = await createDetector();
      } catch (err) {
        onError({
          kind: "decoder_failed",
          message:
            err instanceof Error
              ? `Barcode decoder failed to load: ${err.message}`
              : "Barcode decoder failed to load.",
        });
        return;
      }
      if (cancelled) {
        detector.stop();
        return;
      }
      detectorRef.current = detector;

      try {
        const stop = await detector.decodeFromVideo(video, (barcode) => {
          fireDetected(barcode);
        });
        if (cancelled) {
          stop();
          return;
        }
        stopDecodeRef.current = stop;
      } catch (err) {
        onError({
          kind: "decoder_failed",
          message:
            err instanceof Error
              ? `Decoder error: ${err.message}`
              : "Decoder error.",
        });
      }
    })();

    return () => {
      cancelled = true;
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    teardown();
    onCancel();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative aspect-square w-full max-w-sm rounded-2xl overflow-hidden border border-card-border/60 bg-black/80">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Animated scan line overlay */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_18px_2px_rgba(91,155,213,0.7)]"
          initial={{ top: "12%" }}
          animate={{ top: ["12%", "88%", "12%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Corner brackets */}
        <div className="pointer-events-none absolute inset-3 rounded-xl border border-white/15" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/55 text-white text-[10px] font-medium">
          <ScanLine size={11} className="text-accent" />
          {status === "scanning" ? "Scanning…" : "Starting camera…"}
        </div>
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Cancel barcode scanning"
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/75 transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      <p className="text-[11px] text-muted text-center max-w-sm">
        Video stays on your device — only the decoded barcode is sent.
      </p>

      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={handleCancel}
          className="text-muted hover:text-foreground transition-colors underline-offset-2 hover:underline"
        >
          Cancel
        </button>
        {onUsePhotoInstead && (
          <>
            <span aria-hidden className="text-muted/40">·</span>
            <button
              type="button"
              onClick={onUsePhotoInstead}
              className="text-accent hover:text-accent-deep transition-colors underline-offset-2 hover:underline"
            >
              Use photo instead
            </button>
          </>
        )}
      </div>
    </div>
  );
}
