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
  Star,
  ArrowLeft,
} from "lucide-react";

interface Alternative {
  name: string;
  brand: string;
  price_range?: string;
  why?: string;
}

interface CompareResult {
  product_name: string;
  brand?: string | null;
  category?: string | null;
  domain?: "skincare" | "haircare" | "makeup" | "other";
  summary: string;
  key_ingredients?: string[];
  good_for?: string[];
  watch_out_for?: string[];
  fit_for_you?: string | null;
  cheaper_alternatives?: Alternative[];
  premium_alternatives?: Alternative[];
  best_overall?: Alternative | null;
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
          <FadeIn>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs text-muted uppercase tracking-widest">
                    {result.brand || "Unknown brand"} · {result.category || "product"}
                  </div>
                  <h2 className="text-h2 font-light font-[family-name:var(--font-heading)]">
                    {result.product_name}
                  </h2>
                </div>
                {result.domain && <Pill active>{result.domain}</Pill>}
              </div>
              <p className="text-sm text-foreground mt-3">{result.summary}</p>

              {result.fit_for_you && (
                <div className="mt-4 flex gap-2 items-start text-sm bg-accent/10 rounded-lg p-3">
                  <Sparkles size={15} className="text-accent-deep mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-accent-deep">For you: </span>
                    <span className="text-foreground">{result.fit_for_you}</span>
                  </div>
                </div>
              )}
            </Card>
          </FadeIn>

          {(result.key_ingredients?.length ||
            result.good_for?.length ||
            result.watch_out_for?.length) && (
            <FadeIn delay={0.05}>
              <Card className="p-5 grid sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-muted mb-2">
                    Key ingredients
                  </h3>
                  <ul className="space-y-1">
                    {(result.key_ingredients ?? []).map((i) => (
                      <li key={i} className="flex gap-1.5 items-start">
                        <span className="text-accent-deep">•</span> {i}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-muted mb-2">
                    Good for
                  </h3>
                  <ul className="space-y-1">
                    {(result.good_for ?? []).map((g) => (
                      <li key={g} className="flex gap-1.5 items-start">
                        <CheckCircle2 size={14} className="text-accent-deep mt-0.5 shrink-0" />{" "}
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-muted mb-2">
                    Watch for
                  </h3>
                  <ul className="space-y-1">
                    {(result.watch_out_for ?? []).map((w) => (
                      <li key={w} className="flex gap-1.5 items-start">
                        <AlertTriangle size={14} className="text-[var(--gold)] mt-0.5 shrink-0" />{" "}
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </FadeIn>
          )}

          {result.best_overall && (
            <FadeIn delay={0.1}>
              <AltBlock
                title="Suki's pick"
                icon={<Star size={15} className="text-[var(--gold)]" />}
                items={[result.best_overall]}
              />
            </FadeIn>
          )}

          {result.cheaper_alternatives?.length ? (
            <FadeIn delay={0.15}>
              <AltBlock
                title="Similar for less"
                icon={<DollarSign size={15} className="text-accent-deep" />}
                items={result.cheaper_alternatives}
              />
            </FadeIn>
          ) : null}

          {result.premium_alternatives?.length ? (
            <FadeIn delay={0.2}>
              <AltBlock
                title="If you want premium"
                icon={<Crown size={15} className="text-[var(--lavender)]" />}
                items={result.premium_alternatives}
              />
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
