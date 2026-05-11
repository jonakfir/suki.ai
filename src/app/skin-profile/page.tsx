"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { isAdminSession, ADMIN_USER_ID } from "@/lib/admin";
import { Card } from "@/components/ui/Card";
import { GhostButton } from "@/components/ui/GhostButton";
import { Pill } from "@/components/ui/Pill";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/ui/FadeIn";
import { AmbientOrbs } from "@/components/ui/SkincareElements";
import type {
  SkinAnalysisV1,
  SkinConcern,
  SkinRecommendationItem,
  SkinTypeKey,
  Undertone,
} from "@/lib/skin-analysis-schema";
import {
  Info,
  Sparkles,
  Loader2,
  Droplets,
  Waves,
  CircleDot,
  ShieldCheck,
  Palette,
  RefreshCw,
  UploadCloud,
  ArrowUpRight,
  AlertCircle,
  X,
  SprayCan,
  Sun,
  TestTube,
  FlaskConical,
  Leaf,
} from "lucide-react";

// ── Zone coordinates ──────────────────────────────────────────────────────────
// % from the top-left of the portrait (relative to the rendered box). Tuned for
// a standard centred face shot. Any zone name not in this map gets dropped from
// the annotated overlay.
const ZONE_COORDS: Record<string, { x: number; y: number }> = {
  forehead: { x: 50, y: 18 },
  "left forehead": { x: 38, y: 20 },
  "right forehead": { x: 62, y: 20 },
  "between brows": { x: 50, y: 26 },
  "under eyes": { x: 50, y: 38 },
  "left under eye": { x: 38, y: 38 },
  "right under eye": { x: 62, y: 38 },
  "left cheek": { x: 28, y: 50 },
  "right cheek": { x: 72, y: 50 },
  cheeks: { x: 28, y: 50 },
  nose: { x: 50, y: 50 },
  "nose bridge": { x: 50, y: 42 },
  "around mouth": { x: 50, y: 70 },
  chin: { x: 50, y: 82 },
  jawline: { x: 30, y: 78 },
  "left jawline": { x: 26, y: 78 },
  "right jawline": { x: 74, y: 78 },
  "t-zone": { x: 50, y: 30 },
  temples: { x: 22, y: 28 },
};

const TIPS = [
  "Looking for visible patterns, not diagnoses…",
  "Cross-checking lighting and angle…",
  "Comparing to your stated skin profile…",
  "Drafting gentle suggestions…",
  "Adding the disclaimer (always)…",
];

const DISCLAIMER_TOP =
  "These are AI-suggested observations from your photo — not a medical diagnosis. Lighting, angle, and makeup can throw the model off. Please see a dermatologist for skin conditions or before changing your routine in a meaningful way.";

const DISCLAIMER_FOOTER = "AI observations only — not medical advice.";

// ── Skin-type display config ──────────────────────────────────────────────────
const SKIN_TYPE_COLOR: Record<SkinTypeKey, string> = {
  oily: "bg-amber-100 text-amber-900 border-amber-300",
  dry: "bg-rose-100 text-rose-900 border-rose-300",
  combination: "bg-violet-100 text-violet-900 border-violet-300",
  normal: "bg-emerald-100 text-emerald-900 border-emerald-300",
  sensitive: "bg-pink-100 text-pink-900 border-pink-300",
};

const CONFIDENCE_COLOR = {
  low: "bg-rose-400",
  medium: "bg-amber-400",
  high: "bg-emerald-400",
} as const;

const UNDERTONE_SWATCH: Record<Undertone, string> = {
  warm: "#E6B587",
  cool: "#D9B5C8",
  neutral: "#D9C2A8",
  olive: "#BCBE96",
};

// Bin a 0-100 score into low/medium/high for the small caption under the bar.
function binScore(score: number): "low" | "medium" | "high" {
  if (score < 34) return "low";
  if (score < 67) return "medium";
  return "high";
}

// ── ScoreBar (inline component) ───────────────────────────────────────────────
function ScoreBar({
  score,
  label,
  note,
  Icon,
  delay = 0,
}: {
  score: number;
  label: string;
  note: string;
  Icon: typeof Droplets;
  delay?: number;
}) {
  const bin = binScore(score);
  const tone =
    bin === "high"
      ? "text-emerald-600"
      : bin === "low"
        ? "text-rose-600"
        : "text-amber-600";
  return (
    <Card className="h-full">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-accent" />
        <div className="text-sm font-medium">{label}</div>
      </div>
      <div className="h-2 rounded-full bg-card-border/40 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, ease: "easeOut", delay }}
          className="h-full rounded-full bg-gradient-to-r from-accent/60 via-accent to-accent-deep"
        />
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-xs text-muted leading-snug max-w-[80%]">{note}</div>
        <div className={`text-[10px] uppercase tracking-wider ${tone}`}>{bin}</div>
      </div>
    </Card>
  );
}

// ── ZoneCallout (inline component) ────────────────────────────────────────────
function ZoneCallout({
  concern,
  index,
}: {
  concern: SkinConcern;
  index: number;
}) {
  const zone = concern.zones[0];
  const coords = ZONE_COORDS[zone.toLowerCase()] ?? null;
  if (!coords) return null;
  // Calls out diagonally toward the upper-right or upper-left, depending on
  // which side of the face the zone is on. Keeps callouts off the face.
  const alignRight = coords.x >= 50;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 + index * 0.12 }}
      className="absolute"
      style={{
        left: `${coords.x}%`,
        top: `${coords.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Dot */}
      <div className="relative">
        <div className="absolute -inset-2 rounded-full bg-accent/15 blur-sm" />
        <div className="relative w-3 h-3 rounded-full bg-accent border-2 border-white shadow" />
      </div>
      {/* Label — drawn as a Pill with an arrow icon */}
      <div
        className={`absolute top-1/2 ${alignRight ? "left-4" : "right-4"} -translate-y-1/2`}
      >
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/95 border border-card-border/70 shadow-sm text-[10px] sm:text-xs whitespace-nowrap">
          <ArrowUpRight size={10} className="text-accent" />
          <span className="text-foreground">{concern.label}</span>
          <span className="text-muted/70">·</span>
          <span className="text-muted">{concern.severity}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── RecCard — single item inside a recommendation grid ────────────────────────
function RecCard({
  item,
  Icon,
}: {
  item: SkinRecommendationItem;
  Icon: typeof Droplets;
}) {
  const isAvoid = item.avoid === true;
  return (
    <div
      className={`rounded-xl border p-3 ${
        isAvoid
          ? "bg-rose-50/60 border-rose-200/60"
          : "bg-card/60 border-card-border/60"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {isAvoid ? (
          <X size={14} className="text-rose-500 shrink-0" />
        ) : (
          <Icon size={14} className="text-accent shrink-0" />
        )}
        <div
          className={`text-sm font-medium leading-tight ${
            isAvoid ? "text-rose-700" : "text-foreground"
          }`}
        >
          {item.label}
        </div>
      </div>
      <div className="text-xs text-muted leading-snug">{item.why}</div>
    </div>
  );
}

// ── Recommendation section (one of cleanser / moisturizer / …) ────────────────
function RecSection({
  title,
  items,
  Icon,
}: {
  title: string;
  items: SkinRecommendationItem[];
  Icon: typeof Droplets;
}) {
  if (!items.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-accent" />
        <div className="text-xs uppercase tracking-wider text-muted">{title}</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.map((it, i) => (
          <RecCard key={`${title}-${i}`} item={it} Icon={Icon} />
        ))}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
type Stage =
  | { kind: "boot" }
  | { kind: "idle"; hasPhoto: boolean }
  | { kind: "loading" }
  | { kind: "ready"; analysis: SkinAnalysisV1; cached: boolean }
  | { kind: "error"; message: string };

export default function SkinProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "boot" });
  const [tipIndex, setTipIndex] = useState(0);
  const [reuploading, setReuploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate loading tips while we wait.
  useEffect(() => {
    if (stage.kind !== "loading") return;
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 2200);
    return () => clearInterval(id);
  }, [stage.kind]);

  // Boot: who is signed in, do they have a face photo, is there cached analysis?
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const { data: { user: supaUser } } = await supabase.auth.getUser();
      const admin = await isAdminSession();
      let uid: string | null = null;
      if (supaUser?.id) uid = supaUser.id;
      else if (admin) uid = ADMIN_USER_ID;
      if (!uid) {
        router.push("/auth");
        return;
      }
      if (cancelled) return;
      setUserId(uid);

      const { data: profile } = await supabase
        .from("users_profile")
        .select(
          "face_photo_storage_path, skin_analysis_json, skin_analysis_generated_at"
        )
        .eq("user_id", uid)
        .maybeSingle();

      if (cancelled) return;
      const path = (profile?.face_photo_storage_path as string | null) ?? null;
      setPhotoPath(path);
      if (path) {
        const signed = await supabase.storage
          .from("face-photos")
          .createSignedUrl(path, 60 * 60);
        if (!cancelled && signed.data?.signedUrl) {
          setPhotoSignedUrl(signed.data.signedUrl);
        }
      }

      // Use cached analysis if present — we still don't trust the shape
      // until validated server-side, but the client-side schema lets us
      // structurally pattern-match.
      const cachedJson = profile?.skin_analysis_json as
        | SkinAnalysisV1
        | null
        | undefined;
      if (cachedJson && cachedJson.schema_version === 1) {
        setStage({ kind: "ready", analysis: cachedJson, cached: true });
      } else {
        setStage({ kind: "idle", hasPhoto: !!path });
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAnalysis = useCallback(
    async (force: boolean) => {
      setStage({ kind: "loading" });
      setTipIndex(0);
      try {
        const res = await fetch("/api/skin-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        });
        const data = await res.json();
        if (!res.ok) {
          setStage({
            kind: "error",
            message: data.error || "Something went wrong analyzing your photo.",
          });
          return;
        }
        setStage({
          kind: "ready",
          analysis: data.analysis as SkinAnalysisV1,
          cached: !!data.cached,
        });
      } catch {
        setStage({
          kind: "error",
          message: "Network error. Please check your connection and try again.",
        });
      }
    },
    []
  );

  const handleReupload = useCallback(
    async (file: File) => {
      if (!userId) return;
      if (!file.type.startsWith("image/")) return;
      setReuploading(true);
      try {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${safeExt}`;
        const up = await supabase.storage
          .from("face-photos")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) throw up.error;

        const patch = await fetch("/api/profile/face-photo", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ face_photo_storage_path: path }),
        });
        if (!patch.ok) {
          const body = await patch.json().catch(() => ({}));
          throw new Error(body.error || "Failed to update photo.");
        }
        // Re-sign + regenerate.
        const signed = await supabase.storage
          .from("face-photos")
          .createSignedUrl(path, 60 * 60);
        setPhotoPath(path);
        setPhotoSignedUrl(signed.data?.signedUrl ?? null);
        await runAnalysis(true);
      } catch (e) {
        setStage({
          kind: "error",
          message: e instanceof Error ? e.message : "Upload failed.",
        });
      } finally {
        setReuploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [supabase, runAnalysis, userId]
  );

  return (
    <div className="relative min-h-screen pb-24">
      <AmbientOrbs variant="mixed" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <FadeIn>
          <p className="text-xs text-muted uppercase tracking-widest">
            AI skin profile
          </p>
          <h1 className="text-h1 font-light font-[family-name:var(--font-heading)] mt-1">
            What your selfie suggests
          </h1>
          <p className="text-sm text-muted mt-1 max-w-prose">
            A snapshot of visible patterns Suki notices, with gentle next steps.
            Re-run any time — your data stays on your account.
          </p>
        </FadeIn>

        {/* Always-visible disclaimer banner */}
        <FadeIn delay={0.05}>
          <div
            role="note"
            className="mt-5 flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50/70 px-4 py-3 text-amber-900"
          >
            <Info size={16} className="shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs sm:text-sm leading-snug">{DISCLAIMER_TOP}</p>
          </div>
        </FadeIn>

        {/* Stage-driven body */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {stage.kind === "boot" && (
              <motion.div
                key="boot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center text-sm text-muted"
              >
                Loading…
              </motion.div>
            )}

            {stage.kind === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <Card>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles size={16} className="text-accent" />
                        <div className="text-sm font-medium">
                          Generate your skin profile
                        </div>
                      </div>
                      <p className="text-xs text-muted leading-snug">
                        {stage.hasPhoto
                          ? "We'll analyse your saved selfie and draft a starter routine. Takes ~20-40 seconds."
                          : "Add a clear, makeup-free selfie first. We don't share it with anyone."}
                      </p>
                    </div>
                    {stage.hasPhoto ? (
                      <GhostButton
                        variant="filled"
                        size="md"
                        onClick={() => runAnalysis(false)}
                      >
                        <Sparkles size={14} />
                        Generate
                      </GhostButton>
                    ) : (
                      <Link href="/onboard">
                        <GhostButton variant="outline" size="md" as="span">
                          <UploadCloud size={14} />
                          Upload selfie
                        </GhostButton>
                      </Link>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {stage.kind === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center"
              >
                <Loader2
                  size={28}
                  className="mx-auto animate-spin text-accent"
                  aria-hidden
                />
                <AnimatePresence mode="wait">
                  <motion.p
                    key={tipIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35 }}
                    className="mt-4 text-sm text-muted"
                  >
                    {TIPS[tipIndex]}
                  </motion.p>
                </AnimatePresence>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-muted/70">
                  This usually takes 20-40 seconds
                </p>
              </motion.div>
            )}

            {stage.kind === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Card>
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={18}
                      className="text-rose-500 shrink-0 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1">
                        Couldn&apos;t generate your skin profile
                      </div>
                      <p className="text-xs text-muted">{stage.message}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <GhostButton
                          variant="outline"
                          size="sm"
                          onClick={() => runAnalysis(false)}
                        >
                          <RefreshCw size={12} />
                          Try again
                        </GhostButton>
                        <GhostButton
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setStage({ kind: "idle", hasPhoto: !!photoPath })
                          }
                        >
                          Cancel
                        </GhostButton>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {stage.kind === "ready" && (
              <SkinAnalysisSheet
                key="ready"
                analysis={stage.analysis}
                cached={stage.cached}
                photoSignedUrl={photoSignedUrl}
                onRegenerate={() => runAnalysis(true)}
                onReupload={() => fileInputRef.current?.click()}
                reuploading={reuploading}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Hidden file input shared by the Re-upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleReupload(f);
          }}
        />
      </div>

      {/* Sticky compact disclaimer footer */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-card-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2">
          <Info size={12} className="text-muted shrink-0" aria-hidden />
          <p className="text-[10px] sm:text-xs text-muted">
            {DISCLAIMER_FOOTER}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Ready-state sheet ────────────────────────────────────────────────────────
function SkinAnalysisSheet({
  analysis,
  cached,
  photoSignedUrl,
  onRegenerate,
  onReupload,
  reuploading,
}: {
  analysis: SkinAnalysisV1;
  cached: boolean;
  photoSignedUrl: string | null;
  onRegenerate: () => void;
  onReupload: () => void;
  reuploading: boolean;
}) {
  const typeStyles = SKIN_TYPE_COLOR[analysis.skin_type];
  const conf = analysis.skin_type_confidence;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <StaggerChildren className="space-y-5">
        {/* Hero — annotated portrait */}
        <StaggerItem>
          <Card className="overflow-hidden">
            <div className="relative w-full aspect-[4/5] max-h-[560px] mx-auto bg-card-border/20 rounded-xl overflow-hidden">
              {photoSignedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoSignedUrl}
                  alt="Your selfie, annotated with AI observations"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">
                  Selfie unavailable
                </div>
              )}
              {/* Soft top gradient so labels remain readable */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.10) 100%)",
                }}
              />
              {analysis.concerns.slice(0, 6).map((c, i) => (
                <ZoneCallout key={`${c.label}-${i}`} concern={c} index={i} />
              ))}
            </div>
            {cached && (
              <div className="mt-3 text-[10px] uppercase tracking-widest text-muted text-center">
                Cached analysis
              </div>
            )}
          </Card>
        </StaggerItem>

        {/* Skin type + confidence */}
        <StaggerItem>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center px-4 py-2 rounded-full border text-sm font-medium ${typeStyles}`}
            >
              {analysis.skin_type}
            </span>
            <div className="inline-flex items-center gap-1.5 text-xs text-muted">
              <span
                className={`inline-block w-2 h-2 rounded-full ${CONFIDENCE_COLOR[conf]}`}
                aria-hidden
              />
              <span className="capitalize">{conf}</span>
              <span>confidence</span>
            </div>
            <div className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
              <span className="capitalize">Overall: {analysis.confidence}</span>
            </div>
          </div>
        </StaggerItem>

        {/* Hydration / texture / pores */}
        <StaggerItem>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ScoreBar
              score={analysis.hydration.score}
              note={analysis.hydration.note}
              label="Hydration"
              Icon={Droplets}
              delay={0.05}
            />
            <ScoreBar
              score={analysis.texture.score}
              note={analysis.texture.note}
              label="Texture"
              Icon={Waves}
              delay={0.1}
            />
            <ScoreBar
              score={analysis.pores.score}
              note={analysis.pores.note}
              label="Pores"
              Icon={CircleDot}
              delay={0.15}
            />
          </div>
        </StaggerItem>

        {/* Undertone + barrier */}
        <StaggerItem>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <div className="flex items-center gap-2 mb-2">
                <Palette size={16} className="text-accent" />
                <div className="text-sm font-medium">Undertone</div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="inline-block w-8 h-8 rounded-full border border-card-border/60 shadow-inner"
                  style={{ backgroundColor: UNDERTONE_SWATCH[analysis.undertone] }}
                  aria-hidden
                />
                <div>
                  <div className="text-sm font-medium capitalize">
                    {analysis.undertone}
                  </div>
                  <div className="text-xs text-muted">
                    Helps pick foundations & jewellery
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className="text-accent" />
                <div className="text-sm font-medium">Barrier status</div>
              </div>
              <BarrierIndicator state={analysis.barrier_status.state} />
              <div className="mt-2 text-xs text-muted leading-snug">
                {analysis.barrier_status.note}
              </div>
            </Card>
          </div>
        </StaggerItem>

        {/* Concerns list — useful when zone coords don't match */}
        {analysis.concerns.length > 0 && (
          <StaggerItem>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted mb-2">
                Visible concerns
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.concerns.map((c, i) => (
                  <Pill key={`pill-${i}`}>
                    <span className="text-foreground">{c.label}</span>
                    <span className="text-muted/70">·</span>
                    <span className="text-muted">{c.severity}</span>
                  </Pill>
                ))}
              </div>
            </div>
          </StaggerItem>
        )}

        {/* Recommendations grid */}
        <StaggerItem>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-accent" />
              <div className="text-sm font-medium">Suggested routine</div>
            </div>
            <div className="space-y-4">
              <RecSection
                title="Cleanser"
                items={analysis.recommendations.cleanser}
                Icon={SprayCan}
              />
              <RecSection
                title="Moisturizer"
                items={analysis.recommendations.moisturizer}
                Icon={Droplets}
              />
              <RecSection
                title="Sunscreen"
                items={analysis.recommendations.sunscreen}
                Icon={Sun}
              />
              <RecSection
                title="Serum"
                items={analysis.recommendations.serum}
                Icon={TestTube}
              />
              <RecSection
                title="Ingredients"
                items={analysis.recommendations.ingredients}
                Icon={FlaskConical}
              />
            </div>
          </Card>
        </StaggerItem>

        {/* Per-analysis disclaimer (model-authored) */}
        <StaggerItem>
          <div className="flex items-start gap-2 rounded-xl bg-muted/10 border border-card-border/60 px-3 py-2.5">
            <Leaf size={14} className="text-accent shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-muted leading-snug">
              {analysis.disclaimer}
            </p>
          </div>
        </StaggerItem>

        {/* Footer actions */}
        <StaggerItem>
          <div className="flex flex-wrap gap-2 pt-2">
            <GhostButton
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={reuploading}
            >
              <RefreshCw size={12} />
              Regenerate
            </GhostButton>
            <GhostButton
              variant="ghost"
              size="sm"
              onClick={onReupload}
              disabled={reuploading}
            >
              <UploadCloud size={12} />
              {reuploading ? "Uploading…" : "Upload new selfie"}
            </GhostButton>
          </div>
        </StaggerItem>
      </StaggerChildren>
    </motion.div>
  );
}

// ── BarrierIndicator — 3-segment bar coloured by state ────────────────────────
function BarrierIndicator({ state }: { state: SkinAnalysisV1["barrier_status"]["state"] }) {
  // Segments lit per state. Order: weak → mid → strong.
  const lit =
    state === "healthy" ? 3 : state === "compromised" ? 1 : 2; // uncertain → 2
  const tone =
    state === "healthy"
      ? "bg-emerald-400"
      : state === "compromised"
        ? "bg-rose-400"
        : "bg-amber-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-2 w-8 rounded-full ${i < lit ? tone : "bg-card-border/40"}`}
          />
        ))}
      </div>
      <div className="text-xs capitalize text-foreground/80">{state}</div>
    </div>
  );
}
