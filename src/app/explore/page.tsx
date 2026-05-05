"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RoutineBanner } from "@/components/social/RoutineBanner";
import { FeedCard, type FeedEvent } from "@/components/social/FeedCard";
import { TrendingSection } from "@/components/social/TrendingSection";

export default function ExplorePage() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(
    async (cur: string | null) => {
      if (loading) return;
      setLoading(true);
      try {
        const url = new URL("/api/social/feed", window.location.origin);
        if (cur) url.searchParams.set("cursor", cur);
        const res = await fetch(url.toString());
        if (!res.ok) {
          setHasMore(false);
          return;
        }
        const json = await res.json();
        const newEvents: FeedEvent[] = json.events ?? [];
        setEvents((prev) => (cur ? [...prev, ...newEvents] : newEvents));
        setCursor(json.nextCursor ?? null);
        setHasMore(!!json.nextCursor);
      } finally {
        setLoading(false);
        setInitial(false);
      }
    },
    [loading]
  );

  useEffect(() => {
    loadPage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !loading && hasMore) {
          loadPage(cursor);
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [cursor, hasMore, loading, loadPage]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <h1 className="text-2xl font-semibold mb-4">Explore</h1>

      <RoutineBanner />

      <TrendingSection />

      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted mb-3">Activity</h2>
        {!initial && !events.length ? (
          <div className="text-sm text-muted py-8 text-center">
            Nothing here yet — follow a few people to see their activity.
          </div>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id}>
                <FeedCard event={e} />
              </li>
            ))}
          </ul>
        )}
        <div ref={sentinelRef} className="h-8" />
        {loading && (
          <div className="text-xs text-muted text-center py-2">Loading…</div>
        )}
      </section>
    </main>
  );
}
