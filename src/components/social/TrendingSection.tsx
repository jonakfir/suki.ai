"use client";

import { useEffect, useState } from "react";

interface TrendingItem {
  product_name: string;
  brand: string;
  domain: string;
  count: number;
}

function Row({ scope, title }: { scope: "friends" | "global"; title: string }) {
  const [items, setItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/social/trending?scope=${scope}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setItems(json.trending ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [scope]);

  if (!loading && !items.length) return null;

  return (
    <section className="mb-6">
      <h3 className="text-sm uppercase tracking-wider text-muted mb-3">{title}</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-40 h-24 rounded-2xl bg-card animate-pulse"
              />
            ))
          : items.map((item, i) => (
              <div
                key={`${item.product_name}|${item.brand}|${i}`}
                className="shrink-0 w-44 p-3 rounded-2xl border border-[var(--card-border)] bg-card snap-start"
              >
                <div className="text-sm font-medium truncate">{item.product_name}</div>
                <div className="text-xs text-muted truncate">{item.brand}</div>
                <div className="text-xs mt-2">❤️ {item.count}</div>
              </div>
            ))}
      </div>
    </section>
  );
}

export function TrendingSection() {
  return (
    <>
      <Row scope="friends" title="Trending among friends" />
      <Row scope="global" title="Hot globally" />
    </>
  );
}
