"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAdminSession, ADMIN_USER_ID } from "@/lib/admin";
import {
  useStore,
  UserProduct,
  ProductDomain,
  domainForCategory,
} from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { GhostButton } from "@/components/ui/GhostButton";
import { Pill } from "@/components/ui/Pill";
import { FadeIn } from "@/components/ui/FadeIn";
import {
  Sun,
  Moon,
  Plus,
  Sparkles,
  Heart,
  ArrowRight,
  Search,
} from "lucide-react";

interface TimeLabelConfig {
  label: string;
  icon?: React.ReactNode;
}

type TimeOfDay = "morning" | "evening" | "weekly";

interface RoutineStep {
  id: string;
  time_of_day: TimeOfDay;
  position: number;
  domain: ProductDomain;
  product_id: string | null;
  step_name: string | null;
  instruction: string | null;
}

function filterByDomain(products: UserProduct[], domain: ProductDomain) {
  return products.filter((p) => {
    const d = p.domain ?? domainForCategory(p.category);
    return d === domain;
  });
}

export function DomainView({
  domain,
  title,
  tagline,
  accentVar,
  timeLabels,
}: {
  domain: ProductDomain;
  title: string;
  tagline: string;
  accentVar: string;
  timeLabels?: { morning: TimeLabelConfig; evening: TimeLabelConfig };
}) {
  const router = useRouter();
  const supabase = createClient();
  const { products, setProducts } = useStore();

  const [userId, setUserId] = useState<string | null>(null);
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const admin = await isAdminSession();
      const uid = user?.id ?? (admin ? ADMIN_USER_ID : null);
      if (!uid) {
        router.push("/auth");
        return;
      }
      if (cancelled) return;
      setUserId(uid);

      const prodRes = await supabase
        .from("user_products")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (!prodRes.error && !cancelled) {
        setProducts((prodRes.data ?? []) as UserProduct[]);
      }

      const stepsRes = await supabase
        .from("user_routine_steps")
        .select("*")
        .eq("user_id", uid)
        .order("position", { ascending: true });
      if (!stepsRes.error && !cancelled) {
        setSteps((stepsRes.data ?? []) as RoutineStep[]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const domainProducts = useMemo(
    () => filterByDomain(products, domain),
    [products, domain]
  );

  const domainSteps = useMemo(
    () => steps.filter((s) => (s.domain ?? "skincare") === domain),
    [steps, domain]
  );

  const morning = domainSteps.filter((s) => s.time_of_day === "morning");
  const evening = domainSteps.filter((s) => s.time_of_day === "evening");
  const weekly  = domainSteps.filter((s) => s.time_of_day === "weekly");

  const productById = useMemo(() => {
    const m = new Map<string, UserProduct>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  return (
    <div className="relative min-h-screen px-4 sm:px-6 py-8 pb-28 max-w-3xl mx-auto">
      <FadeIn>
        <p
          className="text-xs uppercase tracking-widest"
          style={{ color: `var(${accentVar})` }}
        >
          {domain}
        </p>
        <h1 className="text-h1 font-light font-[family-name:var(--font-heading)]">
          {title}
        </h1>
        <p className="text-sm text-muted mt-1 max-w-md">{tagline}</p>
      </FadeIn>

      <FadeIn delay={0.08}>
        <Card className="mt-6 p-5">
          <div className="flex items-center gap-2 text-sm font-medium mb-1">
            <Sparkles size={14} className="text-accent-deep" />
            Not sure about a product?
          </div>
          <p className="text-xs text-muted mb-3">
            Ask Suki what it is, whether it fits, and where to find it for less.
          </p>
          <Link href="/compare">
            <GhostButton size="sm" variant="outline" as="span">
              <Search size={14} />
              <span className="ml-1">Compare a product</span>
            </GhostButton>
          </Link>
        </Card>
      </FadeIn>

      <FadeIn delay={0.12}>
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            {timeLabels?.morning?.icon ?? <Sun size={15} className="text-[var(--gold)]" />}
            <h2 className="text-h3 font-light font-[family-name:var(--font-heading)]">
              {timeLabels?.morning?.label ?? "Morning"}
            </h2>
          </div>
          <RoutineList steps={morning} productById={productById} loading={loading} />
        </section>
      </FadeIn>

      <FadeIn delay={0.16}>
        <section className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            {timeLabels?.evening?.icon ?? <Moon size={15} className="text-[var(--lavender)]" />}
            <h2 className="text-h3 font-light font-[family-name:var(--font-heading)]">
              {timeLabels?.evening?.label ?? "Night"}
            </h2>
          </div>
          <RoutineList steps={evening} productById={productById} loading={loading} />
        </section>
      </FadeIn>

      {weekly.length > 0 && (
        <FadeIn delay={0.18}>
          <section className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} className="text-accent-deep" />
              <h2 className="text-h3 font-light font-[family-name:var(--font-heading)]">
                Weekly
              </h2>
            </div>
            <RoutineList steps={weekly} productById={productById} loading={loading} />
          </section>
        </FadeIn>
      )}

      <FadeIn delay={0.22}>
        <section className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm uppercase tracking-widest text-muted">
              My {domain === "skincare" ? "skincare" : domain === "haircare" ? "hair" : "makeup"} collection
            </h3>
            <Link
              href="/products"
              className="text-xs text-accent-deep hover:text-accent flex items-center gap-1"
            >
              Add <Plus size={12} />
            </Link>
          </div>
          {loading ? (
            <Card className="p-4">
              <div className="h-12 animate-pulse bg-background-deep/30 rounded" />
            </Card>
          ) : domainProducts.length === 0 ? (
            <Card className="p-5">
              <p className="text-sm text-muted mb-3">
                No {domain} products logged yet.
              </p>
              <Link href="/products">
                <GhostButton size="sm" variant="outline" as="span">
                  <Plus size={14} />
                  <span className="ml-1">Log your first product</span>
                </GhostButton>
              </Link>
            </Card>
          ) : (
            <Card className="p-2">
              <ul className="divide-y divide-[var(--card-border)]">
                {domainProducts.map((p) => (
                  <li
                    key={p.id}
                    className="px-3 py-3 flex items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {p.product_name}
                      </div>
                      <div className="text-xs text-muted truncate">
                        {p.brand} · {p.category.replace(/_/g, " ")}
                        {p.shade_name ? ` · ${p.shade_name}` : ""}
                      </div>
                    </div>
                    {p.shade_hex && (
                      <span
                        className="w-4 h-4 rounded-full border border-[var(--card-border)]"
                        style={{ background: p.shade_hex }}
                        aria-label={`Shade ${p.shade_name ?? p.shade_hex}`}
                      />
                    )}
                    {p.rating === "love" && (
                      <Heart size={14} className="text-[var(--rose)]" />
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </FadeIn>

      <FadeIn delay={0.26}>
        <section className="mt-10">
          <Card className="p-5 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">
                Want personalized picks?
              </div>
              <p className="text-xs text-muted mt-1">
                Suki uses your profile + preference mode to recommend products
                built for you.
              </p>
            </div>
            <Link href="/recommendations">
              <GhostButton size="sm" variant="filled" as="span">
                <span>Recommendations</span>
                <ArrowRight size={14} />
              </GhostButton>
            </Link>
          </Card>
        </section>
      </FadeIn>
    </div>
  );
}

function RoutineList({
  steps,
  productById,
  loading,
}: {
  steps: RoutineStep[];
  productById: Map<string, UserProduct>;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card className="p-4">
        <div className="h-10 animate-pulse bg-background-deep/30 rounded" />
      </Card>
    );
  }
  if (steps.length === 0) {
    return (
      <Card className="p-5 flex items-center justify-between">
        <p className="text-sm text-muted">No steps yet.</p>
        <Link href="/routine">
          <GhostButton size="sm" variant="outline" as="span">
            <Plus size={14} />
            <span className="ml-1">Add</span>
          </GhostButton>
        </Link>
      </Card>
    );
  }
  return (
    <Card className="p-2">
      <ul className="divide-y divide-[var(--card-border)]">
        {steps.map((s) => {
          const product = s.product_id ? productById.get(s.product_id) : undefined;
          const title = s.step_name || product?.product_name || s.domain;
          const sub = product?.brand || s.instruction || "";
          return (
            <li
              key={s.id}
              className="px-3 py-3 flex items-center gap-3"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent-deep shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{title}</div>
                {sub && (
                  <div className="text-xs text-muted truncate">{sub}</div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
