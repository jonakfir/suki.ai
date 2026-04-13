"use client";

import { useEffect, useState } from "react";
import { useStore, Recommendation, Budget } from "@/lib/store";
import { GhostButton } from "@/components/ui/GhostButton";
import { Pill } from "@/components/ui/Pill";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/ui/FadeIn";
import {
  Sparkles,
  ShieldAlert,
  RefreshCw,
  X,
  Clock,
  Filter,
  ExternalLink,
  Repeat,
  Loader2,
  Sun,
  Moon,
  CalendarDays,
  Heart,
} from "lucide-react";

interface PlanStep {
  order: number;
  time_of_day: "morning" | "evening" | "weekly";
  product_name: string;
  brand: string;
  category: string;
  how_to: string;
  frequency: string;
  amount: string;
  why_it_matters: string;
}

interface RoutinePlan {
  greeting: string;
  morning: PlanStep[];
  evening: PlanStep[];
  weekly: PlanStep[];
  rules: string[];
  avoid_pairings: string[];
  watch_out_for: string[];
  encouragement: string;
  generated_at: string;
}

export default function RecommendationsPage() {
  const { recommendations, setRecommendations, dismissRecommendation } = useStore();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"products" | "plan">("products");
  const [tab, setTab] = useState<"add" | "avoid">("add");
  const [filterBudget, setFilterBudget] = useState<Budget | "all">("all");
  const [swappingId, setSwappingId] = useState<string | null>(null);

  // Plan state
  const [plan, setPlan] = useState<RoutinePlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planSwapKey, setPlanSwapKey] = useState<string | null>(null);
  const [savedRecIds, setSavedRecIds] = useState<Set<string>>(new Set());
  const [savingRecId, setSavingRecId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);
    async function load() {
      try {
        const res = await fetch("/api/recommendations", { signal: controller.signal });
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/auth";
            return;
          }
          throw new Error(`Load failed (${res.status})`);
        }
        const body = await res.json();
        setRecommendations((body.recommendations ?? []) as Recommendation[]);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        console.error("Failed to load recommendations:", err);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }
    load();
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const regenerate = async () => {
    setGenerating(true);
    setError("");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        signal: controller.signal,
      });
      let data: { recommendations?: Recommendation[]; error?: string; detail?: string } = {};
      try {
        data = await res.json();
      } catch {
        // ignore parse errors
      }
      if (!res.ok) {
        setError(data.error || data.detail || `Failed to generate (${res.status})`);
        return;
      }
      if (data.recommendations) setRecommendations(data.recommendations);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setError("Recommendations took too long. Please retry.");
      } else {
        setError("Failed to connect to the server");
      }
      console.error(err);
    } finally {
      clearTimeout(timeoutId);
      setGenerating(false);
    }
  };

  const handleSave = async (rec: Recommendation) => {
    if (savedRecIds.has(rec.id) || savingRecId === rec.id) return;
    setSavingRecId(rec.id);
    setSavedRecIds((prev) => new Set(prev).add(rec.id));
    try {
      const s = rec.product_suggestion;
      const res = await fetch("/api/products/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestion: {
            product_name: s.name,
            brand: s.brand,
            category: s.category,
            ingredients: s.key_ingredients || [],
          },
        }),
      });
      if (!res.ok) {
        setSavedRecIds((prev) => {
          const next = new Set(prev);
          next.delete(rec.id);
          return next;
        });
      }
    } catch (err) {
      console.error("Save failed:", err);
      setSavedRecIds((prev) => {
        const next = new Set(prev);
        next.delete(rec.id);
        return next;
      });
    } finally {
      setSavingRecId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    dismissRecommendation(id);
    fetch("/api/recommendations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_dismissed: true }),
    }).catch(() => {});
  };

  const handleSwap = async (id: string) => {
    setSwappingId(id);
    try {
      const res = await fetch("/api/recommendations/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Swap failed");
        return;
      }
      if (data.recommendation) {
        setRecommendations(
          recommendations.map((r) =>
            r.id === data.recommendation.id ? data.recommendation : r
          )
        );
      }
    } catch (err) {
      console.error("Swap failed:", err);
      setError("Swap failed");
    } finally {
      setSwappingId(null);
    }
  };

  const generatePlan = async () => {
    setPlanLoading(true);
    setPlanError("");
    try {
      const res = await fetch("/api/plan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setPlanError(data.error || "Plan failed");
        return;
      }
      setPlan(data.plan as RoutinePlan);
    } catch (err) {
      console.error(err);
      setPlanError("Plan failed");
    } finally {
      setPlanLoading(false);
    }
  };

  const swapPlanStep = async (
    time: "morning" | "evening" | "weekly",
    order: number
  ) => {
    if (!plan) return;
    const bucket = plan[time];
    const idx = bucket.findIndex((s) => s.order === order);
    if (idx < 0) return;
    const step = bucket[idx];
    const key = `${time}-${order}`;
    setPlanSwapKey(key);
    try {
      const usedNames = [
        ...plan.morning,
        ...plan.evening,
        ...plan.weekly,
      ].map((s) => `${s.brand} ${s.product_name}`);
      const res = await fetch("/api/plan/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, usedNames }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlanError(data.error || "Swap failed");
        return;
      }
      const next = data.step as PlanStep;
      setPlan((prev) => {
        if (!prev) return prev;
        const updated = [...prev[time]];
        updated[idx] = next;
        return { ...prev, [time]: updated };
      });
    } catch (err) {
      console.error("Plan swap failed:", err);
      setPlanError("Swap failed");
    } finally {
      setPlanSwapKey(null);
    }
  };

  const filtered = recommendations
    .filter((r) => r.type === tab && !r.is_dismissed)
    .filter((r) =>
      filterBudget === "all" ? true : r.product_suggestion.budget_tier === filterBudget
    );

  const lastGenerated = recommendations[0]?.generated_at;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={28} className="text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 sm:mb-8 gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light">
              Your{" "}
              <span className="font-[family-name:var(--font-script)] gradient-text">
                suki.
              </span>
            </h1>
            <p className="text-sm text-muted font-[family-name:var(--font-body)]">
              Personalised picks + a routine plan built around your skin.
            </p>
            {lastGenerated && view === "products" && (
              <p className="text-xs text-muted/60 mt-1 flex items-center gap-1 font-[family-name:var(--font-body)]">
                <Clock size={12} />
                Last updated{" "}
                {new Date(lastGenerated).toLocaleDateString()} at{" "}
                {new Date(lastGenerated).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
          <GhostButton
            variant="outline"
            onClick={view === "plan" ? generatePlan : regenerate}
            disabled={generating || planLoading}
            className="w-full sm:w-auto"
          >
            <RefreshCw
              size={16}
              className={generating || planLoading ? "animate-spin" : ""}
            />
            {view === "plan"
              ? planLoading
                ? "Building..."
                : plan
                  ? "Rebuild plan"
                  : "Build my plan"
              : generating
                ? "Generating..."
                : "Regenerate"}
          </GhostButton>
        </div>
      </FadeIn>

      {/* View switcher: Products / Plan */}
      <FadeIn delay={0.05}>
        <div className="relative flex w-full sm:w-fit mb-6 sm:mb-8 p-1 rounded-full glass border border-card-border/40">
          <button
            onClick={() => setView("products")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-6 py-2 rounded-full text-sm transition-all cursor-pointer whitespace-nowrap ${
              view === "products"
                ? "bg-gradient-to-r from-accent to-accent-glow text-white shadow-[0_4px_20px_rgba(59,125,216,0.25)]"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Sparkles size={14} />
            Products
          </button>
          <button
            onClick={() => setView("plan")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-6 py-2 rounded-full text-sm transition-all cursor-pointer whitespace-nowrap ${
              view === "plan"
                ? "bg-gradient-to-r from-rose to-rose-soft text-white shadow-[0_4px_20px_rgba(232,160,191,0.3)]"
                : "text-muted hover:text-foreground"
            }`}
          >
            <CalendarDays size={14} />
            Plan
          </button>
        </div>
      </FadeIn>

      {error && (
        <FadeIn>
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-600">
            {error}
          </div>
        </FadeIn>
      )}

      {view === "products" ? (
        <ProductsView
          recommendations={recommendations}
          filtered={filtered}
          tab={tab}
          setTab={setTab}
          filterBudget={filterBudget}
          setFilterBudget={setFilterBudget}
          swappingId={swappingId}
          onSwap={handleSwap}
          onDismiss={handleDismiss}
          onRegenerate={regenerate}
          generating={generating}
          onSave={handleSave}
          savedRecIds={savedRecIds}
          savingRecId={savingRecId}
        />
      ) : (
        <PlanView
          plan={plan}
          loading={planLoading}
          error={planError}
          onGenerate={generatePlan}
          onSwapStep={swapPlanStep}
          swappingKey={planSwapKey}
        />
      )}
    </div>
  );
}

function ProductsView({
  recommendations,
  filtered,
  tab,
  setTab,
  filterBudget,
  setFilterBudget,
  swappingId,
  onSwap,
  onDismiss,
  onRegenerate,
  generating,
  onSave,
  savedRecIds,
  savingRecId,
}: {
  recommendations: Recommendation[];
  filtered: Recommendation[];
  tab: "add" | "avoid";
  setTab: (t: "add" | "avoid") => void;
  filterBudget: Budget | "all";
  setFilterBudget: (b: Budget | "all") => void;
  swappingId: string | null;
  onSwap: (id: string) => void;
  onDismiss: (id: string) => void;
  onRegenerate: () => void;
  generating: boolean;
  onSave: (rec: Recommendation) => void;
  savedRecIds: Set<string>;
  savingRecId: string | null;
}) {
  return (
    <>
      {/* Add / Avoid tabs */}
      <FadeIn delay={0.1}>
        <div className="flex gap-1 mb-4 sm:mb-6 p-1 bg-card rounded-xl w-full sm:w-fit overflow-x-auto">
          <button
            onClick={() => setTab("add")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-sm whitespace-nowrap transition-all cursor-pointer ${
              tab === "add"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Sparkles size={15} />
            Add to routine
          </button>
          <button
            onClick={() => setTab("avoid")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-sm whitespace-nowrap transition-all cursor-pointer ${
              tab === "avoid"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <ShieldAlert size={15} />
            Avoid
          </button>
        </div>
      </FadeIn>

      {tab === "add" && (
        <FadeIn delay={0.15}>
          <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6">
            <Filter size={14} className="text-muted" />
            <div className="flex flex-wrap gap-1.5">
              {(["all", "drugstore", "mid-range", "luxury"] as const).map((b) => (
                <Pill
                  key={b}
                  active={filterBudget === b}
                  onClick={() => setFilterBudget(b)}
                >
                  {b === "all" ? "All budgets" : b}
                </Pill>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {filtered.length === 0 ? (
        <FadeIn>
          <div className="text-center py-16 sm:py-20">
            <Sparkles size={48} className="text-muted/30 mx-auto mb-4" />
            <h3 className="text-lg font-light mb-1">
              {recommendations.length === 0
                ? "No recommendations yet"
                : "Nothing here"}
            </h3>
            <p className="text-sm text-muted font-[family-name:var(--font-body)] mb-4">
              {recommendations.length === 0
                ? "Hit regenerate to get personalised picks from suki."
                : "Try switching tabs or changing the budget filter."}
            </p>
            {recommendations.length === 0 && (
              <GhostButton
                variant="filled"
                onClick={onRegenerate}
                disabled={generating}
              >
                Generate recommendations
              </GhostButton>
            )}
          </div>
        </FadeIn>
      ) : (
        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((rec) => (
            <StaggerItem key={rec.id}>
              <RecCard
                rec={rec}
                onSwap={onSwap}
                onDismiss={onDismiss}
                swapping={swappingId === rec.id}
                onSave={onSave}
                saved={savedRecIds.has(rec.id)}
                saving={savingRecId === rec.id}
              />
            </StaggerItem>
          ))}
        </StaggerChildren>
      )}
    </>
  );
}

function RecCard({
  rec,
  onSwap,
  onDismiss,
  swapping,
  onSave,
  saved,
  saving,
}: {
  rec: Recommendation;
  onSwap: (id: string) => void;
  onDismiss: (id: string) => void;
  swapping: boolean;
  onSave: (rec: Recommendation) => void;
  saved: boolean;
  saving: boolean;
}) {
  const s = rec.product_suggestion;
  const isAvoid = rec.type === "avoid";
  const query = encodeURIComponent(`${s.brand} ${s.name}`.trim());
  const buyHref =
    s.buy_url || `https://www.google.com/search?tbm=shop&q=${query}`;
  const imgSrc =
    s.image_url ||
    `https://loremflickr.com/400/500/${encodeURIComponent(
      ["skincare", s.category, "beauty"].filter(Boolean).join(",")
    )}`;

  return (
    <div className="group relative flex flex-col h-full overflow-hidden rounded-2xl glass border border-card-border/60 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(126,184,232,0.15)]">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {!isAvoid && (
          <button
            onClick={() => onSave(rec)}
            disabled={saving || saved}
            className={`w-8 h-8 rounded-full backdrop-blur-sm border transition-colors flex items-center justify-center ${
              saved
                ? "bg-accent/15 border-accent/40 text-accent"
                : "bg-background/80 border-border/60 text-muted hover:text-accent hover:bg-background"
            }`}
            aria-label={saved ? "Saved to shelf" : "Save to shelf"}
          >
            <Heart size={14} className={saved ? "fill-accent" : ""} />
          </button>
        )}
        <button
          onClick={() => onDismiss(rec.id)}
          className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/60 text-muted hover:text-foreground hover:bg-background transition-colors flex items-center justify-center"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-accent/10 via-lavender/10 to-rose/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={`${s.brand} ${s.name}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
        {swapping && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <Loader2 size={22} className="text-accent animate-spin" />
          </div>
        )}
        {s.category && (
          <span className="absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full glass text-muted font-[family-name:var(--font-body)]">
            {s.category.replace("_", " ")}
          </span>
        )}
        {isAvoid && (
          <span className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full bg-red-50/90 text-red-500 border border-red-200">
            Avoid
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 sm:p-5">
        <h3 className="text-base font-medium leading-snug mb-0.5">{s.name}</h3>
        <p className="text-xs text-muted font-[family-name:var(--font-body)] tracking-wide">
          {s.brand}
          {s.price_range && ` · ${s.price_range}`}
        </p>

        <p className="text-sm text-foreground/75 mt-3 leading-relaxed font-[family-name:var(--font-body)] line-clamp-4">
          {s.reason}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {s.budget_tier && (
            <Pill className="!text-[10px]">{s.budget_tier}</Pill>
          )}
          {s.complexity_impact && (
            <Pill className="!text-[10px]">{s.complexity_impact}</Pill>
          )}
          {(s.key_ingredients || []).slice(0, 3).map((ing) => (
            <Pill key={ing} className="!text-[10px]">
              {ing}
            </Pill>
          ))}
        </div>

        {!isAvoid && (
          <div className="mt-4 flex gap-2">
            <a
              href={buyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-accent to-accent-glow text-white text-sm font-medium shadow-lg shadow-accent/20 hover:shadow-[0_8px_40px_rgba(59,125,216,0.35)] hover:scale-[1.02] transition-all"
            >
              Shop it
              <ExternalLink size={14} />
            </a>
            <button
              onClick={() => onSwap(rec.id)}
              disabled={swapping}
              aria-label="Swap this recommendation"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full border-2 border-accent/30 text-accent text-sm font-medium hover:bg-accent/10 hover:border-accent transition-all disabled:opacity-50"
            >
              {swapping ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Repeat size={14} />
              )}
              <span className="hidden sm:inline">Change</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanView({
  plan,
  loading,
  error,
  onGenerate,
  onSwapStep,
  swappingKey,
}: {
  plan: RoutinePlan | null;
  loading: boolean;
  error: string;
  onGenerate: () => void;
  onSwapStep: (time: "morning" | "evening" | "weekly", order: number) => void;
  swappingKey: string | null;
}) {
  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 size={28} className="text-rose animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted font-[family-name:var(--font-body)]">
          suki. is stitching your routine together...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!plan) {
    return (
      <FadeIn>
        <div className="text-center py-16 sm:py-20 max-w-md mx-auto">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-rose/20 to-accent/20 items-center justify-center mb-5">
            <CalendarDays size={28} className="text-rose" />
          </div>
          <h3 className="text-xl sm:text-2xl font-light italic mb-2">
            Build your full routine
          </h3>
          <p className="text-sm text-muted mb-6 font-[family-name:var(--font-body)] leading-relaxed">
            A morning-to-night plan made for{" "}
            <span className="font-[family-name:var(--font-script)] text-rose text-lg">
              your
            </span>{" "}
            skin — every product, every step, when to use it, when to skip it.
          </p>
          <GhostButton variant="filled" size="lg" onClick={onGenerate}>
            <Sparkles size={16} />
            Build my plan
          </GhostButton>
        </div>
      </FadeIn>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <FadeIn>
        <div className="glass rounded-2xl p-5 sm:p-6 border border-rose/20 bg-gradient-to-br from-rose/5 via-transparent to-accent/5">
          <p className="text-base sm:text-lg font-[family-name:var(--font-script)] text-rose leading-relaxed">
            {plan.greeting}
          </p>
        </div>
      </FadeIn>

      <PlanSection
        title="Morning"
        subtitle="Wake up, show up."
        icon={Sun}
        color="gold"
        time="morning"
        steps={plan.morning}
        onSwap={onSwapStep}
        swappingKey={swappingKey}
      />
      <PlanSection
        title="Evening"
        subtitle="Undo the day."
        icon={Moon}
        color="lavender"
        time="evening"
        steps={plan.evening}
        onSwap={onSwapStep}
        swappingKey={swappingKey}
      />
      {plan.weekly.length > 0 && (
        <PlanSection
          title="Weekly treats"
          subtitle="The extras, not the everyday."
          icon={CalendarDays}
          color="rose"
          time="weekly"
          steps={plan.weekly}
          onSwap={onSwapStep}
          swappingKey={swappingKey}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <InfoCard title="House rules" items={plan.rules} tone="accent" />
        <InfoCard title="Don't mix" items={plan.avoid_pairings} tone="rose" />
        <InfoCard title="Watch for" items={plan.watch_out_for} tone="gold" />
      </div>

      {plan.encouragement && (
        <FadeIn>
          <div className="text-center py-6 sm:py-8 px-4 sm:px-6 rounded-2xl bg-gradient-to-br from-accent/5 via-rose/5 to-lavender/5 border border-card-border/40">
            <Heart size={20} className="text-rose mx-auto mb-3" />
            <p className="text-base sm:text-lg font-[family-name:var(--font-script)] text-foreground/80 max-w-xl mx-auto leading-relaxed">
              {plan.encouragement}
            </p>
          </div>
        </FadeIn>
      )}
    </div>
  );
}

function PlanSection({
  title,
  subtitle,
  icon: Icon,
  color,
  time,
  steps,
  onSwap,
  swappingKey,
}: {
  title: string;
  subtitle: string;
  icon: typeof Sun;
  color: "gold" | "lavender" | "rose";
  time: "morning" | "evening" | "weekly";
  steps: PlanStep[];
  onSwap: (time: "morning" | "evening" | "weekly", order: number) => void;
  swappingKey: string | null;
}) {
  if (steps.length === 0) return null;
  const palette = {
    gold: { bg: "bg-gold/10", text: "text-gold", border: "border-gold/20", dot: "bg-gold" },
    lavender: { bg: "bg-lavender/10", text: "text-lavender", border: "border-lavender/20", dot: "bg-lavender" },
    rose: { bg: "bg-rose/10", text: "text-rose", border: "border-rose/20", dot: "bg-rose" },
  }[color];

  return (
    <FadeIn>
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-11 h-11 rounded-2xl ${palette.bg} flex items-center justify-center`}>
            <Icon size={20} className={palette.text} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-medium italic leading-none">{title}</h2>
            <p className="text-xs text-muted font-[family-name:var(--font-body)] mt-1">{subtitle}</p>
          </div>
        </div>

        <ol className="relative space-y-3 sm:space-y-4 pl-4 sm:pl-6 border-l border-card-border/40">
          {steps.map((step, i) => {
            const isSwapping = swappingKey === `${time}-${step.order}`;
            return (
              <li key={i} className="relative">
                <span
                  className={`absolute -left-[21px] sm:-left-[29px] top-3 w-3 h-3 rounded-full ${palette.dot} ring-4 ring-background`}
                />
                <div className={`relative rounded-2xl p-4 sm:p-5 glass border ${palette.border}`}>
                  {isSwapping && (
                    <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-background/70 backdrop-blur-sm z-10">
                      <Loader2 size={20} className={`${palette.text} animate-spin`} />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted font-[family-name:var(--font-body)] mb-1">
                        Step {step.order} · {step.category.replace("_", " ")}
                      </p>
                      <h3 className="text-base font-medium leading-snug">
                        {step.product_name}
                      </h3>
                      <p className="text-xs text-muted font-[family-name:var(--font-body)]">
                        {step.brand}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${palette.bg} ${palette.text}`}
                    >
                      {step.frequency}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 mt-2 font-[family-name:var(--font-body)] leading-relaxed">
                    {step.how_to}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted font-[family-name:var(--font-body)]">
                    <span>
                      <span className="text-muted/60">Amount:</span> {step.amount}
                    </span>
                  </div>
                  {step.why_it_matters && (
                    <p className="text-xs italic text-foreground/60 mt-3 font-[family-name:var(--font-body)] leading-relaxed border-t border-card-border/40 pt-3">
                      {step.why_it_matters}
                    </p>
                  )}
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => onSwap(time, step.order)}
                      disabled={isSwapping}
                      aria-label="Swap this step"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all disabled:opacity-50 ${palette.border} ${palette.text} hover:${palette.bg}`}
                    >
                      {isSwapping ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Repeat size={12} />
                      )}
                      Change
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </FadeIn>
  );
}

function InfoCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "accent" | "rose" | "gold";
}) {
  if (items.length === 0) return null;
  const palette = {
    accent: "border-accent/20 bg-accent/5 text-accent",
    rose: "border-rose/20 bg-rose/5 text-rose",
    gold: "border-gold/20 bg-gold/5 text-gold",
  }[tone];
  return (
    <FadeIn>
      <div className={`rounded-2xl p-5 border ${palette}`}>
        <h3 className="text-[10px] uppercase tracking-[0.18em] font-[family-name:var(--font-body)] mb-3">
          {title}
        </h3>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="text-sm text-foreground/80 font-[family-name:var(--font-body)] leading-relaxed flex gap-2"
            >
              <span className="shrink-0 opacity-60">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </FadeIn>
  );
}
