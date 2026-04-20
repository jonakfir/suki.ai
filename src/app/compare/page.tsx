"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { GhostButton } from "@/components/ui/GhostButton";
import { Pill } from "@/components/ui/Pill";
import { FadeIn } from "@/components/ui/FadeIn";
import { BuyButton } from "@/components/ui/BuyButton";
import Link from "next/link";
import {
  Camera,
  Search,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Crown,
  Scale,
  ArrowLeft,
  Plus,
} from "lucide-react";

interface Alternative {
  name: string;
  brand: string;
  price_range?: string;
  why?: string;
}

interface KeyIngredient {
  name: string;
  what_it_does: string;
  role: "hero" | "supporting" | "watch_out";
}

interface VsProduct {
  product_name: string;
  brand: string;
  verdict: "better" | "same" | "stick_with_it";
  reason: string;
}

interface CompareResult {
  product_name: string;
  brand?: string | null;
  category?: string | null;
  domain?: "skincare" | "haircare" | "makeup" | "other";
  summary: string;
  key_ingredients?: KeyIngredient[];
  good_for?: string[];
  watch_out_for?: string[];
  fit_for_you?: string | null;
  vs_your_products?: VsProduct[];
  recommendation?: string | null;
  cheaper_alternatives?: Alternative[];
  premium_alternatives?: Alternative[];
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      const comma = s.indexOf(",");
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function ComparePage() {
  const [text, setText] = useState("");
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (f: File | null) => {
    if (!f) return;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(f.type)) {
      setError("Use a JPEG, PNG, WebP, or GIF.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Image too large (max 5 MB).");
      return;
    }
    setError(null);
    setImageName(f.name);
    setImageMime(f.type);
    setImageB64(await fileToBase64(f));
  };

  const clearImage = () => {
    setImageB64(null);
    setImageMime(null);
    setImageName(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    if (!text.trim() && !imageB64) {
      setError("Type a product name or upload a photo.");
      return;
    }
    setError(null);
    setResult(null);
    setAdded(false);
    setAddError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/products/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim() || undefined,
          imageBase64: imageB64 || undefined,
          imageMime: imageMime || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setResult(data as CompareResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const addToMyProducts = async () => {
    if (!result) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: result.product_name,
          brand: result.brand ?? "Unknown",
          category: result.category ?? "other",
          domain: result.domain ?? "other",
          rating: "neutral",
          is_current: false,
          notes: "",
          ingredients: (result.key_ingredients ?? []).map((i) => i.name),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Save failed (${res.status})`);
      setAdded(true);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Could not save product.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="relative min-h-screen px-4 sm:px-6 py-8 pb-28 max-w-3xl mx-auto">
      <FadeIn>
        <Link
          href="/today"
          aria-label="Back to Today"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </Link>
        <p className="text-xs text-muted uppercase tracking-widest">
          Understand · Compare · Save
        </p>
        <h1 className="text-h1 font-light font-[family-name:var(--font-heading)]">
          Compare a product
        </h1>
        <p className="text-sm text-muted mt-1 max-w-md">
          Take a photo or type a product name. Suki explains what it is, whether
          it fits you, and finds similar options at different price points.
        </p>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="mt-6 p-5">
          <div className="mb-6">
            <label htmlFor="compare-text" className="block text-sm text-foreground mb-2">
              Product name or description
            </label>
            <input
              id="compare-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. La Roche-Posay Toleriane Double Repair Moisturizer"
              className="w-full rounded-lg border border-[var(--card-border)] bg-background/60 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div className="mb-6 flex items-center gap-2 flex-wrap">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <GhostButton
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              <Camera size={15} />
              <span className="ml-1">{imageName ? "Change photo" : "Take or upload photo"}</span>
            </GhostButton>
            {imageName && (
              <>
                <span className="text-xs text-muted truncate max-w-[40%]">{imageName}</span>
                <button
                  type="button"
                  onClick={clearImage}
                  className="text-xs text-muted hover:text-foreground underline"
                >
                  remove
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <GhostButton
              variant="filled"
              size="md"
              onClick={submit}
              disabled={loading || (!text.trim() && !imageB64)}
              type="button"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span className="ml-1">Analyzing…</span>
                </>
              ) : (
                <>
                  <Search size={15} />
                  <span className="ml-1">Compare</span>
                </>
              )}
            </GhostButton>
            {error && (
              <span className="text-xs text-red-500">{error}</span>
            )}
          </div>
        </Card>
      </FadeIn>

      {loading && !result && (
        <FadeIn delay={0.1}>
          <Card className="mt-6 p-5 flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-accent-deep" />
            <span className="text-sm text-muted">
              Reading the label, checking ingredients, and pricing alternatives…
            </span>
          </Card>
        </FadeIn>
      )}

      {result && (
        <div className="mt-6 space-y-5">

          {/* Box 1 — Product description */}
          <FadeIn>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="text-xs text-muted uppercase tracking-widest mb-1">
                    {result.brand || "Unknown brand"} · {result.category || "product"}
                  </div>
                  <h2 className="text-h2 font-light font-[family-name:var(--font-heading)]">
                    {result.product_name}
                  </h2>
                </div>
                {result.domain && <Pill active>{result.domain}</Pill>}
              </div>
              <p className="text-sm text-foreground mb-4">{result.summary}</p>

              {result.key_ingredients?.length ? (
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-muted mb-2.5">
                    What it does
                  </h3>
                  <ul className="space-y-2">
                    {result.key_ingredients.map((ing) => (
                      <li key={ing.name} className="flex gap-1.5 text-sm">
                        <span className="font-medium shrink-0">{ing.name}</span>
                        <span className="text-muted">— {ing.what_it_does}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                {added ? (
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
                  >
                    <CheckCircle2 size={15} className="text-green-600" />
                    Added to my products ✓
                  </Link>
                ) : (
                  <GhostButton
                    variant="outline"
                    size="sm"
                    onClick={addToMyProducts}
                    disabled={adding}
                    type="button"
                  >
                    {adding ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    {adding ? "Saving…" : "Add to my products"}
                  </GhostButton>
                )}
                {addError && (
                  <p className="mt-2 text-xs text-red-500">{addError}</p>
                )}
              </div>
            </Card>
          </FadeIn>

          {/* Box 2 — How it compares to your products */}
          <FadeIn delay={0.05}>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Scale size={15} className="text-accent-deep" />
                <h3 className="text-sm font-medium">How it compares to your products</h3>
              </div>

              {result.vs_your_products?.length ? (
                <>
                  <ul className="space-y-3 mb-4">
                    {result.vs_your_products.map((vp, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <VerdictBadge verdict={vp.verdict} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {vp.product_name}{" "}
                            <span className="font-normal text-muted">by {vp.brand}</span>
                          </p>
                          <p className="text-xs text-muted mt-0.5">{vp.reason}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {result.recommendation && (
                    <div className="flex gap-2 items-start text-sm bg-accent/10 rounded-lg p-3">
                      <Sparkles size={14} className="text-accent-deep mt-0.5 shrink-0" />
                      <span>{result.recommendation}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted mb-3">
                    You don&apos;t have anything similar yet — here&apos;s how this fits your skin profile:
                  </p>
                  {result.fit_for_you && (
                    <div className="flex gap-2 items-start text-sm bg-accent/10 rounded-lg p-3">
                      <Sparkles size={14} className="text-accent-deep mt-0.5 shrink-0" />
                      <span>{result.fit_for_you}</span>
                    </div>
                  )}
                </>
              )}
            </Card>
          </FadeIn>

          {/* Box 3 — Cheaper alternatives */}
          {result.cheaper_alternatives?.length ? (
            <FadeIn delay={0.1}>
              <AltBlock
                title="Similar for less"
                icon={<DollarSign size={15} className="text-accent-deep" />}
                items={result.cheaper_alternatives}
              />
            </FadeIn>
          ) : null}

          {/* Box 4 — Premium alternatives */}
          {result.premium_alternatives?.length ? (
            <FadeIn delay={0.15}>
              <AltBlock
                title="Worth the upgrade?"
                icon={<Crown size={15} className="text-[var(--lavender)]" />}
                items={result.premium_alternatives}
              />
            </FadeIn>
          ) : null}

          {/* Box 5 — Ingredients */}
          {(result.good_for?.length || result.watch_out_for?.length || result.key_ingredients?.length) ? (
            <FadeIn delay={0.2}>
              <Card className="p-5">
                <h3 className="text-sm font-medium mb-4">What&apos;s inside</h3>

                {(result.good_for?.length || result.watch_out_for?.length) ? (
                  <div className="grid sm:grid-cols-2 gap-4 mb-5">
                    {result.good_for?.length ? (
                      <div>
                        <h4 className="text-xs uppercase tracking-widest text-muted mb-2">
                          Good for
                        </h4>
                        <ul className="space-y-1">
                          {result.good_for.map((g) => (
                            <li key={g} className="flex gap-1.5 items-start text-sm">
                              <CheckCircle2 size={14} className="text-accent-deep mt-0.5 shrink-0" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {result.watch_out_for?.length ? (
                      <div>
                        <h4 className="text-xs uppercase tracking-widest text-muted mb-2">
                          Watch for
                        </h4>
                        <ul className="space-y-1">
                          {result.watch_out_for.map((w) => (
                            <li key={w} className="flex gap-1.5 items-start text-sm">
                              <AlertTriangle size={14} className="text-[var(--gold)] mt-0.5 shrink-0" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {result.key_ingredients?.length ? (
                  <div>
                    <h4 className="text-xs uppercase tracking-widest text-muted mb-3">
                      Key ingredients
                    </h4>
                    <ul className="space-y-3">
                      {result.key_ingredients.map((ing) => (
                        <li key={ing.name} className="flex items-start gap-2.5">
                          <IngredientRoleBadge role={ing.role} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{ing.name}</p>
                            <p className="text-xs text-muted">{ing.what_it_does}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Card>
            </FadeIn>
          ) : null}

        </div>
      )}
    </div>
  );
}

function AltBlock({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: Alternative[];
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <ul className="divide-y divide-[var(--card-border)]">
        {items.map((a, i) => (
          <li key={`${a.brand}-${a.name}-${i}`} className="py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{a.name}</div>
              <div className="text-xs text-muted">{a.brand}</div>
              {a.why && <div className="text-xs text-foreground mt-1">{a.why}</div>}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {a.price_range && (
                <span className="text-xs text-accent-deep bg-accent/10 rounded-full px-2 py-1">
                  {a.price_range}
                </span>
              )}
              <BuyButton name={a.name} brand={a.brand} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function VerdictBadge({ verdict }: { verdict: "better" | "same" | "stick_with_it" }) {
  switch (verdict) {
    case "better":
      return (
        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">
          Better for you
        </span>
      );
    case "same":
      return (
        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
          About the same
        </span>
      );
    case "stick_with_it":
      return (
        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
          Stick with what you have
        </span>
      );
  }
}

function IngredientRoleBadge({ role }: { role: "hero" | "supporting" | "watch_out" }) {
  switch (role) {
    case "hero":
      return (
        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent-deep border border-accent/20 whitespace-nowrap">
          Hero ingredient
        </span>
      );
    case "supporting":
      return (
        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-card text-muted border border-[var(--card-border)] whitespace-nowrap">
          Supporting
        </span>
      );
    case "watch_out":
      return (
        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
          Watch out
        </span>
      );
  }
}
