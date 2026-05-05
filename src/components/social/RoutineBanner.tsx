"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Sun, Moon, CheckCircle2, Circle } from "lucide-react";

type TimeOfDay = "morning" | "evening" | "weekly";

interface RoutineStep {
  id: string;
  time_of_day: TimeOfDay;
  position: number;
  domain: "skincare" | "haircare" | "makeup";
  product_id: string | null;
  step_name: string | null;
  instruction: string | null;
}

interface ProductLite {
  id: string;
  product_name: string;
  brand: string;
}

export function RoutineBanner() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [products, setProducts] = useState<Map<string, ProductLite>>(new Map());
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) setUserId(user.id);

      const [stepsRes, prodRes] = await Promise.all([
        supabase
          .from("user_routine_steps")
          .select("*")
          .eq("user_id", user.id)
          .order("position", { ascending: true }),
        supabase
          .from("user_products")
          .select("id, product_name, brand")
          .eq("user_id", user.id),
      ]);
      if (cancelled) return;
      setSteps((stepsRes.data ?? []) as RoutineStep[]);
      const m = new Map<string, ProductLite>();
      for (const p of (prodRes.data ?? []) as ProductLite[]) m.set(p.id, p);
      setProducts(m);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `suki:done:${userId}:${today}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const t = setTimeout(() => {
      try {
        setDone(JSON.parse(raw) as Record<string, boolean>);
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `suki:done:${userId}:${today}`;
    localStorage.setItem(key, JSON.stringify(done));
  }, [done, userId]);

  const morning = steps.filter((s) => s.time_of_day === "morning");
  const evening = steps.filter((s) => s.time_of_day === "evening");

  if (loading) {
    return (
      <Card className="p-4 mb-6">
        <div className="h-10 animate-pulse bg-background-deep/30 rounded-lg" />
      </Card>
    );
  }
  if (!steps.length) {
    return (
      <Card className="p-4 mb-6">
        <p className="text-sm text-muted">
          No routine yet.{" "}
          <Link href="/me" className="text-accent-deep hover:underline">
            Build one
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3 mb-6">
      <RoutineList
        title="Morning"
        icon={<Sun size={14} className="text-[var(--gold)]" />}
        steps={morning}
        products={products}
        done={done}
        toggle={(id) => setDone((d) => ({ ...d, [id]: !d[id] }))}
      />
      <RoutineList
        title="Night"
        icon={<Moon size={14} className="text-[var(--lavender)]" />}
        steps={evening}
        products={products}
        done={done}
        toggle={(id) => setDone((d) => ({ ...d, [id]: !d[id] }))}
      />
    </div>
  );
}

function RoutineList({
  title,
  icon,
  steps,
  products,
  done,
  toggle,
}: {
  title: string;
  icon: React.ReactNode;
  steps: RoutineStep[];
  products: Map<string, ProductLite>;
  done: Record<string, boolean>;
  toggle: (id: string) => void;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <span className="text-xs uppercase tracking-wider text-muted">{title}</span>
      </div>
      {!steps.length ? (
        <p className="text-xs text-muted px-1 py-2">No steps</p>
      ) : (
        <ul className="divide-y divide-[var(--card-border)]">
          {steps.map((s) => {
            const product = s.product_id ? products.get(s.product_id) : undefined;
            const isDone = !!done[s.id];
            const titleText = s.step_name || product?.product_name || s.domain;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="w-full text-left flex items-center gap-2 px-1 py-2 hover:bg-card/50 transition-colors"
                >
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-accent-deep shrink-0" />
                  ) : (
                    <Circle size={16} className="text-muted shrink-0" />
                  )}
                  <span
                    className={`text-sm flex-1 truncate ${
                      isDone ? "line-through text-muted" : ""
                    }`}
                  >
                    {titleText}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
