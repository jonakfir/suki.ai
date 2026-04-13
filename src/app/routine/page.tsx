"use client";

import { useEffect, useMemo, useState } from "react";
import { Sun, Moon, Sparkles, ArrowUp, ArrowDown, Trash2, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GhostButton } from "@/components/ui/GhostButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { UserProduct } from "@/lib/store";

type TimeOfDay = "morning" | "evening" | "weekly";

interface RoutineStep {
  id: string;
  time_of_day: TimeOfDay;
  position: number;
  product_id: string | null;
  step_name: string | null;
  instruction: string | null;
  notes: string | null;
  product?: {
    id: string;
    product_name: string;
    brand: string;
    category: string;
  } | null;
}

const SECTIONS: { key: TimeOfDay; label: string; Icon: typeof Sun }[] = [
  { key: "morning", label: "Morning", Icon: Sun },
  { key: "evening", label: "Evening", Icon: Moon },
  { key: "weekly", label: "Weekly", Icon: Sparkles },
];

export default function RoutinePage() {
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [savedProducts, setSavedProducts] = useState<UserProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addingFor, setAddingFor] = useState<TimeOfDay | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [routineRes, productsRes] = await Promise.allSettled([
        fetch("/api/routine").then((r) => r.json()),
        fetch("/api/products").then((r) => r.json()),
      ]);
      if (cancelled) return;
      if (routineRes.status === "fulfilled" && routineRes.value?.steps) {
        setSteps(routineRes.value.steps as RoutineStep[]);
      }
      if (productsRes.status === "fulfilled" && productsRes.value?.products) {
        const all = productsRes.value.products as UserProduct[];
        setSavedProducts(all.filter((p) => p.is_saved === true));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const g: Record<TimeOfDay, RoutineStep[]> = { morning: [], evening: [], weekly: [] };
    for (const s of steps) g[s.time_of_day].push(s);
    for (const k of Object.keys(g) as TimeOfDay[]) {
      g[k].sort((a, b) => a.position - b.position);
    }
    return g;
  }, [steps]);

  async function addStep(
    time_of_day: TimeOfDay,
    payload: { product_id?: string | null; step_name?: string | null; instruction?: string | null }
  ) {
    try {
      const res = await fetch("/api/routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time_of_day, ...payload }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to add step");
      setSteps((prev) => [...prev, body.step as RoutineStep]);
      setAddingFor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add step");
    }
  }

  async function removeStep(id: string) {
    const prev = steps;
    setSteps((s) => s.filter((x) => x.id !== id));
    try {
      const res = await fetch("/api/routine", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
    } catch (e) {
      setSteps(prev);
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  async function move(time: TimeOfDay, id: string, dir: -1 | 1) {
    const list = [...grouped[time]];
    const idx = list.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[idx], next[target]] = [next[target], next[idx]];
    const reordered = next.map((s, i) => ({ ...s, position: i }));
    const prevSteps = steps;
    setSteps((all) => {
      const others = all.filter((s) => s.time_of_day !== time);
      return [...others, ...reordered];
    });
    try {
      const res = await fetch("/api/routine/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderedIds: reordered.map((s) => s.id),
          time_of_day: time,
        }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
    } catch (e) {
      setSteps(prevSteps);
      setError(e instanceof Error ? e.message : "Failed to reorder");
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <FadeIn>
        <h1 className="text-2xl sm:text-3xl font-light mb-1 text-accent-ink">My routine</h1>
        <p className="text-sm text-muted font-[family-name:var(--font-body)] mb-6 sm:mb-8">
          Build your AM, PM, and weekly ritual.
        </p>
      </FadeIn>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-600 px-3 py-2 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {SECTIONS.map(({ key, label, Icon }, i) => (
          <FadeIn key={key} delay={0.05 * (i + 1)}>
            <Card className="h-full">
              <div className="flex items-center gap-2 mb-4">
                <Icon size={18} className="text-accent-deep" />
                <h2 className="text-lg font-light text-accent-deep">{label}</h2>
                <span className="ml-auto text-xs text-muted font-[family-name:var(--font-body)]">
                  {grouped[key].length} {grouped[key].length === 1 ? "step" : "steps"}
                </span>
              </div>

              {grouped[key].length === 0 ? (
                <div className="rounded-xl border border-dashed border-accent/20 ring-1 ring-accent/5 px-3 py-6 text-center">
                  <p className="text-sm text-muted font-[family-name:var(--font-body)]">
                    No steps yet — add your first one
                  </p>
                </div>
              ) : (
                <ol className="space-y-2">
                  {grouped[key].map((step, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === grouped[key].length - 1;
                    const title =
                      step.product?.product_name ??
                      step.step_name ??
                      "Untitled step";
                    const subtitle = step.product?.brand ?? null;
                    return (
                      <li
                        key={step.id}
                        className="group flex items-start gap-3 rounded-xl border border-accent/10 bg-background/40 p-3 transition-colors hover:border-accent/30"
                      >
                        <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-accent/10 text-accent-deep text-xs flex items-center justify-center font-medium">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{title}</p>
                          {subtitle && (
                            <p className="text-xs text-muted font-[family-name:var(--font-body)] truncate">
                              {subtitle}
                            </p>
                          )}
                          {step.instruction && (
                            <p className="text-xs text-muted mt-1 font-[family-name:var(--font-body)]">
                              {step.instruction}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => move(key, step.id, -1)}
                            disabled={isFirst}
                            aria-label="Move up"
                            className="p-1.5 rounded-full text-muted hover:bg-accent/15 hover:text-accent-deep disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => move(key, step.id, 1)}
                            disabled={isLast}
                            aria-label="Move down"
                            className="p-1.5 rounded-full text-muted hover:bg-accent/15 hover:text-accent-deep disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            onClick={() => removeStep(step.id)}
                            aria-label="Delete step"
                            className="p-1.5 rounded-full text-muted hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              <div className="mt-4">
                {addingFor === key ? (
                  <AddStepForm
                    savedProducts={savedProducts}
                    onCancel={() => setAddingFor(null)}
                    onSubmit={(payload) => addStep(key, payload)}
                  />
                ) : (
                  <GhostButton
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingFor(key)}
                    className="w-full"
                  >
                    <Plus size={14} />
                    Add step
                  </GhostButton>
                )}
              </div>
            </Card>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

function AddStepForm({
  savedProducts,
  onSubmit,
  onCancel,
}: {
  savedProducts: UserProduct[];
  onSubmit: (p: {
    product_id?: string | null;
    step_name?: string | null;
    instruction?: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"product" | "custom">(
    savedProducts.length > 0 ? "product" : "custom"
  );
  const [productId, setProductId] = useState<string>(
    savedProducts[0]?.id ?? ""
  );
  const [stepName, setStepName] = useState("");
  const [instruction, setInstruction] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = savedProducts.find((p) => p.id === productId);

  async function handleSubmit() {
    setSubmitting(true);
    if (mode === "product" && selectedProduct) {
      onSubmit({
        product_id: selectedProduct.id,
        step_name: selectedProduct.product_name,
        instruction: instruction || null,
      });
    } else {
      if (!stepName.trim()) {
        setSubmitting(false);
        return;
      }
      onSubmit({
        product_id: null,
        step_name: stepName.trim(),
        instruction: instruction || null,
      });
    }
    setSubmitting(false);
  }

  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 space-y-3">
      <div className="flex gap-3 text-xs font-[family-name:var(--font-body)]">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="add-step-mode"
            checked={mode === "product"}
            onChange={() => setMode("product")}
            disabled={savedProducts.length === 0}
            className="accent-accent"
          />
          <span>Saved product</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="add-step-mode"
            checked={mode === "custom"}
            onChange={() => setMode("custom")}
            className="accent-accent"
          />
          <span>Custom step</span>
        </label>
      </div>

      {mode === "product" ? (
        savedProducts.length === 0 ? (
          <p className="text-xs text-muted font-[family-name:var(--font-body)]">
            No saved products yet. Save some from recommendations first.
          </p>
        ) : (
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {savedProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.product_name} — {p.brand}
              </option>
            ))}
          </select>
        )
      ) : (
        <input
          type="text"
          placeholder="Step name (e.g. Double cleanse)"
          value={stepName}
          onChange={(e) => setStepName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      )}

      <input
        type="text"
        placeholder="Instruction (optional)"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
      />

      <div className="flex items-center justify-end gap-2">
        <GhostButton variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </GhostButton>
        <GhostButton
          variant="filled"
          size="sm"
          onClick={handleSubmit}
          disabled={
            submitting ||
            (mode === "product" && !selectedProduct) ||
            (mode === "custom" && !stepName.trim())
          }
        >
          Add
        </GhostButton>
      </div>
    </div>
  );
}
