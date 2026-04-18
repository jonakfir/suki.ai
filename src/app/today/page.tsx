"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAdminSession, clearAdminSession, ADMIN_USER_ID, ADMIN_NAME } from "@/lib/admin";
import { useStore, UserProduct } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { FadeIn } from "@/components/ui/FadeIn";
import { GhostButton } from "@/components/ui/GhostButton";
import {
  Search,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  Circle,
  Droplet,
  Scissors,
  Palette,
  ArrowRight,
} from "lucide-react";

type TimeOfDay = "morning" | "evening" | "weekly";
type RoutineDomain = "skincare" | "haircare" | "makeup";

interface RoutineStep {
  id: string;
  time_of_day: TimeOfDay;
  position: number;
  domain: RoutineDomain;
  product_id: string | null;
  step_name: string | null;
  instruction: string | null;
  notes: string | null;
}

function formatToday(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function TodayPage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile, setProfile, products, setProducts, resetUserData } = useStore();

  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Load user + data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user: supaUser } } = await supabase.auth.getUser();
      const admin = await isAdminSession();
      let uid: string | null = null;

      if (supaUser) {
        await clearAdminSession();
        uid = supaUser.id;
        const fullName = supaUser.user_metadata?.full_name as string | undefined;
        const first = fullName?.trim().split(/\s+/)[0];
        setUserName(first || supaUser.email?.split("@")[0] || "there");
      } else if (admin) {
        uid = ADMIN_USER_ID;
        setUserName(ADMIN_NAME);
      } else {
        router.push("/auth");
        return;
      }

      if (cancelled) return;
      setUserId(uid);
      resetUserData();

      // Profile
      const profRes = await supabase
        .from("users_profile")
        .select("*")
        .eq("user_id", uid)
        .single();
      if (profRes.data && !cancelled) {
        const p = profRes.data;
        setProfile({
          skin_type: p.skin_type,
          skin_concerns: p.skin_concerns || [],
          skin_tone: p.skin_tone,
          age_range: p.age_range,
          known_allergies: p.known_allergies || [],
          budget: p.budget,
          routine_complexity: p.routine_complexity,
          hair_type: p.hair_type ?? null,
          hair_texture: p.hair_texture ?? null,
          hair_porosity: p.hair_porosity ?? null,
          hair_concerns: p.hair_concerns ?? [],
          hair_goals: p.hair_goals ?? [],
          is_color_treated: p.is_color_treated ?? false,
          makeup_style: p.makeup_style ?? null,
          coverage_preference: p.coverage_preference ?? null,
          finish_preference: p.finish_preference ?? null,
          undertone: p.undertone ?? null,
          preference_mode: p.preference_mode ?? "most_recommended",
        });
      }

      // Products
      const prodRes = await supabase
        .from("user_products")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (!prodRes.error && !cancelled) {
        setProducts((prodRes.data ?? []) as UserProduct[]);
      }

      // Routine steps
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

  // Reset "done" flags at local midnight — key kept in localStorage per-day
  useEffect(() => {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `suki:done:${userId}:${today}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        setDone(JSON.parse(raw) as Record<string, boolean>);
      } catch {}
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `suki:done:${userId}:${today}`;
    localStorage.setItem(key, JSON.stringify(done));
  }, [done, userId]);

  const productById = useMemo(() => {
    const m = new Map<string, UserProduct>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const morning = steps
    .filter((s) => s.time_of_day === "morning")
    .sort((a, b) => a.position - b.position);
  const evening = steps
    .filter((s) => s.time_of_day === "evening")
    .sort((a, b) => a.position - b.position);

  const toggleDone = (id: string) =>
    setDone((d) => ({ ...d, [id]: !d[id] }));

  const dateLabel = formatToday(new Date());

  const heroTitle = userName ? `Good day, ${userName}` : "Today";

  return (
    <div className="relative min-h-screen px-4 sm:px-6 py-8 pb-28 max-w-3xl mx-auto">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted uppercase tracking-widest font-[family-name:var(--font-body)]">
            {dateLabel}
          </p>
          <Link
            href="/compare"
            aria-label="Search or compare a product"
            className="flex items-center gap-1.5 text-xs text-muted hover:text-accent-deep transition-colors rounded-full px-3 py-1.5 border border-[var(--card-border)] bg-card/50 hover:bg-card"
          >
            <Search size={14} />
            <span>Compare</span>
          </Link>
        </div>
        <h1 className="text-h1 font-light font-[family-name:var(--font-heading)]">
          {heroTitle}
        </h1>
        <p className="text-sm text-muted mt-1 max-w-md">
          Your routines for today. Tap to check them off.
        </p>
      </FadeIn>

      {/* Morning */}
      <FadeIn delay={0.1}>
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Sun size={16} className="text-[var(--gold)]" />
            <h2 className="text-h3 font-light font-[family-name:var(--font-heading)]">
              Morning
            </h2>
          </div>
          <RoutineList
            steps={morning}
            productById={productById}
            done={done}
            toggle={toggleDone}
            emptyHref="/skin"
            emptyLabel="Build your morning routine"
            loading={loading}
          />
        </section>
      </FadeIn>

      {/* Night */}
      <FadeIn delay={0.15}>
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Moon size={16} className="text-[var(--lavender)]" />
            <h2 className="text-h3 font-light font-[family-name:var(--font-heading)]">
              Night
            </h2>
          </div>
          <RoutineList
            steps={evening}
            productById={productById}
            done={done}
            toggle={toggleDone}
            emptyHref="/skin"
            emptyLabel="Build your night routine"
            loading={loading}
          />
        </section>
      </FadeIn>

      {/* Quick links to the three domains */}
      <FadeIn delay={0.2}>
        <section className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm uppercase tracking-widest text-muted">Explore</h3>
            <Pill active>
              {profile.preference_mode === "budget" && "Budget"}
              {profile.preference_mode === "simple" && "Simple"}
              {profile.preference_mode === "high_end" && "High-End"}
              {(!profile.preference_mode ||
                profile.preference_mode === "most_recommended") &&
                "Most Recommended"}
            </Pill>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <DomainTile href="/skin"   icon={Droplet}  label="Skin"   accent="var(--accent)" />
            <DomainTile href="/hair"   icon={Scissors} label="Hair"   accent="var(--rose)" />
            <DomainTile href="/makeup" icon={Palette}  label="Makeup" accent="var(--gold)" />
          </div>
        </section>
      </FadeIn>

      {/* CTA to compare */}
      <FadeIn delay={0.25}>
        <Card className="mt-8 p-5 flex items-start gap-3">
          <Sparkles size={18} className="text-accent-deep mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium">
              Curious about a product?
            </div>
            <p className="text-xs text-muted mt-1">
              Snap a photo or type its name — Suki will explain what it is, how it
              fits your profile, and find similar options for less.
            </p>
            <Link
              href="/compare"
              className="inline-flex items-center gap-1 mt-3 text-sm text-accent-deep hover:text-accent font-medium"
            >
              Compare a product <ArrowRight size={14} />
            </Link>
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}

interface RoutineListProps {
  steps: RoutineStep[];
  productById: Map<string, UserProduct>;
  done: Record<string, boolean>;
  toggle: (id: string) => void;
  emptyHref: string;
  emptyLabel: string;
  loading: boolean;
}

function RoutineList({
  steps,
  productById,
  done,
  toggle,
  emptyHref,
  emptyLabel,
  loading,
}: RoutineListProps) {
  if (loading) {
    return (
      <Card className="p-4">
        <div className="h-12 animate-pulse bg-background-deep/30 rounded-lg" />
      </Card>
    );
  }
  if (steps.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted mb-3">No steps yet.</p>
        <Link href={emptyHref}>
          <GhostButton size="sm" variant="outline" as="span">
            {emptyLabel}
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
          const isDone = !!done[s.id];
          const title = s.step_name || product?.product_name || s.domain;
          const sub = product?.brand || s.instruction || "";
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => toggle(s.id)}
                className="w-full text-left flex items-center gap-3 px-3 py-3 hover:bg-card/50 rounded-lg transition-colors"
              >
                {isDone ? (
                  <CheckCircle2 size={20} className="text-accent-deep shrink-0" />
                ) : (
                  <Circle size={20} className="text-muted shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-medium ${
                      isDone ? "line-through text-muted" : ""
                    }`}
                  >
                    {title}
                  </div>
                  {sub && (
                    <div className="text-xs text-muted truncate">{sub}</div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function DomainTile({
  href,
  icon: Icon,
  label,
  accent,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-card border border-[var(--card-border)] hover:shadow-md transition-all duration-200"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: `${accent}15` }}
      >
        <Icon size={18} className="text-foreground" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
