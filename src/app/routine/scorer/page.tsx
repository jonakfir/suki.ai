"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { GhostButton } from "@/components/ui/GhostButton";
import { Pill } from "@/components/ui/Pill";
import { FadeIn } from "@/components/ui/FadeIn";
import { PageHero } from "@/components/ui/PageHero";
import {
  Sun,
  Moon,
  Search,
  X,
  Loader2,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Plus,
  RefreshCw,
  Lightbulb,
  Save,
} from "lucide-react";

/* ── types ────────────────────────────────────────────────────── */

interface SearchHit {
  product_name: string;
  brand: string;
  category: string;
  ingredients: string[];
  price_range: string;
  description: string;
  image_url?: string;
}

interface ScoredProduct {
  product_name: string;
  brand: string;
  category: string;
  image_url: string | null;
  grade: string;
  score: number;
  allergen_flags: string[];
  concerns_addressed: string[];
  warnings: string[];
  has_fragrance: boolean;
  has_alcohol: boolean;
  comedogenic_score: number;
  commentary?: string;
}

interface MissingStep {
  time_of_day: string;
  category: string;
  reason: string;
  suggestion: {
    name: string;
    brand: string;
    reason: string;
    price_range: string;
  };
}

interface Replacement {
  replace_product: string;
  replace_brand: string;
  time_of_day: string;
  with_name: string;
  with_brand: string;
  with_category: string;
  reason: string;
  price_range: string;
}

interface ScoreResult {
  overall_grade: string;
  overall_score: number;
  overall_summary: string;
  morning: {
    grade: string;
    score: number;
    products: ScoredProduct[];
  };
  evening: {
    grade: string;
    score: number;
    products: ScoredProduct[];
  };
  missing_steps: MissingStep[];
  replacements: Replacement[];
  tips: string[];
}

/* ── grade colors ─────────────────────────────────────────────── */

function gradeColor(grade: string) {
  if (grade.startsWith("A")) return { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", ring: "ring-emerald-500/20" };
  if (grade.startsWith("B")) return { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", ring: "ring-blue-500/20" };
  if (grade === "C") return { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", ring: "ring-amber-500/20" };
  return { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", ring: "ring-red-500/20" };
}

/* ── product image with fallback ──────────────────────────────── */

function ProductImage({ src, alt, size = "md" }: { src?: string | null; alt: string; size?: "sm" | "md" }) {
  const [failed, setFailed] = useState(false);
  const dim = size === "sm" ? "w-10 h-10" : "w-14 h-14";

  if (!src || failed) {
    return (
      <div className={`${dim} rounded-xl bg-card-border/30 flex items-center justify-center shrink-0`}>
        <Sparkles className="w-5 h-5 text-muted/50" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`${dim} rounded-xl object-cover shrink-0 border border-card-border/40`}
    />
  );
}

/* ── main page ────────────────────────────────────────────────── */

export default function ScorerPage() {
  // Input state
  const [morningProducts, setMorningProducts] = useState<SearchHit[]>([]);
  const [eveningProducts, setEveningProducts] = useState<SearchHit[]>([]);

  // Search state
  const [activeSearch, setActiveSearch] = useState<"morning" | "evening" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Scoring state
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [scoreError, setScoreError] = useState("");

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ── search ─────────────────────────────────────────────────── */

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    setSearchLoading(true);
    setSearchError("");
    try {
      const res = await fetch("/api/products/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Search failed (${res.status})`);
      setSearchResults((body.products ?? []) as SearchHit[]);
      if ((body.products ?? []).length === 0) {
        setSearchError("No matches found. Try a different search.");
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const pickResult = (hit: SearchHit) => {
    if (activeSearch === "morning") {
      setMorningProducts((prev) => [...prev, hit]);
    } else {
      setEveningProducts((prev) => [...prev, hit]);
    }
    setActiveSearch(null);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
  };

  const removeProduct = (time: "morning" | "evening", index: number) => {
    if (time === "morning") {
      setMorningProducts((prev) => prev.filter((_, i) => i !== index));
    } else {
      setEveningProducts((prev) => prev.filter((_, i) => i !== index));
    }
  };

  /* ── score ──────────────────────────────────────────────────── */

  const scoreRoutine = async () => {
    setScoring(true);
    setScoreError("");
    setResult(null);
    try {
      const res = await fetch("/api/routine/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          morning: morningProducts.map((p) => ({
            product_name: p.product_name,
            brand: p.brand,
            category: p.category,
            ingredients: p.ingredients || [],
            image_url: p.image_url || null,
          })),
          evening: eveningProducts.map((p) => ({
            product_name: p.product_name,
            brand: p.brand,
            category: p.category,
            ingredients: p.ingredients || [],
            image_url: p.image_url || null,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Scoring failed (${res.status})`);
      setResult(body as ScoreResult);
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : "Scoring failed");
    } finally {
      setScoring(false);
    }
  };

  /* ── save to routine ────────────────────────────────────────── */

  const saveToRoutine = async () => {
    setSaving(true);
    try {
      const allProducts = [
        ...morningProducts.map((p) => ({ ...p, is_current: true })),
        ...eveningProducts.map((p) => ({ ...p, is_current: true })),
      ];
      for (const p of allProducts) {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_name: p.product_name,
            brand: p.brand,
            category: p.category || "other",
            rating: "neutral",
            notes: "",
            is_current: true,
            ingredients: p.ingredients || [],
            image_url: p.image_url || null,
          }),
        });
      }
      setSaved(true);
    } catch {
      // silent fail — non-critical
    } finally {
      setSaving(false);
    }
  };

  /* ── reset ──────────────────────────────────────────────────── */

  const resetAll = () => {
    setMorningProducts([]);
    setEveningProducts([]);
    setResult(null);
    setScoreError("");
    setSaved(false);
  };

  const totalProducts = morningProducts.length + eveningProducts.length;

  /* ── render ─────────────────────────────────────────────────── */

  return (
    <main className="min-h-screen bg-background pb-24">
      <PageHero
        eyebrow="routine scorer"
        title="Score your"
        titleAccent="current routine"
        subtitle="Add the products you use every morning and night, and we'll tell you how well they fit your skin."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-8">
        {/* ── RESULTS VIEW ────────────────────────────────────── */}
        {result ? (
          <ResultsView
            result={result}
            onReset={resetAll}
            onSave={saveToRoutine}
            saving={saving}
            saved={saved}
          />
        ) : (
          <>
            {/* ── INPUT VIEW ──────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Morning */}
              <RoutineColumn
                label="Morning"
                icon={<Sun className="w-5 h-5 text-amber-400" />}
                products={morningProducts}
                onAdd={() => { setActiveSearch("morning"); setSearchQuery(""); setSearchResults([]); setSearchError(""); }}
                onRemove={(i) => removeProduct("morning", i)}
                accentClass="text-amber-400"
              />

              {/* Evening */}
              <RoutineColumn
                label="Evening"
                icon={<Moon className="w-5 h-5 text-violet-400" />}
                products={eveningProducts}
                onAdd={() => { setActiveSearch("evening"); setSearchQuery(""); setSearchResults([]); setSearchError(""); }}
                onRemove={(i) => removeProduct("evening", i)}
                accentClass="text-violet-400"
              />
            </div>

            {/* Score button */}
            <FadeIn className="mt-8 flex flex-col items-center gap-3">
              <GhostButton
                variant="filled"
                size="lg"
                disabled={totalProducts === 0 || scoring}
                onClick={scoreRoutine}
              >
                {scoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing your routine...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Score my routine
                  </>
                )}
              </GhostButton>
              {totalProducts === 0 && (
                <p className="text-muted text-sm">Add at least one product to get started.</p>
              )}
              {scoreError && (
                <p className="text-red-400 text-sm">{scoreError}</p>
              )}
            </FadeIn>

            {/* ── SEARCH MODAL ────────────────────────────────── */}
            {activeSearch && (
              <SearchOverlay
                timeLabel={activeSearch}
                query={searchQuery}
                setQuery={setSearchQuery}
                results={searchResults}
                loading={searchLoading}
                error={searchError}
                onSearch={runSearch}
                onPick={pickResult}
                onClose={() => { setActiveSearch(null); setSearchQuery(""); setSearchResults([]); setSearchError(""); }}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

/* ── RoutineColumn ────────────────────────────────────────────── */

function RoutineColumn({
  label,
  icon,
  products,
  onAdd,
  onRemove,
  accentClass,
}: {
  label: string;
  icon: React.ReactNode;
  products: SearchHit[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  accentClass: string;
}) {
  return (
    <FadeIn>
      <Card>
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h2 className={`font-[family-name:var(--font-script)] text-lg font-semibold ${accentClass}`}>
            {label}
          </h2>
          <span className="text-muted text-sm ml-auto">{products.length} products</span>
        </div>

        {products.length === 0 ? (
          <p className="text-muted text-sm mb-4">No products added yet.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {products.map((p, i) => (
              <div key={`${p.product_name}-${i}`} className="flex items-center gap-3 bg-background/40 rounded-xl p-2.5 border border-card-border/30">
                <ProductImage src={p.image_url} alt={p.product_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.product_name}</p>
                  <p className="text-xs text-muted truncate">{p.brand} &middot; {p.category}</p>
                </div>
                <button onClick={() => onRemove(i)} className="text-muted hover:text-red-400 transition-colors p-1 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <GhostButton variant="outline" size="sm" onClick={onAdd} className="w-full">
          <Plus className="w-4 h-4" />
          Add product
        </GhostButton>
      </Card>
    </FadeIn>
  );
}

/* ── SearchOverlay ────────────────────────────────────────────── */

function SearchOverlay({
  timeLabel,
  query,
  setQuery,
  results,
  loading,
  error,
  onSearch,
  onPick,
  onClose,
}: {
  timeLabel: string;
  query: string;
  setQuery: (q: string) => void;
  results: SearchHit[];
  loading: boolean;
  error: string;
  onSearch: () => void;
  onPick: (hit: SearchHit) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4">
      <div className="bg-card border border-card-border/60 rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-card-border/40">
          <Search className="w-5 h-5 text-muted" />
          <span className="text-sm text-muted capitalize">Add to {timeLabel} routine</span>
          <button onClick={onClose} className="ml-auto text-muted hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-card-border/30">
          <form
            onSubmit={(e) => { e.preventDefault(); onSearch(); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products (e.g. CeraVe moisturizer)"
              autoFocus
              className="flex-1 bg-background/60 border border-card-border/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <GhostButton variant="primary" size="sm" onClick={onSearch} disabled={loading || query.trim().length < 2}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </GhostButton>
          </form>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {error && (
            <p className="text-sm text-muted text-center py-4">{error}</p>
          )}
          {results.length === 0 && !loading && !error && (
            <p className="text-sm text-muted text-center py-8">Search for a product to add it to your routine.</p>
          )}
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-muted text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </div>
          )}
          {results.map((hit, i) => (
            <button
              key={`${hit.product_name}-${i}`}
              onClick={() => onPick(hit)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/10 transition-colors text-left"
            >
              <ProductImage src={hit.image_url} alt={hit.product_name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{hit.product_name}</p>
                <p className="text-xs text-muted truncate">{hit.brand} &middot; {hit.category}</p>
                {hit.description && (
                  <p className="text-xs text-muted/70 mt-0.5 line-clamp-2">{hit.description}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── ResultsView ──────────────────────────────────────────────── */

function ResultsView({
  result,
  onReset,
  onSave,
  saving,
  saved,
}: {
  result: ScoreResult;
  onReset: () => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const overall = gradeColor(result.overall_grade);

  return (
    <div className="space-y-8">
      {/* Overall grade */}
      <FadeIn>
        <Card className="text-center">
          <p className="text-muted text-sm mb-2">Your routine score</p>
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl text-3xl font-bold ${overall.bg} ${overall.text} border ${overall.border} ring-4 ${overall.ring}`}>
            {result.overall_grade}
          </div>
          <p className="text-foreground mt-4 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            {result.overall_summary}
          </p>
        </Card>
      </FadeIn>

      {/* Morning products */}
      {result.morning.products.length > 0 && (
        <ScoredSection
          label="Morning"
          icon={<Sun className="w-5 h-5 text-amber-400" />}
          grade={result.morning.grade}
          products={result.morning.products}
          missingSteps={result.missing_steps.filter((s) => s.time_of_day === "morning")}
          replacements={result.replacements.filter((r) => r.time_of_day === "morning")}
          accentClass="text-amber-400"
          delay={0.1}
        />
      )}

      {/* Evening products */}
      {result.evening.products.length > 0 && (
        <ScoredSection
          label="Evening"
          icon={<Moon className="w-5 h-5 text-violet-400" />}
          grade={result.evening.grade}
          products={result.evening.products}
          missingSteps={result.missing_steps.filter((s) => s.time_of_day === "evening")}
          replacements={result.replacements.filter((r) => r.time_of_day === "evening")}
          accentClass="text-violet-400"
          delay={0.2}
        />
      )}

      {/* Tips */}
      {result.tips.length > 0 && (
        <FadeIn delay={0.3}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <h3 className="font-[family-name:var(--font-script)] text-lg font-semibold text-foreground">Tips</h3>
            </div>
            <ul className="space-y-2">
              {result.tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted">
                  <span className="text-accent shrink-0 mt-0.5">&bull;</span>
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        </FadeIn>
      )}

      {/* Actions */}
      <FadeIn delay={0.4} className="flex flex-wrap justify-center gap-3">
        <GhostButton variant="filled" size="md" onClick={onSave} disabled={saving || saved}>
          {saved ? (
            <>Saved!</>
          ) : saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save to my routine
            </>
          )}
        </GhostButton>
        <GhostButton variant="outline" size="md" onClick={onReset}>
          <RefreshCw className="w-4 h-4" />
          Score again
        </GhostButton>
      </FadeIn>
    </div>
  );
}

/* ── ScoredSection ────────────────────────────────────────────── */

function ScoredSection({
  label,
  icon,
  grade,
  products,
  missingSteps,
  replacements,
  accentClass,
  delay,
}: {
  label: string;
  icon: React.ReactNode;
  grade: string;
  products: ScoredProduct[];
  missingSteps: MissingStep[];
  replacements: Replacement[];
  accentClass: string;
  delay: number;
}) {
  const g = gradeColor(grade);

  return (
    <FadeIn delay={delay}>
      <Card>
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className={`font-[family-name:var(--font-script)] text-lg font-semibold ${accentClass}`}>
            {label}
          </h3>
          <div className={`ml-auto px-2.5 py-0.5 rounded-lg text-sm font-bold ${g.bg} ${g.text} border ${g.border}`}>
            {grade}
          </div>
        </div>

        {/* Product cards */}
        <div className="space-y-3">
          {products.map((p, i) => {
            const pc = gradeColor(p.grade);
            return (
              <div key={`${p.product_name}-${i}`} className="flex gap-3 bg-background/40 rounded-xl p-3 border border-card-border/30">
                <ProductImage src={p.image_url} alt={p.product_name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.product_name}</p>
                      <p className="text-xs text-muted truncate">{p.brand} &middot; {p.category}</p>
                    </div>
                    <Pill className={`shrink-0 !text-xs !px-2 !py-0.5 ${pc.bg} ${pc.text} !border-0`}>
                      {p.grade}
                    </Pill>
                  </div>
                  {p.commentary && (
                    <p className="text-xs text-muted mt-1.5 leading-relaxed">{p.commentary}</p>
                  )}
                  {p.allergen_flags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-red-400">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      Allergen: {p.allergen_flags.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Missing steps */}
        {missingSteps.length > 0 && (
          <div className="mt-4 pt-4 border-t border-card-border/30">
            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-accent" />
              Missing from your {label.toLowerCase()} routine
            </p>
            {missingSteps.map((step, i) => (
              <div key={i} className="bg-accent/5 rounded-xl p-3 border border-accent/20 mb-2">
                <p className="text-sm font-medium text-accent">{step.category}</p>
                <p className="text-xs text-muted mt-0.5">{step.reason}</p>
                <div className="flex items-center gap-1 mt-1.5 text-xs text-foreground">
                  <ArrowRight className="w-3 h-3 text-accent" />
                  Try <span className="font-medium">{step.suggestion.name}</span> by {step.suggestion.brand}
                  {step.suggestion.price_range && <span className="text-muted"> &middot; {step.suggestion.price_range}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Replacements */}
        {replacements.length > 0 && (
          <div className="mt-4 pt-4 border-t border-card-border/30">
            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-amber-400" />
              Suggested swaps
            </p>
            {replacements.map((r, i) => (
              <div key={i} className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/20 mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted line-through">{r.replace_product} ({r.replace_brand})</span>
                  <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="font-medium text-foreground">{r.with_name} ({r.with_brand})</span>
                </div>
                <p className="text-xs text-muted mt-1">{r.reason}</p>
                {r.price_range && (
                  <p className="text-xs text-muted mt-0.5">{r.price_range}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </FadeIn>
  );
}
