"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { GhostButton } from "@/components/ui/GhostButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { AmbientOrbs } from "@/components/ui/SkincareElements";
import {
  Camera,
  Upload,
  Sparkles,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  ListOrdered,
  PackagePlus,
  X,
  Pencil,
  Check,
  Loader2,
} from "lucide-react";

interface IdentifiedProduct {
  name: string;
  brand: string;
  category: string;
  notes: string;
}

interface MissingProduct {
  category: string;
  why: string;
  suggestions: string[];
}

interface RoutineStep {
  step: number;
  time: "AM" | "PM" | "AM/PM";
  product: string;
  how_to_use: string;
}

interface ScanAnalysis {
  products: IdentifiedProduct[];
  missing: MissingProduct[];
  routine: RoutineStep[];
}

interface SearchSuggestion {
  product_name: string;
  brand: string;
  category: string;
  description: string;
}

const TIME_BADGE: Record<string, string> = {
  AM: "bg-amber-100 text-amber-700 border border-amber-200",
  PM: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  "AM/PM": "bg-accent/10 text-accent border border-accent/20",
};

export default function ScanPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>("image/jpeg");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ScanAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable product list — synced from analysis, mutated by inline corrections
  const [localProducts, setLocalProducts] = useState<IdentifiedProduct[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQuery, setEditQuery] = useState("");
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (analysis) setLocalProducts([...analysis.products]);
  }, [analysis]);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    setSuggestionsLoading(true);
    try {
      const res = await fetch("/api/products/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q.trim() }),
      });
      if (!res.ok) { setSuggestions([]); return; }
      const data = await res.json();
      setSuggestions((data.products ?? []).slice(0, 5) as SearchSuggestion[]);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  const handleSearchQuery = (q: string) => {
    setEditQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => runSearch(q), 400);
  };

  const startEdit = (i: number) => {
    const p = localProducts[i];
    const q = [p.name, p.brand].filter(Boolean).join(" ");
    setEditingIndex(i);
    setEditQuery(q);
    setEditName(p.name);
    setEditBrand(p.brand);
    setSuggestions([]);
    if (q.length >= 2) runSearch(q);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setSuggestions([]);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  };

  const applySuggestion = (s: SearchSuggestion) => {
    setEditName(s.product_name);
    setEditBrand(s.brand);
    setSuggestions([]);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  };

  const confirmEdit = () => {
    if (editingIndex === null) return;
    setLocalProducts((prev) =>
      prev.map((p, i) =>
        i === editingIndex
          ? { ...p, name: editName.trim() || p.name, brand: editBrand.trim() || p.brand }
          : p
      )
    );
    setEditingIndex(null);
    setSuggestions([]);
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 800;
      let { width, height } = img;
      if (width >= height) {
        if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
      } else {
        if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL("image/jpeg", 0.6);
      const base64 = compressed.split(",")[1];
      console.log("[scan] compressed base64 length:", base64.length, "bytes (raw ~" + Math.round(base64.length * 0.75 / 1024) + " KB)");
      setImagePreview(compressed);
      setMediaType("image/jpeg");
      setImageBase64(base64);
      setAnalysis(null);
      setError(null);
      setSaved(false);
      setSaveError(null);
    };
    img.src = objectUrl;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setAnalysis(data.analysis);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setAnalysis(null);
    setError(null);
    setSaved(false);
    setSaveError(null);
    setEditingIndex(null);
    setSuggestions([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!localProducts.length) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/products/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: localProducts.map((p) => ({ ...p, domain: "skincare" as const })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Failed to save. Please try again.");
        return;
      }
      setSaved(true);
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background/30">
      <AmbientOrbs variant="mixed" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Header */}
        <FadeIn>
          <div className="text-center mb-10">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass mb-4"
            >
              <ScanLine size={14} className="text-accent" />
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted">
                AI-powered scan
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-[family-name:var(--font-script)] text-display font-bold text-accent-ink leading-tight mb-3"
            >
              Scan your shelf
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm sm:text-base text-muted max-w-md mx-auto leading-relaxed"
            >
              Upload a photo of your skincare products. Suki will identify them,
              spot what&apos;s missing for your skin type, and show you exactly
              how to layer them.
            </motion.p>
          </div>
        </FadeIn>

        {/* Upload zone */}
        <FadeIn delay={0.15}>
          <Card className="mb-6">
            {!imagePreview ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-4 py-14 px-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-accent bg-accent/5 scale-[1.01]"
                    : "border-card-border hover:border-accent/50 hover:bg-accent/3"
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
                  <Camera size={26} className="text-accent" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-accent-ink mb-1">
                    Drop your photo here
                  </p>
                  <p className="text-xs text-muted">
                    or click to browse — JPG, PNG, WebP
                  </p>
                </div>
                <GhostButton
                  as="span"
                  variant="outline"
                  size="sm"
                  className="pointer-events-none"
                >
                  <Upload size={14} />
                  Choose photo
                </GhostButton>
              </div>
            ) : (
              <div className="relative">
                <div className="relative rounded-2xl overflow-hidden border border-card-border/50 bg-background/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Your skincare products"
                    className="w-full max-h-[420px] object-contain"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-foreground/70 text-white flex items-center justify-center hover:bg-foreground transition-colors"
                    aria-label="Remove image"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="mt-4 flex justify-center">
                  <GhostButton
                    variant="filled"
                    size="lg"
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="group min-w-[180px]"
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <Sparkles size={16} />
                        </motion.div>
                        Analysing…
                      </>
                    ) : (
                      <>
                        <Sparkles
                          size={16}
                          className="transition-transform duration-500 group-hover:rotate-180"
                        />
                        Analyse products
                      </>
                    )}
                  </GhostButton>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInputChange}
            />
          </Card>
        </FadeIn>

        {/* Error state */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6"
            >
              <Card className="border-rose/30 bg-rose/5">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={18}
                    className="text-rose flex-shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-foreground/80">{error}</p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Identified products */}
              {localProducts.length > 0 && (
                <FadeIn delay={0.05}>
                  <Card>
                    <div className="flex items-center gap-2 mb-5">
                      <CheckCircle2 size={18} className="text-accent" />
                      <h2 className="text-h3 font-light text-accent-deep">
                        Products identified
                      </h2>
                      <span className="ml-auto text-xs text-muted bg-accent/10 px-2 py-0.5 rounded-full">
                        {localProducts.length} found
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {localProducts.map((p, i) =>
                        editingIndex === i ? (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-xl bg-background/40 border border-accent/30 space-y-2"
                          >
                            {/* Search query input */}
                            <div className="relative">
                              <input
                                autoFocus
                                type="text"
                                value={editQuery}
                                onChange={(e) => handleSearchQuery(e.target.value)}
                                placeholder="Search products…"
                                className="w-full text-sm rounded-lg border border-card-border bg-background/60 px-3 py-1.5 pr-8 outline-none focus:ring-2 focus:ring-accent/40"
                              />
                              {suggestionsLoading && (
                                <Loader2
                                  size={12}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted animate-spin"
                                />
                              )}
                            </div>

                            {/* Suggestions dropdown */}
                            <AnimatePresence>
                              {suggestions.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -4 }}
                                  className="rounded-lg border border-card-border/60 bg-background overflow-hidden shadow-md"
                                >
                                  {suggestions.map((s, j) => (
                                    <button
                                      key={j}
                                      type="button"
                                      onClick={() => applySuggestion(s)}
                                      className="w-full text-left px-3 py-2 hover:bg-accent/5 transition-colors border-b border-card-border/30 last:border-0"
                                    >
                                      <p className="text-xs font-medium text-accent-ink truncate">
                                        {s.product_name}
                                      </p>
                                      <p className="text-[10px] text-muted truncate">
                                        {s.brand} · {s.category}
                                      </p>
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Name / brand manual fields */}
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Product name"
                              className="w-full text-sm rounded-lg border border-card-border bg-background/60 px-3 py-1.5 outline-none focus:ring-2 focus:ring-accent/40"
                            />
                            <input
                              type="text"
                              value={editBrand}
                              onChange={(e) => setEditBrand(e.target.value)}
                              placeholder="Brand"
                              className="w-full text-sm rounded-lg border border-card-border bg-background/60 px-3 py-1.5 outline-none focus:ring-2 focus:ring-accent/40"
                            />

                            <div className="flex gap-2 pt-0.5">
                              <button
                                type="button"
                                onClick={confirmEdit}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
                              >
                                <Check size={12} />
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-card-border text-xs text-muted hover:text-foreground hover:border-foreground/40 transition-colors"
                              >
                                <X size={12} />
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="flex gap-3 p-3 rounded-xl bg-background/40 border border-card-border/40 relative"
                          >
                            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-semibold text-accent uppercase">
                                {p.category.slice(0, 3)}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-accent-ink truncate pr-6">
                                {p.name}
                              </p>
                              <p className="text-xs text-muted truncate">
                                {p.brand} · {p.category}
                              </p>
                              {p.notes && (
                                <p className="text-xs text-foreground/60 mt-1 leading-snug">
                                  {p.notes}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => startEdit(i)}
                              aria-label="Edit product"
                              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-muted opacity-60 hover:opacity-100 hover:text-accent hover:bg-accent/10 transition-all"
                            >
                              <Pencil size={11} />
                            </button>
                          </motion.div>
                        )
                      )}
                    </div>
                  </Card>
                </FadeIn>
              )}

              {/* Missing products */}
              {analysis.missing.length > 0 && (
                <FadeIn delay={0.1}>
                  <Card>
                    <div className="flex items-center gap-2 mb-5">
                      <PackagePlus size={18} className="text-rose" />
                      <h2 className="text-h3 font-light text-accent-deep">
                        What&apos;s missing
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {analysis.missing.map((m, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="border-l-2 border-rose/40 pl-4"
                        >
                          <p className="text-sm font-semibold text-accent-ink capitalize mb-1">
                            {m.category}
                          </p>
                          <p className="text-sm text-foreground/70 leading-relaxed mb-2">
                            {m.why}
                          </p>
                          {m.suggestions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {m.suggestions.map((s, j) => (
                                <span
                                  key={j}
                                  className="text-xs px-2 py-0.5 rounded-full bg-rose/10 text-rose border border-rose/20"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </Card>
                </FadeIn>
              )}

              {/* Routine order */}
              {analysis.routine.length > 0 && (
                <FadeIn delay={0.15}>
                  <Card>
                    <div className="flex items-center gap-2 mb-5">
                      <ListOrdered size={18} className="text-lavender" />
                      <h2 className="text-h3 font-light text-accent-deep">
                        Your routine order
                      </h2>
                    </div>
                    <ol className="space-y-4">
                      {analysis.routine.map((r, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="flex gap-4 items-start"
                        >
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-lavender/15 text-lavender flex items-center justify-center text-xs font-semibold">
                            {r.step}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <p className="text-sm font-medium text-accent-ink">
                                {r.product}
                              </p>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  TIME_BADGE[r.time] ?? TIME_BADGE["AM/PM"]
                                }`}
                              >
                                {r.time}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/65 leading-relaxed">
                              {r.how_to_use}
                            </p>
                          </div>
                        </motion.li>
                      ))}
                    </ol>
                  </Card>
                </FadeIn>
              )}

              {/* Save to collection */}
              {localProducts.length > 0 && (
                <FadeIn delay={0.2}>
                  <div className="flex flex-col items-center gap-2 pt-2">
                    {saved ? (
                      <p className="text-sm text-accent-deep font-medium">
                        Saved to your collection!
                      </p>
                    ) : (
                      <GhostButton
                        variant="filled"
                        size="md"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Sparkles size={15} />
                            </motion.div>
                            Saving…
                          </>
                        ) : (
                          <>
                            <PackagePlus size={15} />
                            Save to my collection
                          </>
                        )}
                      </GhostButton>
                    )}
                    {saveError && (
                      <p className="text-xs text-rose text-center">{saveError}</p>
                    )}
                  </div>
                </FadeIn>
              )}

              {/* Scan again */}
              <FadeIn delay={0.25}>
                <div className="flex justify-center pt-2">
                  <GhostButton variant="outline" size="md" onClick={clearImage}>
                    <Camera size={15} />
                    Scan another photo
                  </GhostButton>
                </div>
              </FadeIn>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
