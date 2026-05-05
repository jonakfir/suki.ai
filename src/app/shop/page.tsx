"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore, type Recommendation } from "@/lib/store";
import { wrapAffiliate } from "@/lib/affiliate";
import { Sparkles, Heart, X, ExternalLink, Loader2, RefreshCw } from "lucide-react";

type Domain = "skincare" | "haircare" | "makeup";

const HAIR = new Set([
  "shampoo", "conditioner", "hair_mask", "hair_oil", "hair_styling",
  "scalp_treatment", "heat_protectant", "leave_in",
]);
const MAKEUP = new Set([
  "foundation", "concealer", "powder", "blush", "bronzer", "highlighter",
  "lipstick", "lip_gloss", "lip_liner", "eyeshadow", "eyeliner", "mascara",
  "brow", "primer", "setting_spray", "makeup_remover",
]);

function domainOf(category: string): Domain {
  const c = (category || "").toLowerCase();
  if (HAIR.has(c)) return "haircare";
  if (MAKEUP.has(c)) return "makeup";
  return "skincare";
}

const TAB_LABEL: Record<Domain, string> = {
  skincare: "Skincare",
  haircare: "Hair",
  makeup: "Makeup",
};

export default function ShopPage() {
  const { recommendations, setRecommendations, dismissRecommendation } = useStore();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<Domain>("skincare");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 60_000);
    (async () => {
      try {
        const res = await fetch("/api/recommendations", { signal: controller.signal });
        if (!res.ok) {
          if (res.status === 401) window.location.href = "/auth";
          return;
        }
        const body = await res.json();
        setRecommendations((body.recommendations ?? []) as Recommendation[]);
      } catch {
        // ignore
      } finally {
        clearTimeout(t);
        setLoading(false);
      }
    })();
    return () => {
      clearTimeout(t);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adds = useMemo(
    () =>
      recommendations
        .filter((r) => r.type === "add" && !r.is_dismissed)
        .filter((r) => domainOf(r.product_suggestion.category) === tab),
    [recommendations, tab]
  );

  async function regenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/recommendations", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.recommendations) setRecommendations(data.recommendations);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(rec: Recommendation) {
    if (savedIds.has(rec.id) || savingId === rec.id) return;
    setSavingId(rec.id);
    setSavedIds((p) => new Set(p).add(rec.id));
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
        setSavedIds((p) => {
          const n = new Set(p);
          n.delete(rec.id);
          return n;
        });
      }
    } finally {
      setSavingId(null);
    }
  }

  async function handleDismiss(id: string) {
    dismissRecommendation(id);
    fetch("/api/recommendations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_dismissed: true }),
    }).catch(() => {});
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Shop</h1>
        <button
          type="button"
          onClick={regenerate}
          disabled={generating}
          className="flex items-center gap-1 text-sm text-accent-deep hover:text-accent disabled:opacity-50"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-4 border-b border-[var(--card-border)]">
        {(Object.keys(TAB_LABEL) as Domain[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setTab(d)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === d
                ? "border-accent text-accent-deep font-medium"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {TAB_LABEL[d]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : !adds.length ? (
        <div className="text-center py-12 text-muted text-sm">
          <Sparkles size={20} className="mx-auto mb-2" />
          No {TAB_LABEL[tab].toLowerCase()} picks yet. Tap Refresh to generate some.
        </div>
      ) : (
        <ul className="space-y-3">
          {adds.map((rec) => {
            const s = rec.product_suggestion;
            const buy = s.buy_url ? wrapAffiliate(s.buy_url) : null;
            const saved = savedIds.has(rec.id);
            return (
              <li
                key={rec.id}
                className="rounded-2xl border border-[var(--card-border)] bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted">{s.brand}</div>
                    {s.reason && (
                      <p className="text-xs text-muted mt-2">{s.reason}</p>
                    )}
                    {s.price_range && (
                      <div className="text-xs text-muted mt-1">{s.price_range}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDismiss(rec.id)}
                    className="text-muted hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {buy && (
                    <a
                      href={buy}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent text-white text-xs hover:bg-accent-deep"
                    >
                      Buy <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSave(rec)}
                    disabled={saved || savingId === rec.id}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      saved
                        ? "border-accent/40 text-accent-deep bg-accent/10"
                        : "border-[var(--card-border)] hover:bg-card/50"
                    }`}
                  >
                    <Heart size={12} className={saved ? "fill-current" : ""} />
                    {saved ? "Saved" : "Save"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
